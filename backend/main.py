from fastapi import FastAPI, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Email
from schemas import EmailOut, Folder

app= FastAPI()

@app.get("/emails", response_model = list[EmailOut])
def list_emails(folder: Folder, db: Session = Depends(get_db)):
    stmt= (
        select(Email)
        .where(Email.folder == folder.value)
        .order_by(Email.timestamp.desc())
    )

    return db.scalars(stmt).all()
