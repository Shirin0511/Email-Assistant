import hashlib

from sqlalchemy.orm import Session

from config import settings
from models import Email
from schemas import ClassificationResult
from services.llm import client


SYSTEM_PROMPT = (
    "You classify work emails. Reply with JSON only and nothing else, "
    'in exactly this form: {"category": "...", "priority": "..."}.\n\n'
    "category must be exactly one of:\n"
    "- Action Required: the recipient must do or send something\n"
    "- Approval Needed: the recipient must approve, review or sign off\n"
    "- Meeting: about scheduling, confirming or attending a meeting\n"
    "- FYI: informational, no action needed from the recipient\n"
    "- Newsletter: bulk or subscription content\n\n"
    "priority must be exactly one of:\n"
    "- High: the email names a specific deadline, date or time, "
    "or says the recipient is blocking someone else\n"
    "- Medium: the recipient must act, but no specific deadline is given\n"
    "- Low: no action is needed from the recipient\n\n"

    "Apply these rules literally. Do not infer urgency from tone or politeness."
)



def _content_hash(email: Email)-> str:
    payload = f"{email.subject}\n{email.body}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()




def _parse(raw: str) -> ClassificationResult:
    """Turn the model's text into a validated result, or raise."""
    text = raw.strip()

    # Models often wrap JSON in ```json ... ``` fences despite being told not to.
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]

    return ClassificationResult.model_validate_json(text.strip())



def classify_email(db: Session, email:Email, force:bool) -> tuple[ClassificationResult, bool] :

    """Classify an email, reusing the stored result while its content is unchanged.

    Returns (result, cached).
    """
    current_hash = _content_hash(email)

    if (email.classification
        and email.classification_hash == current_hash
        and not force):

        return ClassificationResult.model_validate(email.classification), True


    user_prompt = f"Subject: {email.subject}\n\nBody:\n{email.body}"

    response = client.chat.completions.create(
        model= settings.llm_model,
        messages= [
            {"role":"system", "content": SYSTEM_PROMPT},
            {"role":"user", "content":user_prompt}
        ],
        max_tokens=500,
        temperature = 0,
    )

    choice = response.choices[0]

    if choice.finish_reason == "length":
        raise ValueError(
            "Model Output was cut off before it finished - raise max_tokens"
        )

    raw = (response.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("The model returned an empty classification.")

    result = _parse(raw)

    # Assign the whole dict — SQLAlchemy does not notice in-place edits to JSON.
    email.classification = result.model_dump(mode="json")
    email.classification_hash = current_hash
    db.commit()

    return result, False