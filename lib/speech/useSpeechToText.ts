"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createSpeechRecognition, isSpeechRecognitionSupported } from "./getSpeechRecognition";

export interface UseSpeechToTextOptions {
  /** BCP 47 language tag, e.g. `en-US`, `it-IT`. */
  lang?: string;
  /** Fired for non-final hypotheses while the user is speaking. */
  onInterim?: (text: string) => void;
  /** Fired for each finalized phrase segment. */
  onFinal: (text: string) => void;
  onEnd?: () => void;
  /** Human-readable error (e.g. permission denied). */
  onError?: (message: string) => void;
}

/**
 * Lightweight dictation hook around the browser SpeechRecognition API.
 * Start/stop are idempotent; recognition is cleaned up on unmount.
 */
export function useSpeechToText(options: UseSpeechToTextOptions) {
  const optsRef = useRef(options);
  optsRef.current = options;

  const recRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const supported = isSpeechRecognitionSupported();

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      const msg = "Speech recognition is not supported in this browser.";
      setLastError(msg);
      optsRef.current.onError?.(msg);
      return;
    }

    stop();

    const rec = createSpeechRecognition();
    if (!rec) {
      const msg = "Could not start speech recognition.";
      setLastError(msg);
      optsRef.current.onError?.(msg);
      return;
    }

    rec.lang = optsRef.current.lang ?? "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      // Full non-final snapshot (current hypothesis for this utterance).
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) interim += result[0]?.transcript ?? "";
      }
      if (interim) optsRef.current.onInterim?.(interim);

      // Only *new* finals in this event (avoid duplicate appends).
      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) newFinal += result[0]?.transcript ?? "";
      }
      const trimmed = newFinal.trim();
      if (trimmed) optsRef.current.onFinal(trimmed);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg =
        event.error === "not-allowed"
          ? "Microphone permission denied."
          : event.error === "no-speech"
            ? "No speech detected."
            : `Speech recognition: ${event.error}`;
      setLastError(msg);
      optsRef.current.onError?.(msg);
      setListening(false);
      recRef.current = null;
    };

    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      optsRef.current.onEnd?.();
    };

    recRef.current = rec;
    setLastError(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      const msg = "Could not start microphone.";
      setLastError(msg);
      optsRef.current.onError?.(msg);
      setListening(false);
      recRef.current = null;
    }
  }, [stop, supported]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    supported,
    listening,
    lastError,
    start,
    stop,
    toggle,
  };
}
