import type { Folder } from "@/types/email";

// The order folders appear in the sidebar.
export const FOLDER_ORDER: Folder[] = ["inbox", "drafts", "sent"];

// Display names. The backend uses "sent"; the UI says "Sent items".
export const FOLDER_LABELS: Record<Folder, string> = {
  inbox: "Inbox",
  drafts: "Drafts",
  sent: "Sent items",
};
