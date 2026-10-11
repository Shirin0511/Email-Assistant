"use client";

import { useState } from "react";
import type { Email, SearchHit, SearchResponse } from "@/types/email";

type SearchPanelProps = {
  onOpenEmail: (email: Email) => void;
};

export default function SearchPanel({ onOpenEmail }: SearchPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/emails/search?q=${encodeURIComponent(trimmed)}`,
      );
      if (!res.ok) {
        // FastAPI puts its message in a "detail" field.
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Request failed (${res.status})`);
      }
      const data: SearchResponse = await res.json();
      setHits(data.hits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      // Runs even when the request failed, so the button never sticks.
      setIsSearching(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-20 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-blue-700"
      >
        Ask about your mail
      </button>
    );
  }

  return (
    <section className="fixed bottom-6 right-6 z-20 flex max-h-[70vh] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-[var(--background)] shadow-2xl dark:border-zinc-700">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Ask about your mail</h2>
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Close search"
          className="rounded px-2 py-0.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {hits === null && !isSearching && !error && (
          <p className="text-sm text-zinc-500">
            Try “emails about the project budget” or “who asked me for a
            timeline?”
          </p>
        )}

        {isSearching && <p className="text-sm text-zinc-500">Searching…</p>}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {hits !== null && !isSearching && hits.length === 0 && (
          <p className="text-sm text-zinc-500">No matching emails.</p>
        )}

        {hits !== null && !isSearching && hits.length > 0 && (
          <ul className="space-y-1">
            {hits.map((hit) => (
              <li key={hit.email.id}>
                <button
                  onClick={() => onOpenEmail(hit.email)}
                  className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {hit.email.subject}
                    </span>
                    {/* Raw cosine similarity, not a percentage. */}
                    <span className="shrink-0 text-xs text-zinc-400">
                      {hit.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-zinc-500">
                    {hit.email.sender_name} ·{" "}
                    {hit.email.body.replace(/\s+/g, " ")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={runSearch}
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask a question…"
          aria-label="Search query"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
