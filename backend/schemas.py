from datetime import datetime
from pydantic import BaseModel, ConfigDict
from enum import Enum

class Recipient(BaseModel):
    name: str
    email: str


class Folder(str, Enum):
    inbox = "inbox"
    drafts = "drafts"    
    sent = "sent"


class EmailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    thread_id: str
    sender_name: str
    sender_email: str
    recipients: list[Recipient]
    cc: list[str]
    subject: str
    body: str
    timestamp: datetime
    folder: Folder
    is_read: bool
    summary : str | None = None

class SummaryOut(BaseModel):
    summary: str
    email_id: str
    cached: bool