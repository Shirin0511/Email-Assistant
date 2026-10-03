from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Email(Base):
    __tablename__ = "emails"

    id: Mapped[str] = mapped_column(String, primary_key = True)
    thread_id: Mapped[str] = mapped_column(String, index=True)
    sender_name : Mapped[str] = mapped_column(String)
    sender_email : Mapped[str] =  mapped_column(String)
    recipients: Mapped[list[str]] = mapped_column(JSON, default =list)
    subject: Mapped[str] = mapped_column(String)
    cc: Mapped[list[str]] = mapped_column(JSON, default=list)
    body: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    folder: Mapped[str] = mapped_column(String, index=True)
    is_read : Mapped[bool] = mapped_column(Boolean, default=False)
    summary : Mapped[str | None] = mapped_column(Text, nullable=True, default= None)
    classification: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)
    classification_hash: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    actions : Mapped[dict | None] = mapped_column(JSON,nullable=True, default=None)
    actions_hash : Mapped[str | None] = mapped_column(String, nullable=True, default=None)