/**
 * Local iframe smoke test: same-origin framing of `/embed`.
 * Visit /embed-preview while `next dev` (or deployed) is running.
 */
export default function EmbedPreviewPage() {
  return (
    <div className="min-h-dvh bg-neutral-200 p-6 font-sans text-neutral-700">
      <p className="mb-4 max-w-xl text-sm">
        Gray area simulates a host page. Green border = iframe containing{" "}
        <code className="rounded bg-white px-1">/embed</code>. Chat should be
        fully interactive inside the frame.
      </p>
      <iframe
        title="Embed preview"
        src="/embed"
        className="rounded-lg border-4 border-emerald-600 shadow-lg"
        style={{
          background: "transparent",
          width: "min(420px, calc(100vw - 3rem))",
          height: "min(640px, calc(100dvh - 8rem))",
        }}
      />
    </div>
  );
}
