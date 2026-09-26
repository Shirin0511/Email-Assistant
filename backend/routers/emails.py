from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAIError
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Email
from schemas import EmailOut, Folder, SummaryOut
from services.summarizer import summarize_emails


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
          
