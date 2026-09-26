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
};

// Mirrors SummaryOut in backend/schemas.py.
export type SummaryResponse = {
  email_id: string;
  summary: string;
  cached: boolean;
};
