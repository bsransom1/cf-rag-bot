import { EmbedTransparentPaint } from "./embed-transparent-paint";

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/*
       * `color-scheme: light` on :root makes browsers paint the iframe viewport
       * a non-transparent light color even when html/body backgrounds are
       * transparent. Neutralise it only for the /embed route.
       *
       * `background: transparent` belt + suspenders via class + inline style.
       * The real fix is postMessage-driven iframe resize (ChatWindow sends
       * CF_EMBED_RESIZE so the host collapses the iframe to 72×72 when closed).
       */}
      <style>{`
        :root { color-scheme: none !important; }
        html, html.dark {
          background: transparent !important;
          background-color: transparent !important;
        }
        body {
          background: transparent !important;
          background-color: transparent !important;
        }
      `}</style>
      <EmbedTransparentPaint />
      <div className="box-border h-dvh min-h-0 w-full overflow-hidden overscroll-none">
        {children}
      </div>
    </>
  );
}
