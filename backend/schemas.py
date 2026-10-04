from datetime import datetime, date
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


#this is what the LLM extracts from the email text
class ExtractedAction(BaseModel):
    action: str
    deadline_text : str | None = None


#since an email can have more than one actionable items mentioned
class ExtractedActions(BaseModel):
    actions: list[ExtractedAction]


#what we are storing and returing
class ActionItem(BaseModel):
    action: str
    deadline_date : date | None = None


class ActionsOut(BaseModel):
    email_id : str
    actions : list[ActionItem]
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
    action: list[ActionItem] | None = None



