"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatResponse, ChatTurn } from "@/types/email";

type ChatPanelProps = {
  onOpenEmail: (emailId: string) => void;
};

export default function ChatPanel({ onOpenEmail }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isAsking]);

  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

    // The server is stateless, so it gets the history with every request.
    // Built before the new question is appended: the backend takes that
    // separately and would otherwise see it twice.
    const history: ChatMessage[] = turns.map(({ role, content }) => ({
      role,
      content,
    }));

    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    setIsAsking(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
      });
      if (!res.ok) {
        // FastAPI puts its message in a "detail" field.
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Request failed (${res.status})`);
      }
      const data: ChatResponse = await res.json();
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, citations: data.citations },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      // Runs even when the request failed, so the input never stays locked.
      setIsAsking(false);
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
    <section className="fixed bottom-6 right-6 z-20 flex max-h-[75vh] w-[420px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-[var(--background)] shadow-2xl dark:border-zinc-700">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Ask about your mail</h2>
        <div className="flex items-center gap-1">
          {turns.length > 0 && (
            <button
              onClick={() => {
                setTurns([]);
                setError(null);
              }}
              className="rounded px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            className="rounded px-2 py-0.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {turns.length === 0 && !isAsking && (
          <p className="text-sm text-zinc-500">
            Ask things like “what am I supposed to do for the project
            proposal?” or “what’s happening with the database migration?”
          </p>
        )}

        {turns.map((turn, index) => (
          <div key={index}>
            {turn.role === "user" ? (
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-3 py-2 text-sm text-white">
                {turn.content}
              </p>
            ) : (
              <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                <p className="whitespace-pre-wrap text-sm">{turn.content}</p>

                {turn.citations && turn.citations.length > 0 && (
                  <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
                    <p className="mb-1 text-xs font-semibold text-zinc-500">
                      Sources
                    </p>
                    <ul className="space-y-0.5">
                      {turn.citations.map((citation) => (
                        <li key={citation.marker}>
                          <button
                            onClick={() => onOpenEmail(citation.email_id)}
                            className="text-left text-xs text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
                          >
                            [{citation.marker}] {citation.subject} —{" "}
                            {citation.sender_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isAsking && <p className="text-sm text-zinc-500">Reading your mail…</p>}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={ask}
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a question…"
          aria-label="Your question"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
