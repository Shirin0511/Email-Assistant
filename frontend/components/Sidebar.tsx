import type { Folder } from "@/types/email";

const FOLDERS: { id: Folder; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "drafts", label: "Drafts" },
  { id: "sent", label: "Sent items" },
];

type SidebarProps = {
  selected: Folder;
  onSelect: (folder: Folder) => void;
};

export default function Sidebar({ selected, onSelect }: SidebarProps) {
  return (
    <nav className="w-56 shrink-0 border-r border-zinc-200 p-3 dark:border-zinc-800">
      <h1 className="px-3 py-2 text-lg font-semibold">Email Assistant</h1>
      <ul className="mt-2 space-y-1">
        {FOLDERS.map((folder) => {
          const isSelected = folder.id === selected;
          return (
            <li key={folder.id}>
              <button
                onClick={() => onSelect(folder.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-blue-100 font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                {folder.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
