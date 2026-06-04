"use client";

import { useEffect, useRef } from "react";

/**
 * Local smoke test for /embed/italian-notary (ItalianNotary.com host simulation).
 */
export default function ItalianNotaryEmbedPreviewPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data as { type?: string; open?: boolean } | null;
      if (!d || d.type !== "CF_EMBED_RESIZE") return;
      const el = iframeRef.current;
      if (!el) return;
      if (d.open) {
        el.style.width = "min(400px, calc(100vw - 32px))";
        el.style.height = "min(640px, calc(100dvh - 32px))";
        el.style.borderRadius = "16px";
        el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.18)";
      } else {
        el.style.width = "72px";
        el.style.height = "72px";
        el.style.borderRadius = "50%";
        el.style.boxShadow = "none";
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="min-h-dvh bg-neutral-200 p-6 font-sans text-neutral-700">
      <p className="mb-4 max-w-xl text-sm">
        Preview for{" "}
        <a
          href="https://italiannotary.com/"
          className="text-cf-brand-nav underline"
        >
          italiannotary.com
        </a>
        . Embed URL: <code className="rounded bg-white px-1">/embed/italian-notary</code>
      </p>
      <iframe
        ref={iframeRef}
        title="Italian Notary embed preview"
        src="/embed/italian-notary"
        allow="microphone"
        style={{
          border: 0,
          background: "transparent",
          position: "fixed",
          right: "max(16px, env(safe-area-inset-right))",
          bottom: "max(16px, env(safe-area-inset-bottom))",
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          zIndex: 9999,
        }}
      />
    </div>
  );
}
