import hashlib

from sqlalchemy.orm import Session

from config import settings
from models import Email
from schemas import ActionItem, ExtractedActions
from services.deadlines import resolve_deadline
from services.llm import client


SYSTEM_PROMPT = (
    "You extract action items from work emails. "
    "Reply with JSON only and nothing else, in exactly this form:\n"
    '{"actions": [{"action": "...", "deadline_text": "..."}]}\n\n'
    "Rules:\n"
    "- Only list actions the RECIPIENT must perform. Ignore things the "
    "sender is doing.\n"
    "- Write each action as a short imperative phrase, e.g. "
    '"Send the revised proposal to John".\n'
    "- deadline_text must be copied verbatim from the email, e.g. "
    '"by Friday", "tomorrow", "EOD". Do not convert it to a date.\n'
    "- Use null for deadline_text when no deadline is mentioned.\n"
    "- If the email requires nothing from the recipient, return "
    '{"actions": []}.'
)


def _content_hash(email: Email) -> str:
    payload = f"{email.subject}\n{email.body}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()



def _parse(raw: str) -> ExtractedActions:
    text = raw.strip()

    # Models often wrap JSON in ```json ... ``` fences despite being told not to
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]

    return ExtractedActions.model_validate_json(text.strip())


def extract_actions(db:Session, email:Email, force: bool = False) -> tuple[list[ActionItem], bool]:

    """Extract action items, reusing stored ones while the email is unchanged.

    Returns (actions, cached).
    """

    current_hash = _content_hash(email)

    if (email.actions is not None and 
        email.actions_hash == current_hash and 
        not force ):

        stored = [ActionItem.model_validate(a) for a in email.actions]
        return stored, True

    user_prompt = f"Subject :{email.subject} \n\n Body: {email.body}"

    response = client.chat.completions.create(
        model= settings.llm_model,
        messages= [
            {"role":"system", "content":SYSTEM_PROMPT},
            {"role":"user", "content":user_prompt}
        ],
        max_tokens= 500,
        temperature = 0,
    )

    choice = response.choices[0]

    if choice.finish_reason == "length":
        raise ValueError(
            "Model output was cut off before it finished - raise max_tokens"
        )

    raw = (choice.message.content or "").strip()
    if not raw:
        raise ValueError("The model returned no action")

    extracted = _parse(raw)

    #code to get the exact deadline date
    sent_on = email.timestamp.date() # date on which email is being sent


    actions = [
        ActionItem(
            action= item.action,
            deadline_date = resolve_deadline(item.deadline_text, sent_on),
        )
        for item in extracted.actions
    ]


    #Saving in DB
    email.actions = [a.model_dump(mode = "json") for a in actions]
    email.actions_hash = current_hash
    db.commit()

    return actions, False
