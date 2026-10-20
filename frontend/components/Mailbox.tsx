"use client";

import { useEffect, useState } from "react";
import EmailDetail from "@/components/EmailDetail";
import EmailList from "@/components/EmailList";
import ChatPanel from "@/components/ChatPanel";
import Sidebar from "@/components/Sidebar";
import { FOLDER_LABELS } from "@/lib/folders";
import type { ActionItem, Classification, Email, Folder } from "@/types/email";

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

  // An email opened from search may belong to a folder that is not loaded,
  // so it is held separately rather than looked up in the list.
  const [searchEmail, setSearchEmail] = useState<Email | null>(null);

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

  const selectedEmail =
    searchEmail ?? result?.emails.find((e) => e.id === selectedId) ?? null;

  function handleSelectFolder(next: Folder) {
    setSelectedId(null);
    setSearchEmail(null);
    setFolder(next);
  }

  // Apply a change to one email wherever it currently appears.
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

    setSearchEmail((prev) =>
      prev && prev.id === emailId ? { ...prev, ...changes } : prev,
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

  function markReadIfNeeded(email: Email) {
    if (email.is_read) return;

    // Update locally first so the row stops looking unread immediately,
    // rather than after a round trip.
    patchEmailInState(email.id, { is_read: true });

    fetch(`/api/emails/${email.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    }).catch(() => {
      // Failing to mark something read is not worth interrupting anyone over.
      // The email simply shows as unread again after a refresh.
    });
  }

  function handleSelectEmail(emailId: string) {
    setSearchEmail(null);
    setSelectedId(emailId);

    const email = result?.emails.find((e) => e.id === emailId);
    if (email) markReadIfNeeded(email);
  }

  // Citations carry only an id, and the email may live in a folder that is
  // not currently loaded, so it is fetched when it is not already on screen.
  async function handleOpenById(emailId: string) {
    const loaded = result?.emails.find((e) => e.id === emailId);
    if (loaded) {
      handleSelectEmail(emailId);
      return;
    }

    try {
      const res = await fetch(`/api/emails/${emailId}`);
      if (!res.ok) return;
      const email: Email = await res.json();
      setSelectedId(email.id);
      setSearchEmail(email);
      markReadIfNeeded(email);
    } catch {
      // A citation that will not open is not worth an error dialog.
    }
  }

  function handleBack() {
    setSelectedId(null);
    setSearchEmail(null);
  }

  return (
    <div className="flex h-screen">
      <Sidebar selected={folder} onSelect={handleSelectFolder} />

      <main className="flex-1 overflow-y-auto">
        {selectedEmail ? (
          // key= remounts the component per email, so the "Generating…"
          // state cannot leak from one email to the next.
          <EmailDetail
            key={selectedEmail.id}
            email={selectedEmail}
            backLabel={searchEmail ? "mail" : FOLDER_LABELS[folder]}
            onSummary={handleSummary}
            onClassify={handleClassify}
            onActions={handleActions}
            onBack={handleBack}
          />
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
              <EmailList emails={result.emails} onSelect={handleSelectEmail} />
            )}
          </>
        )}
      </main>

      <ChatPanel onOpenEmail={handleOpenById} />
    </div>
  );
}
