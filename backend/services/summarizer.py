from sqlalchemy.orm import Session

from config import settings
from models import Email
from services.llm import client


SYSTEM_PROMPT = (
    "You summarize emails. Reply with 1-2 short sentences capturing the main "
    "point and any action the recipient needs to take. "
    "No greeting, no sign-off, no preamble."
)


def summarize_emails(db: Session, email: Email, force: bool = False) -> tuple[str, bool]:
    """Summarize an email, reusing the stored summary unless force is True.

    Returns (summary, cached).
    """

    if email.summary and not force:
        return email.summary, True

    user_prompt = f"Subject: {email.subject}\n \n Body: {email.body}"

    response = client.chat.completions.create(
        model= settings.llm_model,
        messages=[
            {
                "role": "system", "content":SYSTEM_PROMPT
            },
            {
                "role": "user", "content":user_prompt
            }
        ],
        max_tokens= 150,
    )

    summary = (response.choices[0].message.content or "").strip()

    if not summary:
        raise ValueError("The model returned an empty summary")

    email.summary = summary
    db.commit()

    return summary, False