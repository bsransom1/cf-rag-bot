"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { useSpeechToText } from "@/lib/speech/useSpeechToText";
import type { ChatResponseBody, SourceCitation } from "@/types";

interface ChatWindowProps {
  projectId: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  isError?: boolean;
}

const STARTERS = [
  "What is the codice fiscale?",
  "How do I get an official one?",
  "What documents do non-EU citizens need?",
];

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatWindow({ projectId }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latestInputRef = useRef(input);
  const utteranceBaseRef = useRef("");

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  const speech = useSpeechToText({
    lang: "en-US",
    onInterim: (interim) => {
      const base = utteranceBaseRef.current;
      const needsSpace =
        Boolean(base && interim) &&
        !/\s$/.test(base) &&
        !/^\s/.test(interim);
      setInput(base + (needsSpace ? " " : "") + interim);
    },
    onFinal: (finalText) => {
      const base = utteranceBaseRef.current;
      const needsSpace = Boolean(base && finalText) && !/\s$/.test(base);
      const merged = (base + (needsSpace ? " " : "") + finalText).trimEnd();
      utteranceBaseRef.current = merged;
      setInput(merged);
    },
    onEnd: () => {
      utteranceBaseRef.current = latestInputRef.current;
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function newChat() {
    speech.stop();
    setMessages([]);
    setInput("");
    utteranceBaseRef.current = "";
    textareaRef.current?.focus();
  }

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", content: trimmed },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, message: trimmed }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? `Request failed (${res.status})`);
      }

      const data = (await res.json()) as ChatResponseBody;
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: data.response,
          sources: data.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content:
            err instanceof Error
              ? `Something went wrong: ${err.message}`
              : "Something went wrong. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send(input);
  }

  const empty = messages.length === 0 && !isLoading;

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-6 sm:px-6 sm:py-10">
      <div
        className="mx-auto flex h-[min(680px,calc(100dvh-3rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]"
        role="region"
        aria-label="Chat"
      >
        <div className="flex min-h-0 flex-1 flex-col px-3 sm:px-4">
          <div className="flex shrink-0 items-center justify-end py-3">
            <button
              type="button"
              onClick={newChat}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              New chat
            </button>
          </div>

          <div
            ref={scrollRef}
            className="chat-scroll min-h-0 flex-1 overflow-y-auto pb-4"
          >
          {empty ? (
            <div className="flex flex-col items-center justify-center px-2 pt-8 text-center sm:pt-16">
              <p className="max-w-sm text-[15px] text-neutral-500">
                Ask about the Italian codice fiscale.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <Message key={m.id} message={m} />
              ))}
              {isLoading && (
                <div className="msg-in flex gap-1 pt-1">
                  <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-neutral-400" />
                  <span
                    className="inline-block h-1 w-1 animate-pulse rounded-full bg-neutral-400"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="inline-block h-1 w-1 animate-pulse rounded-full bg-neutral-400"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              )}
            </div>
          )}
          </div>

          <div className="shrink-0 border-t border-neutral-100 py-3">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="flex items-end gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 focus-within:border-neutral-300 focus-within:bg-white">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (!speech.listening) utteranceBaseRef.current = e.target.value;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Message…"
                rows={1}
                className="max-h-40 min-h-[44px] w-full resize-none bg-transparent py-2.5 text-[15px] leading-snug text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-50"
                disabled={isLoading || speech.listening}
                aria-label="Message"
              />
              {speech.supported && (
                <button
                  type="button"
                  onClick={() => {
                    if (speech.listening) speech.stop();
                    else {
                      utteranceBaseRef.current = latestInputRef.current;
                      speech.start();
                    }
                  }}
                  disabled={isLoading}
                  className={
                    speech.listening
                      ? "mb-1 rounded-lg p-2 text-emerald-600"
                      : "mb-1 rounded-lg p-2 text-neutral-400 hover:text-neutral-700"
                  }
                  aria-label={speech.listening ? "Stop dictation" : "Dictate"}
                  aria-pressed={speech.listening}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 1 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="mb-1 rounded-lg bg-neutral-900 p-2 text-white disabled:bg-neutral-200 disabled:text-neutral-400"
                aria-label="Send"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.588.75.75 0 0 0 0-1.284A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
              </div>
              {speech.lastError && (
                <p className="text-center text-xs text-red-600">{speech.lastError}</p>
              )}
              <p className="text-center text-xs text-neutral-400">Not legal advice.</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ message: m }: { message: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div className="msg-in flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-neutral-100 px-4 py-2.5">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900">
            {m.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-in">
      <p
        className={
          m.isError
            ? "whitespace-pre-wrap text-[15px] leading-relaxed text-red-600"
            : "whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900"
        }
      >
        {m.content}
      </p>
      {m.sources && m.sources.length > 0 && (
        <details className="mt-3 text-xs text-neutral-500">
          <summary className="cursor-pointer select-none hover:text-neutral-700">
            Sources ({m.sources.length})
          </summary>
          <ul className="mt-2 space-y-1 border-l border-neutral-200 pl-3">
            {m.sources.map((s) => (
              <li key={s.id}>
                <span className="text-neutral-400">{s.section}</span> · {s.question}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
