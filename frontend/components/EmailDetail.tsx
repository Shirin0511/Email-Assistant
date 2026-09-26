"use client";

import { useState } from "react";
import type { Email, SummaryResponse } from "@/types/email";

type EmailDetailProps = {
  email: Email;
  onSummary: (emailId: string, summary: string) => void;
};

export default function EmailDetail({ email, onSummary }: EmailDetailProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateSummary() {
    setIsGenerating(true);
    setError(null);
    try {
      // Already summarized? Ask the backend to skip its cache and redo it.
      const force = email.summary ? "?force=true" : "";
      const res = await fetch(`/api/emails/${email.id}/summary${force}`, {
        method: "POST",
      });
      if (!res.ok) {
        // FastAPI puts its message in a "detail" field.
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Request failed (${res.status})`);
      }
      const data: SummaryResponse = await res.json();
      onSummary(email.id, data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      // Runs even when the request failed, so the button never sticks.
      setIsGenerating(false);
    }
  }

  return (
    <article className="border-t border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">{email.subject}</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {email.sender_name} &lt;{email.sender_email}&gt;
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={generateSummary}
          disabled={isGenerating}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isGenerating
            ? "Generating…"
            : email.summary
              ? "Regenerate summary"
              : "Generate summary"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {email.summary && (
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
          <p className="font-semibold">Summary</p>
          <p className="mt-1">{email.summary}</p>
        </div>
      )}

      <p className="mt-6 whitespace-pre-wrap text-sm">{email.body}</p>
    </article>
  );
}
