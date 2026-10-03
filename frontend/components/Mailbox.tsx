"use client";

import { useEffect, useState } from "react";
import EmailDetail from "@/components/EmailDetail";
import EmailList from "@/components/EmailList";
import Sidebar from "@/components/Sidebar";
import type { Classification, Email, Folder } from "@/types/email";

// The result of one fetch, tagged with the folder it was fetched for.
type FetchResult = {
  folder: Folder;
  emails: Email[];
  error: string | null;
};

export default function Mailbox() {
  const [folder, setFolder] = useState<Folder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<FetchResult | null>(null);

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

  // We are still loading if the stored result belongs to a different folder.
  const isLoading = result?.folder !== folder;

  const selectedEmail = result?.emails.find((e) => e.id === selectedId) ?? null;

  function handleSelectFolder(next: Folder) {
    // The selected email belongs to the old folder, so clear it.
    setSelectedId(null);
    setFolder(next);
  }

  // Apply a change to one email in the currently loaded list.
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
  }

  // Store the new summary on the email so it survives clicking away and back.
  function handleSummary(emailId: string, summary: string) {
    patchEmailInState(emailId, { summary });
  }

  function handleClassify(emailId: string, classification: Classification) {
    patchEmailInState(emailId, { classification });
  }

  function handleSelectEmail(emailId: string) {
    setSelectedId(emailId);

    const email = result?.emails.find((e) => e.id === emailId);
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
        {isLoading && <p className="p-6 text-sm text-zinc-500">Loading…</p>}

        {!isLoading && result?.error && (
          <p className="p-6 text-sm text-red-600">
            Could not load emails: {result.error}. Is the backend running on
            port 8000?
          </p>
        )}

        {/* An open email replaces the list, the way Gmail does it. */}
        {!isLoading &&
          result &&
          !result.error &&
          (selectedEmail ? (
            // key= remounts the component per email, so the "Generating…"
            // state cannot leak from one email to the next.
            <EmailDetail
              key={selectedEmail.id}
              email={selectedEmail}
              folder={folder}
              onSummary={handleSummary}
              onClassify={handleClassify}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <EmailList
              emails={result.emails}
              folder={folder}
              onSelect={handleSelectEmail}
            />
          ))}
      </main>
    </div>
  );
}
