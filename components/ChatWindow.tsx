"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { FormattedAssistantText } from "@/components/FormattedAssistantText";
import { toggleTheme, useDomDark } from "@/hooks/useDomDark";
import type { ChatResponseBody } from "@/types";

interface ChatWindowProps {
  projectId: string;
  /** Default: full standalone page; `embed`: fills iframe, marketing chrome */
  variant?: "default" | "embed";
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
    ariaThemeLight: string;
    ariaThemeDark: string;
    ariaOpenAssistant: string;
    ariaCloseAssistant: string;
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
    ariaThemeLight: "Switch to light mode",
    ariaThemeDark: "Switch to dark mode",
    ariaOpenAssistant: "Open CodiceFiscale.ai assistant",
    ariaCloseAssistant: "Close assistant",
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
    ariaThemeLight: "Passa alla modalità chiara",
    ariaThemeDark: "Passa alla modalità scura",
    ariaOpenAssistant: "Apri l’assistente CodiceFiscale.ai",
    ariaCloseAssistant: "Chiudi assistente",
  },
};

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function langSegClass(embed: boolean, active: boolean): string {
  if (embed) {
    return active
      ? "flex h-7 w-9 items-center justify-center rounded-md bg-white text-xs font-semibold text-cf-brand-nav shadow-sm ring-1 ring-black/10"
      : "flex h-7 w-9 items-center justify-center rounded-md text-xs font-medium text-white/85 transition-colors hover:bg-white/10";
  }
  return active
    ? "flex h-7 w-9 items-center justify-center rounded-md bg-cf-surface text-xs font-medium text-cf-ink shadow-sm ring-1 ring-black/[0.08] transition-colors dark:bg-white/[0.14] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)] dark:ring-1 dark:ring-white/25"
    : "flex h-7 w-9 items-center justify-center rounded-md text-xs font-medium text-cf-muted transition-colors hover:text-cf-body dark:hover:bg-white/[0.05]";
}

type DictationStatus = "idle" | "recording" | "transcribing";

export default function ChatWindow({
  projectId,
  variant = "default",
}: ChatWindowProps) {
  const isEmbed = variant === "embed";
  /** Embed iframe: FAB first; expands to full panel until closed */
  const [embedPanelOpen, setEmbedPanelOpen] = useState(false);
  const [uiLang, setUiLang] = useState<UiLang>("en");
  const s = UI_COPY[uiLang];
  const isDark = useDomDark();

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

  function closeEmbedPanel() {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setEmbedPanelOpen(false);
  }

  const embedShowLauncher = isEmbed && !embedPanelOpen;

  return (
    <div
      className={
        embedShowLauncher
          ? "relative box-border h-full min-h-0 w-full overflow-hidden bg-transparent"
          : isEmbed
            ? "box-border flex h-full min-h-0 w-full flex-col overflow-hidden bg-cf-page p-2"
            : "min-h-screen bg-cf-page px-4 py-6 sm:px-6 sm:py-10"
      }
    >
      {embedShowLauncher ? (
        <button
          type="button"
          onClick={() => {
            setEmbedPanelOpen(true);
            queueMicrotask(() => textareaRef.current?.focus());
          }}
          className="absolute bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-cf-brand-cta text-white shadow-lg ring-4 ring-black/[0.08] transition-transform hover:scale-[1.06] hover:bg-cf-brand-cta-hover hover:shadow-xl active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-expanded={false}
          aria-controls="cf-embed-chat-panel"
          aria-label={s.ariaOpenAssistant}
          title={s.ariaOpenAssistant}
        >
          <svg
            className="h-[1.625rem] w-[1.625rem]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="5" width="12" height="10" rx="2" ry="2" />
            <rect x="9" y="9" width="12" height="10" rx="2" ry="2" />
          </svg>
        </button>
      ) : null}

      {isEmbed && !embedPanelOpen ? null : (
      <div
        className={
          isEmbed
            ? "flex min-h-0 flex-1 flex-col"
            : "relative mx-auto w-full max-w-2xl"
        }
      >
        <div
          id={isEmbed ? "cf-embed-chat-panel" : undefined}
          className={
            isEmbed
              ? "relative flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[0_8px_30px_rgba(10,22,40,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
              : "relative flex h-[min(680px,calc(100dvh-3rem))] w-full flex-col overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"
          }
          role="region"
          aria-label={s.ariaRegion}
          title={s.infoTitle}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              className={
                isEmbed
                  ? "flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.12] bg-cf-brand-nav px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
                  : "flex shrink-0 items-center justify-between gap-3 border-b border-cf-border px-3 py-2.5 sm:px-4"
              }
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                {isEmbed ? (
                  <div className="min-w-0 shrink">
                    <p className="truncate font-display text-sm font-semibold tracking-tight text-white">
                      CodiceFiscale.ai
                    </p>
                    <p className="truncate text-[11px] text-white/65">
                      Assistant
                    </p>
                  </div>
                ) : null}
                <div
                  className={
                    isEmbed
                      ? "inline-flex shrink-0 items-center rounded-lg border border-white/20 bg-black/25 p-0.5"
                      : "inline-flex shrink-0 items-center rounded-lg border border-cf-border bg-cf-surface-muted p-0.5"
                  }
                  role="group"
                  aria-label={s.ariaLang}
                >
                  <button
                    type="button"
                    onClick={() => changeLang("en")}
                    className={langSegClass(isEmbed, uiLang === "en")}
                    aria-pressed={uiLang === "en"}
                    title={s.langEn}
                    aria-label={s.langEn}
                  >
                    <span
                      className="text-[1.05rem] leading-none"
                      role="img"
                      aria-hidden
                    >
                      🇺🇸
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLang("it")}
                    className={langSegClass(isEmbed, uiLang === "it")}
                    aria-pressed={uiLang === "it"}
                    title={s.langIt}
                    aria-label={s.langIt}
                  >
                    <span
                      className="text-[1.05rem] leading-none"
                      role="img"
                      aria-hidden
                    >
                      🇮🇹
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                {isEmbed ? (
                  <button
                    type="button"
                    onClick={closeEmbedPanel}
                    className="rounded-lg p-1.5 text-white/85 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    aria-label={s.ariaCloseAssistant}
                    title={s.ariaCloseAssistant}
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleTheme()}
                  className={
                    isEmbed
                      ? "rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10"
                      : "rounded-lg p-1.5 text-cf-muted transition-colors hover:bg-cf-page hover:text-cf-ink dark:hover:bg-white/5"
                  }
                  aria-label={
                    isDark ? s.ariaThemeLight : s.ariaThemeDark
                  }
                  title={
                    isDark ? s.ariaThemeLight : s.ariaThemeDark
                  }
                >
                  {isDark ? (
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={newChat}
                  className={
                    isEmbed
                      ? "shrink-0 text-sm text-white/90 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      : "shrink-0 text-sm text-cf-muted transition-colors hover:text-cf-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cf-accent"
                  }
                  aria-label={s.ariaNewChat}
                >
                  {s.newChat}
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-3 pt-1 sm:px-4 sm:pt-2">
              <div
                ref={scrollRef}
                className="chat-scroll min-h-0 flex-1 overflow-y-auto pb-4"
              >
                {empty ? (
                  <div className="flex flex-col items-center justify-center px-2 pt-6 text-center sm:pt-12">
                    <p className="max-w-sm font-sans text-[15px] leading-relaxed text-cf-muted">
                      {s.emptyPrompt}
                    </p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                      {s.starters.map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => void send(starter)}
                          className={
                            isEmbed
                              ? "rounded-lg border border-cf-border bg-cf-surface-muted px-4 py-2.5 text-sm text-cf-ink shadow-sm transition-colors duration-200 hover:border-cf-brand-cta/45 hover:bg-cf-page"
                              : "rounded-lg border border-cf-border bg-cf-surface-muted px-4 py-2.5 text-sm text-cf-ink shadow-sm transition-colors duration-200 hover:border-cf-accent/40 hover:bg-cf-page"
                          }
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
                        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-cf-muted" />
                        <span
                          className="inline-block h-1 w-1 animate-pulse rounded-full bg-cf-muted"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="inline-block h-1 w-1 animate-pulse rounded-full bg-cf-muted"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-cf-border bg-cf-surface py-3">
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div
                    className={
                      isEmbed
                        ? "flex items-end gap-2 rounded-xl border border-cf-border bg-cf-input px-3 py-2 shadow-sm transition-shadow duration-200 focus-within:border-cf-brand-cta/50 focus-within:bg-cf-surface-muted focus-within:ring-1 focus-within:ring-cf-brand-cta/25"
                        : "flex items-end gap-2 rounded-xl border border-cf-border bg-cf-input px-3 py-2 shadow-sm transition-shadow duration-200 focus-within:border-cf-accent/45 focus-within:bg-cf-surface-muted focus-within:ring-1 focus-within:ring-cf-accent/25"
                    }
                  >
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
                      className="max-h-40 min-h-[44px] w-full resize-none bg-transparent py-2.5 text-[15px] leading-snug text-cf-ink placeholder:text-cf-muted/80 focus:outline-none disabled:opacity-50"
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
                          ? "mb-1 rounded-lg bg-red-100 p-2 text-red-700 ring-1 ring-red-300/80 shadow-sm transition-all duration-200 hover:bg-red-200/90 dark:bg-red-950/60 dark:text-red-400 dark:ring-red-500/40 dark:hover:bg-red-950/80"
                            : dictationStatus === "transcribing"
                            ? "mb-1 rounded-lg bg-amber-50 p-2 text-amber-800 ring-1 ring-amber-200/90 shadow-sm dark:bg-transparent dark:p-2 dark:text-amber-400/95 dark:ring-amber-500/35"
                            : "mb-1 rounded-lg p-2 text-cf-muted shadow-sm transition-all duration-200 hover:bg-black/[0.05] hover:text-cf-ink hover:shadow dark:hover:bg-white/5 disabled:opacity-50"
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
                      disabled={
                        isLoading || !input.trim() || isDictating
                      }
                      className={
                        isEmbed
                          ? "mb-1 rounded-lg bg-cf-brand-cta p-2 text-white shadow-sm transition-all duration-200 enabled:hover:-translate-y-px enabled:hover:bg-cf-brand-cta-hover enabled:hover:shadow-md active:translate-y-0 active:shadow-sm disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-cf-border dark:disabled:text-cf-muted"
                          : "mb-1 rounded-lg bg-cf-accent p-2 text-white shadow-sm transition-all duration-200 enabled:hover:-translate-y-px enabled:hover:bg-cf-accent-hover enabled:hover:shadow-md active:translate-y-0 active:shadow-sm disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-cf-border dark:disabled:text-cf-muted"
                      }
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
                    <p className="text-center text-xs text-red-600 dark:text-red-400">
                      {dictationError}
                    </p>
                  )}
                  <p className="text-center text-xs text-cf-muted">
                    {s.notLegal}
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function Message({ message: m }: { message: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div className="msg-in flex justify-end">
        <div className="max-w-[85%] rounded-lg border border-cf-border bg-cf-surface-muted px-4 py-2.5 shadow-sm">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-cf-ink">
            {m.content}
          </p>
        </div>
      </div>
    );
  }

  if (m.isError) {
    return (
      <div className="msg-in">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-red-600 dark:text-red-400">
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
