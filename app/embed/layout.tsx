import { EmbedTransparentPaint } from "./embed-transparent-paint";

/**
 * Inline script runs synchronously during HTML parse — before Tailwind's
 * `body { background-color: var(--cf-page) }` is applied from the stylesheet.
 * `strategy="beforeInteractive"` is root-layout-only in Next.js App Router, so
 * we use a plain <script> tag here instead.
 */
const TRANSPARENT_SCRIPT = `(function(){
  var h=document.documentElement,b=document.body;
  function pin(){
    h.classList.add("cf-embed-root");
    h.style.setProperty("background","transparent","important");
    h.style.setProperty("background-color","transparent","important");
    if(b){
      b.style.setProperty("background","transparent","important");
      b.style.setProperty("background-color","transparent","important");
    }
  }
  pin();
  // re-run after body exists if needed
  if(!b){document.addEventListener("DOMContentLoaded",function(){b=document.body;pin();},{once:true});}
})();`;

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script dangerouslySetInnerHTML={{ __html: TRANSPARENT_SCRIPT }} />
      <style>{`
        html, html.dark, html.cf-embed-root, html.cf-embed-root.dark {
          background: transparent !important;
          background-color: transparent !important;
        }
        html body, html.dark body, html.cf-embed-root body {
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
