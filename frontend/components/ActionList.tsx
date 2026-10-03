import type { ActionItem } from "@/types/email";

type ActionListProps = {
  actions: ActionItem[];
};

// The backend sends a plain date ("2026-09-25"). Parsing that with new Date()
// treats it as UTC midnight, which can render as the previous day in western
// timezones — so build the date from its parts instead.
function formatDeadline(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ActionList({ actions }: ActionListProps) {
  if (actions.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-500">No actions needed from you.</p>
    );
  }

  return (
    <div className="mt-4 border-l-2 border-zinc-300 pl-4 dark:border-zinc-700">
      <p className="font-semibold">Action Required</p>

      <ul className="mt-3 space-y-3">
        {actions.map((item, index) => (
          <li key={index} className="text-sm">
            <div className="flex gap-2">
              <span aria-hidden="true">☐</span>
              <span>{item.action}</span>
            </div>

            {item.deadline_date ? (
              <p className="ml-6 mt-0.5">
                <span className="font-semibold">Due:</span>{" "}
                {formatDeadline(item.deadline_date)}
              </p>
            ) : (
              // The phrase could not be resolved to a date, so show what the
              // email actually said rather than dropping it.
              item.deadline_text && (
                <p className="ml-6 mt-0.5 text-zinc-500">
                  <span className="font-semibold">Due:</span>{" "}
                  {item.deadline_text}
                </p>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
