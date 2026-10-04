import { PRIORITY_STYLES } from "@/lib/classification";
import type { Email } from "@/types/email";

type EmailListProps = {
  emails: Email[];
  onSelect: (emailId: string) => void;
  emptyMessage?: string;
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Inbox shows who sent the mail; drafts and sent items show who it is going to.
// Read from the email itself, not from a prop: search results mix folders.
function getPersonLabel(email: Email): string {
  if (email.folder === "inbox") return email.sender_name;
  const names = email.recipients.map((r) => r.name || r.email);
  return `To: ${names.join(", ")}`;
}

export default function EmailList({
  emails,
  onSelect,
  emptyMessage = "No emails in this folder.",
}: EmailListProps) {
  if (emails.length === 0) {
    return <p className="p-6 text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {emails.map((email) => {
        const isUnread = !email.is_read;
        return (
          <li
            key={email.id}
            onClick={() => onSelect(email.id)}
            className="flex cursor-pointer items-baseline gap-4 px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <span
              className={`w-48 shrink-0 truncate text-sm ${
                isUnread ? "font-semibold" : ""
              }`}
            >
              {getPersonLabel(email)}
            </span>

            <span className="min-w-0 flex-1 truncate text-sm">
              {email.folder === "drafts" && (
                <span className="mr-2 font-semibold text-red-600">[Draft]</span>
              )}
              <span className={isUnread ? "font-semibold" : ""}>
                {email.subject}
              </span>
              <span className="text-zinc-500">
                {" "}
                – {email.body.replace(/\s+/g, " ")}
              </span>
            </span>

            {email.classification && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  PRIORITY_STYLES[email.classification.priority]
                }`}
                title={email.classification.category}
              >
                {email.classification.priority}
              </span>
            )}

            <span className="shrink-0 text-xs text-zinc-500">
              {formatTimestamp(email.timestamp)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
