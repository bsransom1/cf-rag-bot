"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { FormattedAssistantText } from "@/components/FormattedAssistantText";
import type { ChatResponseBody } from "@/types";

interface ChatWindowProps {
  projectId: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

type UiLang = "en" | "it";

const UI_COPY: Record<
  UiLang,
  {
    emptyPrompt: string;
    starters: string[];
    msgPlaceholder: string;
    ariaMsg: string;
    ariaMicStart: string;
    ariaMicStop: string;
    ariaMicTranscribing: string;
    ariaSend: string;
    notLegal: string;
    newChat: string;
    ariaNewChat: string;
    ariaLang: string;
    langEn: string;
    langIt: string;
    infoTitle: string;
    ariaRegion: string;
    errRequest: string;
    errGeneric: string;
    errChat: string;
    noSpeech: string;
    noRecSupport: string;
    micBlocked: string;
    noAudioCap: string;
    transcribeFail: string;
  }
> = {
  en: {
    emptyPrompt:
      "Ask about the Italian codice fiscale, tax code, or immigration.",
    starters: [
      "What is the codice fiscale?",
      "How do I get an official one?",
      "What documents do non-EU citizens need?",
    ],
    msgPlaceholder: "Ask your question in English or Italian…",
    ariaMsg: "Message",
    ariaMicStart: "Start dictation",
    ariaMicStop: "Stop dictation",
    ariaMicTranscribing: "Transcribing",
    ariaSend: "Send message",
    notLegal: "Not legal advice.",
    newChat: "New chat",
    ariaNewChat: "Start a new chat",
    ariaLang: "Interface language",
    langEn: "English",
    langIt: "Italian",
    infoTitle: "This assistant answers from our verified FAQ. It is not a substitute for a licensed professional.",
    ariaRegion: "Chat about the Italian codice fiscale and immigration",
    errRequest: "Request failed",
    errGeneric: "Something went wrong. Please try again.",
    errChat: "Something went wrong:",
    noSpeech: "No speech detected.",
    noRecSupport: "Recording is not supported in this browser.",
    micBlocked: "Microphone access was blocked.",
    noAudioCap: "No audio captured.",
    transcribeFail: "Transcription failed",
  },
  it: {
    emptyPrompt:
      "Chiedi del codice fiscale, documenti, immigrazione o residenza in Italia.",
    starters: [
      "Cos’è il codice fiscale?",
      "Come posso averne uno ufficiale?",
      "Quali documenti servono ai cittadini extra-UE?",
    ],
    msgPlaceholder: "Scrivi in italiano o in inglese…",
    ariaMsg: "Messaggio",
    ariaMicStart: "Avvia dettatura",
    ariaMicStop: "Ferma dettatura",
    ariaMicTranscribing: "Trascrizione in corso",
    ariaSend: "Invia messaggio",
    notLegal: "Non è consulenza legale.",
    newChat: "Nuova chat",
    ariaNewChat: "Inizia una nuova chat",
    ariaLang: "Lingua dell’interfaccia",
    langEn: "Inglese",
    langIt: "Italiano",
    infoTitle:
      "L’assistente risponde in base alle nostre FAQ verificate. Non sostituisce un professionista abilitato.",
    ariaRegion: "Chat sul codice fiscale e sull’immigrazione in Italia",
    errRequest: "Richiesta non riuscita",
    errGeneric: "Qualcosa è andato storto. Riprova.",
    errChat: "Qualcosa è andato storto:",
    noSpeech: "Nessun audio rilevato.",
    noRecSupport: "La registrazione non è supportata in questo browser.",
    micBlocked: "Accesso al microfono negato.",
    noAudioCap: "Nessun audio acquisito.",
    transcribeFail: "Trascrizione non riuscita",
  },
};

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type DictationStatus = "idle" | "recording" | "transcribing";

export default function ChatWindow({ projectId }: ChatWindowProps) {
  const [uiLang, setUiLang] = useState<UiLang>("en");
  const s = UI_COPY[uiLang];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dictationStatus, setDictationStatus] = useState<DictationStatus>("idle");
  const [dictationError, setDictationError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const uiLangRef = useRef<UiLang>(uiLang);
  uiLangRef.current = uiLang;
  const chatAbortRef = useRef<AbortController | null>(null);
  const dictationAbortRef = useRef<AbortController | null>(null);

  const isDictating = dictationStatus !== "idle";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading, dictationStatus]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
      mediaRecorderRef.current = null;
    };
  }, []);

  function pickMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return undefined;
  }

  function filenameForMime(mime: string | undefined): string {
    if (!mime) return "audio.webm";
    if (mime.startsWith("audio/webm")) return "audio.webm";
    if (mime.startsWith("audio/mp4")) return "audio.mp4";
    if (mime.startsWith("audio/ogg")) return "audio.ogg";
    return "audio.webm";
  }

  async function transcribeBlob(blob: Blob, filename: string) {
    setDictationStatus("transcribing");
    const controller = new AbortController();
    dictationAbortRef.current?.abort();
    dictationAbortRef.current = controller;
    const langAtStart = uiLangRef.current;
    try {
      const formData = new FormData();
      formData.append("audio", blob, filename);
      const res = await fetch("/api/dictation", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const payload = (await res.json().catch(() => ({}))) as {
        transcript?: string;
        error?: string;
      };
      if (!res.ok) {
        const t = UI_COPY[uiLangRef.current];
        throw new Error(
          payload.error ?? `${t.transcribeFail} (${res.status})`,
        );
      }
      const text = (payload.transcript ?? "").trim();
      if (!text) {
        const t = UI_COPY[uiLangRef.current];
        throw new Error(t.noSpeech);
      }
      if (uiLangRef.current !== langAtStart) {
        return;
      }
      setInput(text);
      await send(text);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      if (uiLangRef.current !== langAtStart) {
        return;
      }
      const t = UI_COPY[uiLangRef.current];
      setDictationError(
        e instanceof Error ? e.message : t.transcribeFail,
      );
    } finally {
      if (dictationAbortRef.current === controller) {
        dictationAbortRef.current = null;
      }
      setDictationStatus("idle");
    }
  }

  async function startRecording() {
    if (isLoading || isDictating) return;
    setDictationError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof MediaRecorder === "undefined"
    ) {
      setDictationError(UI_COPY[uiLangRef.current].noRecSupport);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setDictationError(UI_COPY[uiLangRef.current].micBlocked);
      return;
    }

    audioStreamRef.current = stream;
    audioChunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    });

    recorder.addEventListener("stop", () => {
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
      const recordedType = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: recordedType });
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;

      if (blob.size === 0) {
        setDictationError(UI_COPY[uiLangRef.current].noAudioCap);
        setDictationStatus("idle");
        return;
      }
      void transcribeBlob(blob, filenameForMime(recordedType));
    });

    recorder.start();
    setDictationStatus("recording");
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function toggleDictation() {
    if (dictationStatus === "recording") {
      stopRecording();
      return;
    }
    if (dictationStatus === "idle") {
      void startRecording();
    }
  }

  function resetSession() {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    dictationAbortRef.current?.abort();
    dictationAbortRef.current = null;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
      }
    }
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;

    setIsLoading(false);
    setDictationStatus("idle");
    setMessages([]);
    setInput("");
    setDictationError(null);
  }

  function newChat() {
    resetSession();
    textareaRef.current?.focus();
  }

  function changeLang(next: UiLang) {
    if (next === uiLang) return;
    resetSession();
    setUiLang(next);
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

    const controller = new AbortController();
    chatAbortRef.current?.abort();
    chatAbortRef.current = controller;
    const langAtSend = uiLangRef.current;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          message: trimmed,
          lang: langAtSend,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          payload.error ??
            `${UI_COPY[uiLangRef.current].errRequest} (${res.status})`,
        );
      }

      const data = (await res.json()) as ChatResponseBody;
      if (uiLangRef.current !== langAtSend) {
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (uiLangRef.current !== langAtSend) {
        return;
      }
      const t = UI_COPY[uiLangRef.current];
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content:
            err instanceof Error
              ? `${t.errChat} ${err.message}`
              : t.errGeneric,
          isError: true,
        },
      ]);
    } finally {
      if (chatAbortRef.current === controller) {
        chatAbortRef.current = null;
      }
      setIsLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send(input);
  }

  const empty = messages.length === 0 && !isLoading;
  const formLocked = isLoading || isDictating;

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-6 sm:px-6 sm:py-10">
      <div className="relative mx-auto w-full max-w-2xl">
        <div
          className="relative flex h-[min(680px,calc(100dvh-3rem))] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.03)]"
          role="region"
          aria-label={s.ariaRegion}
          title={s.infoTitle}
        >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-100 px-3 py-2.5 sm:px-4">
            <div
              className="inline-flex shrink-0 items-center rounded-full border border-neutral-200/80 bg-neutral-100/95 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
              role="group"
              aria-label={s.ariaLang}
            >
              <button
                type="button"
                onClick={() => changeLang("en")}
                className={
                  uiLang === "en"
                    ? "flex h-7 w-9 items-center justify-center rounded-full bg-white text-xs font-medium text-neutral-900 shadow-sm ring-1 ring-black/[0.06] transition-none"
                    : "flex h-7 w-9 items-center justify-center rounded-full text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-800"
                }
                aria-pressed={uiLang === "en"}
                title={s.langEn}
                aria-label={s.langEn}
              >
                <span className="text-[1.05rem] leading-none" role="img" aria-hidden>
                  🇺🇸
                </span>
              </button>
              <button
                type="button"
                onClick={() => changeLang("it")}
                className={
                  uiLang === "it"
                    ? "flex h-7 w-9 items-center justify-center rounded-full bg-white text-xs font-medium text-neutral-900 shadow-sm ring-1 ring-black/[0.06] transition-none"
                    : "flex h-7 w-9 items-center justify-center rounded-full text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-800"
                }
                aria-pressed={uiLang === "it"}
                title={s.langIt}
                aria-label={s.langIt}
              >
                <span className="text-[1.05rem] leading-none" role="img" aria-hidden>
                  🇮🇹
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={newChat}
              className="shrink-0 text-sm text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-400"
              aria-label={s.ariaNewChat}
            >
              {s.newChat}
            </button>
          </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pt-1 sm:px-4 sm:pt-2">

          <div
            ref={scrollRef}
            className="chat-scroll min-h-0 flex-1 overflow-y-auto pb-4"
          >
          {empty ? (
            <div className="flex flex-col items-center justify-center px-2 pt-6 text-center sm:pt-12">
              <p className="max-w-sm text-[15px] text-neutral-500">
                {s.emptyPrompt}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                {s.starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void send(starter)}
                    className="rounded-full border border-neutral-200/90 bg-white px-4 py-2 text-sm text-neutral-800 shadow-sm transition-colors duration-200 hover:border-neutral-300/90 hover:bg-neutral-50"
                  >
                    {starter}
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
              <div className="flex items-end gap-2 rounded-2xl border border-neutral-200/90 bg-neutral-50 px-3 py-2 shadow-sm transition-shadow duration-200 focus-within:border-neutral-300/80 focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-neutral-200/60">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder={s.msgPlaceholder}
                rows={1}
                className="max-h-40 min-h-[44px] w-full resize-none bg-transparent py-2.5 text-[15px] leading-snug text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-50"
                disabled={formLocked}
                aria-label={s.ariaMsg}
              />
              <button
                type="button"
                onClick={toggleDictation}
                disabled={
                  isLoading || dictationStatus === "transcribing"
                }
                className={
                  dictationStatus === "recording"
                    ? "mb-1 rounded-lg bg-red-50 p-2 text-red-600 ring-1 ring-red-500/30 shadow-sm transition-all duration-200 hover:bg-red-100"
                    : dictationStatus === "transcribing"
                      ? "mb-1 rounded-lg p-2 text-amber-700 ring-1 ring-amber-500/20 shadow-sm"
                      : "mb-1 rounded-lg p-2 text-neutral-400 shadow-sm transition-all duration-200 hover:bg-neutral-200/50 hover:text-neutral-800 hover:shadow disabled:opacity-50"
                }
                aria-label={
                  dictationStatus === "recording"
                    ? s.ariaMicStop
                    : dictationStatus === "transcribing"
                      ? s.ariaMicTranscribing
                      : s.ariaMicStart
                }
                aria-pressed={dictationStatus === "recording"}
                aria-busy={dictationStatus === "transcribing"}
                title={
                  dictationStatus === "recording"
                    ? s.ariaMicStop
                    : dictationStatus === "transcribing"
                      ? s.ariaMicTranscribing
                      : s.ariaMicStart
                }
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
              <button
                type="submit"
                disabled={isLoading || !input.trim() || isDictating}
                className="mb-1 rounded-lg bg-neutral-900 p-2 text-white shadow-sm transition-all duration-200 enabled:hover:-translate-y-px enabled:hover:bg-neutral-800 enabled:hover:shadow-md active:translate-y-0 active:shadow-sm disabled:bg-neutral-200 disabled:text-neutral-400"
                aria-label={s.ariaSend}
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
              {dictationError && (
                <p className="text-center text-xs text-red-600">{dictationError}</p>
              )}
              <p className="text-center text-xs text-neutral-400">{s.notLegal}</p>
            </form>
          </div>
        </div>
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
        <div className="max-w-[85%] rounded-2xl border border-black/[0.04] bg-neutral-100/95 px-4 py-2.5 shadow-sm">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900">
            {m.content}
          </p>
        </div>
      </div>
    );
  }

  if (m.isError) {
    return (
      <div className="msg-in">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-red-600">
          {m.content}
        </p>
      </div>
    );
  }

  return (
    <div className="msg-in text-left">
      <FormattedAssistantText text={m.content} />
    </div>
  );
}
