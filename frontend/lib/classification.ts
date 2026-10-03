import type { Priority } from "@/types/email";

// Shared so the list and the reading view colour priorities the same way.
export const PRIORITY_STYLES: Record<Priority, string> = {
  High: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export const CATEGORY_STYLE =
  "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
