from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAIError
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Email
from schemas import EmailOut, Folder, SummaryOut, EmailUpdate, ClassificationOut
from services.summarizer import summarize_emails
from services.classifier import classify_email

from schemas import ActionsOut, ClassificationOut, EmailOut, EmailUpdate, Folder, SummaryOut
from services.actions import extract_actions



router = APIRouter(prefix="/emails", tags=["emails"])

@router.get("", response_model= list[EmailOut])
def list_emails(folder: Folder, db: Session = Depends(get_db)):
    stmt = (
        select(Email)
        .where(Email.folder == folder.value)
        .order_by(Email.timestamp.desc())

    )

    return db.scalars(stmt).all()


@router.post("/{email_id}/summary", response_model=SummaryOut)
def create_summary(email_id: str, force: bool = False, db: Session = Depends(get_db)):

    email= db.get(Email, email_id)

    if not email:
       raise HTTPException(status_code = 404, detail="Email Not Found")

    try:
       summary, cached = summarize_emails(db, email, force)
    except OpenAIError as exc:
       raise HTTPException(status_code= 502, detail= f"LLM Request failed: {exc}") from exc

    return SummaryOut(summary=summary, email_id=email_id, cached=cached)


@router.patch("/{email_id}", response_model= EmailOut)
def update_email(email_id:str, payload:EmailUpdate, db:Session = Depends(get_db)):
   
    email = db.get(Email, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(email, field, value)

    db.commit()
    db.refresh(email)

    return email    


@router.post("/{email_id}/classify", response_model=ClassificationOut)
def create_classification(
    email_id: str,
    force: bool = False,
    db: Session = Depends(get_db),
):
    email = db.get(Email, email_id)

    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    try:
        result, cached = classify_email(db, email, force)
    except OpenAIError as exc:
        raise HTTPException(
            status_code=502, detail=f"LLM request failed: {exc}"
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=502, detail=f"Could not parse model output: {exc}"
        ) from exc

    return ClassificationOut(
        email_id=email_id,
        classification=result,
        cached=cached,
    )

          

@router.post("/{email_id}/actions", response_model = ActionsOut)
def create_actions(email_id: str, force: bool = False, db: Session = Depends(get_db)):

    email = get_db(Email, email_id)

    if not email:
        raise HTTPException(status_code = 404, detail = "Email not found")

    try:
        actions, cached = extract_actions(db, email, force)
    except OpenAIError as exc:
        raise HTTPException(
            status_code=502, detail=f"LLM request failed: {exc}"
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=502, detail=f"Could not parse model output: {exc}"
        ) from exc

    return ActionsOut(email_id=email_id, actions=actions, cached=cached)    