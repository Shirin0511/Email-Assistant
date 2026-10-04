"use client";

import { useEffect, useState } from "react";
import EmailDetail from "@/components/EmailDetail";
import EmailList from "@/components/EmailList";
import SearchBar from "@/components/SearchBar";
import Sidebar from "@/components/Sidebar";
import { FOLDER_LABELS } from "@/lib/folders";
import type {
  ActionItem,
  Classification,
  Email,
  Folder,
  SearchHit,
  SearchResponse,
} from "@/types/email";

// The result of one fetch, tagged with the folder it was fetched for.
type FetchResult = {
  folder: Folder;
  emails: Email[];
  error: string | null;
};

// How long to wait after the last keystroke before searching.
const SEARCH_DEBOUNCE_MS = 300;

export default function Mailbox() {
  const [folder, setFolder] = useState<Folder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<FetchResult | null>(null);

  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // If the user switches folders before this request finishes, the cleanup
    // below flips this flag so the stale response is ignored.
    let cancelled = false;

    fetch(`/api/emails?folder=${folder}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json() as Promise<Email[]>;
      })
      .then((emails) => {
        if (!cancelled) setResult({ folder, emails, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ folder, emails: [], error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [folder]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    let cancelled = false;

    // Wait for a pause in typing instead of firing on every keystroke. The
    // cancelled flag also stops an earlier, slower response for "budg" from
    // overwriting the results for "budget".
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/emails/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Request failed (${res.status})`);
          return res.json() as Promise<SearchResponse>;
        })
        .then((data) => {
          if (!cancelled) setSearchHits(data.hits);
        })
        .catch(() => {
          if (!cancelled) setSearchHits([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // We are still loading if the stored result belongs to a different folder.
  const isLoading = result?.folder !== folder;

  // Driven by the box, not by the response, so the view switches the moment
  // you type rather than when the first results land.
  const isSearchMode = query.trim().length > 0;
  const searchEmails = searchHits?.map((hit) => hit.email) ?? null;

  // Whichever list is on screen is also where a selected email comes from.
  const visibleEmails = isSearchMode
    ? (searchEmails ?? [])
    : (result?.emails ?? []);
  const selectedEmail = visibleEmails.find((e) => e.id === selectedId) ?? null;

  function handleSelectFolder(next: Folder) {
    // Picking a folder leaves search behind.
    setSelectedId(null);
    setQuery("");
    setSearchHits(null);
    setFolder(next);
  }

  function handleQueryChange(next: string) {
    // Typing a new query invalidates whatever email was open, and the previous
    // results, which would otherwise flash while the new request is in flight.
    setSelectedId(null);
    setSearchHits(null);
    setQuery(next);
  }

  // Apply a change to one email wherever it currently appears. An email can be
  // in both the folder list and the search results, so both are updated.
  function patchEmailInState(emailId: string, changes: Partial<Email>) {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            emails: prev.emails.map((e) =>
              e.id === emailId ? { ...e, ...changes } : e,
            ),
          }
        : prev,
    );

    setSearchHits((prev) =>
      prev
        ? prev.map((hit) =>
            hit.email.id === emailId
              ? { ...hit, email: { ...hit.email, ...changes } }
              : hit,
          )
        : prev,
    );
  }

  // Store the new summary on the email so it survives clicking away and back.
  function handleSummary(emailId: string, summary: string) {
    patchEmailInState(emailId, { summary });
  }

  function handleClassify(emailId: string, classification: Classification) {
    patchEmailInState(emailId, { classification });
  }

  function handleActions(emailId: string, actions: ActionItem[]) {
    patchEmailInState(emailId, { actions });
  }

  function handleSelectEmail(emailId: string) {
    setSelectedId(emailId);

    const email = visibleEmails.find((e) => e.id === emailId);
    if (!email || email.is_read) return;

    // Update locally first so the row stops looking unread immediately,
    // rather than after a round trip.
    patchEmailInState(emailId, { is_read: true });

    fetch(`/api/emails/${emailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    }).catch(() => {
      // Failing to mark something read is not worth interrupting anyone over.
      // The email simply shows as unread again after a refresh.
    });
  }

  return (
    <div className="flex h-screen">
      <Sidebar selected={folder} onSelect={handleSelectFolder} />

      <main className="flex-1 overflow-y-auto">
        <SearchBar value={query} onChange={handleQueryChange} />

        {/* An open email replaces whichever list it came from. */}
        {selectedEmail ? (
          // key= remounts the component per email, so the "Generating…"
          // state cannot leak from one email to the next.
          <EmailDetail
            key={selectedEmail.id}
            email={selectedEmail}
            backLabel={isSearchMode ? "results" : FOLDER_LABELS[folder]}
            onSummary={handleSummary}
            onClassify={handleClassify}
            onActions={handleActions}
            onBack={() => setSelectedId(null)}
          />
        ) : isSearchMode ? (
          // Null hits means the debounce window or the request is still open.
          isSearching || searchHits === null ? (
            <p className="p-6 text-sm text-zinc-500">Searching…</p>
          ) : (
            <EmailList
              emails={searchEmails ?? []}
              onSelect={handleSelectEmail}
              emptyMessage={`No emails match “${query.trim()}”.`}
            />
          )
        ) : (
          <>
            {isLoading && <p className="p-6 text-sm text-zinc-500">Loading…</p>}

            {!isLoading && result?.error && (
              <p className="p-6 text-sm text-red-600">
                Could not load emails: {result.error}. Is the backend running on
                port 8000?
              </p>
            )}

            {!isLoading && result && !result.error && (
              <EmailList
                emails={result.emails}
                onSelect={handleSelectEmail}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
