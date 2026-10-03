// These mirror the EmailOut / Folder schemas in backend/schemas.py.

export type Folder = "inbox" | "drafts" | "sent";

export type Recipient = {
  name: string;
  email: string;
};

export type Email = {
  id: string;
  thread_id: string;
  sender_name: string;
  sender_email: string;
  recipients: Recipient[];
  cc: string[];
  subject: string;
  body: string;
  timestamp: string; // ISO string, e.g. "2026-09-18T10:30:00"
  folder: Folder;
  is_read: boolean;
  summary: string | null;
  classification: Classification | null;
  actions: ActionItem[] | null;
};

// Mirrors SummaryOut in backend/schemas.py.
export type SummaryResponse = {
  email_id: string;
  summary: string;
  cached: boolean;
};

// Mirror the Category / Priority enums in backend/schemas.py.
export type Category =
  | "Action Required"
  | "Approval Needed"
  | "Meeting"
  | "FYI"
  | "Newsletter";

export type Priority = "High" | "Medium" | "Low";

// Mirrors ClassificationResult — the JSON stored in the classification column.
export type Classification = {
  category: Category;
  priority: Priority;
};

// Mirrors ClassificationOut.
export type ClassificationResponse = {
  email_id: string;
  classification: Classification;
  cached: boolean;
};

// Mirrors ActionItem in backend/schemas.py. deadline_text is what the email
// literally said ("by Friday"); deadline_date is the backend's resolution of
// it, and is null when the phrase could not be read.
export type ActionItem = {
  action: string;
  deadline_text: string | null;
  deadline_date: string | null; // ISO date, e.g. "2026-09-25"
};

// Mirrors ActionsOut.
export type ActionsResponse = {
  email_id: string;
  actions: ActionItem[];
  cached: boolean;
};
