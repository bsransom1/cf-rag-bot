"use client";

import { useEffect, useState } from "react";

/** Production origin for /embed. Never point this at cf-rag-bot-mem2.vercel.app. */
const EMBED_SRC = "https://cf-rag-bot.vercel.app/embed";

/**
 * Drop-in for the CodiceFiscale.ai site layout.
 * Matches the live ChatbotEmbed sizing; only the iframe src is the production host.
 */
export function ChatbotEmbed() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; open?: boolean } | null;
      if (data && data.type === "CF_EMBED_RESIZE") setOpen(!!data.open);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      id="cf-chat-embed"
      src={EMBED_SRC}
      title="CodiceFiscale.ai Assistant"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="microphone"
      style={{
        background: "var(--surface)",
        position: "fixed",
        right: "max(20px, env(safe-area-inset-right))",
        bottom: "max(20px, env(safe-area-inset-bottom))",
        zIndex: 999999,
        overflow: "hidden",
        transition:
          "width 200ms ease, height 200ms ease, border-radius 200ms ease, box-shadow 200ms ease",
        ...(open
          ? {
              width: "min(380px, calc(100vw - 32px))",
              height: "min(620px, calc(100dvh - 32px))",
              borderRadius: "8px",
              boxShadow:
                "0 12px 32px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15, 23, 42, 0.05)",
              border: "1px solid var(--line)",
            }
          : {
              width: "60px",
              height: "60px",
              borderRadius: "9999px",
              boxShadow:
                "0 6px 16px rgba(15, 23, 42, 0.12), 0 2px 4px rgba(15, 23, 42, 0.06)",
              border: "1px solid var(--line)",
            }),
      }}
    />
  );
}
