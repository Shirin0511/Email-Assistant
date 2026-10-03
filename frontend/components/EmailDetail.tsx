"use client";

import { useState } from "react";
import { CATEGORY_STYLE, PRIORITY_STYLES } from "@/lib/classification";
import { FOLDER_LABELS } from "@/lib/folders";
import type {
  Classification,
  ClassificationResponse,
  Email,
  Folder,
  SummaryResponse,
} from "@/types/email";

type EmailDetailProps = {
  email: Email;
  folder: Folder;
  onSummary: (emailId: string, summary: string) => void;
  onClassify: (emailId: string, classification: Classification) => void;
  onBack: () => void;
};

function formatFullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// FastAPI puts its message in a "detail" field.
async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.detail ?? `Request failed (${res.status})`;
}

export default function EmailDetail({
  email,
  folder,
  onSummary,
  onClassify,
  onBack,
}: EmailDetailProps) {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  async function generateSummary() {
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      // Already summarized? Ask the backend to skip its cache and redo it.
      const force = email.summary ? "?force=true" : "";
      const res = await fetch(`/api/emails/${email.id}/summary${force}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readError(res));
      const data: SummaryResponse = await res.json();
      onSummary(email.id, data.summary);
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      // Runs even when the request failed, so the button never sticks.
      setIsSummarizing(false);
    }
  }

  async function classifyEmail() {
    setIsClassifying(true);
    setClassifyError(null);
    try {
      const force = email.classification ? "?force=true" : "";
      const res = await fetch(`/api/emails/${email.id}/classify${force}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readError(res));
      const data: ClassificationResponse = await res.json();
      onClassify(email.id, data.classification);
    } catch (err) {
      setClassifyError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setIsClassifying(false);
    }
  }

  const recipientList = email.recipients
    .map((r) => r.name || r.email)
    .join(", ");

  return (
    <article className="mx-auto max-w-3xl p-6">
      <button
        onClick={onBack}
        className="mb-6 rounded-lg px-2 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        ← Back to {FOLDER_LABELS[folder]}
      </button>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-2xl font-semibold">{email.subject}</h2>
        {email.classification && (
          <>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLE}`}
            >
              {email.classification.category}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                PRIORITY_STYLES[email.classification.priority]
              }`}
            >
              {email.classification.priority}
            </span>
          </>
        )}
      </div>

      <div className="mt-4 border-b border-zinc-200 pb-4 text-sm dark:border-zinc-800">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-medium">
            {email.sender_name}{" "}
            <span className="font-normal text-zinc-500">
              &lt;{email.sender_email}&gt;
            </span>
          </span>
          <span className="text-zinc-500">
            {formatFullTimestamp(email.timestamp)}
          </span>
        </div>
        <p className="mt-1 text-zinc-500">To: {recipientList}</p>
        {email.cc.length > 0 && (
          <p className="text-zinc-500">Cc: {email.cc.join(", ")}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={generateSummary}
          disabled={isSummarizing}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isSummarizing
            ? "Generating…"
            : email.summary
              ? "Regenerate summary"
              : "Generate summary"}
        </button>

        <button
          onClick={classifyEmail}
          disabled={isClassifying}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {isClassifying
            ? "Classifying…"
            : email.classification
              ? "Reclassify"
              : "Classify"}
        </button>

        {(summaryError || classifyError) && (
          <span className="text-sm text-red-600">
            {summaryError ?? classifyError}
          </span>
        )}
      </div>

      {email.summary && (
        <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm dark:bg-amber-950/40">
          <p className="font-semibold">Summary</p>
          <p className="mt-1">{email.summary}</p>
        </div>
      )}

      <p className="mt-6 whitespace-pre-wrap text-sm leading-6">{email.body}</p>
    </article>
  );
}
