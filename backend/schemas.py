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

class Category(str, Enum):

    action_required = "Action Required"
    approval_needed = "Approval Needed"
    meeting = "Meeting"
    fyi = "FYI"
    newsletter = "Newsletter"


class Priority(str, Enum):
    low= "Low"
    medium = "Medium"
    high = "High"    

class SummaryOut(BaseModel):
    summary: str
    email_id: str
    cached: bool


class EmailUpdate(BaseModel):
    is_read : bool | None = None    


class ClassificationResult(BaseModel):
    category : Category
    priority: Priority    


class ClassificationOut(BaseModel):
    email_id: str
    classification : ClassificationResult
    cached : bool    


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
    classification : ClassificationResult | None = None

