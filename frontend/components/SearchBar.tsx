"use client";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-zinc-200 bg-[var(--background)] p-4 dark:border-zinc-800">
      <div className="relative mx-auto max-w-3xl">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search emails…"
          aria-label="Search emails"
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 pr-16 text-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
