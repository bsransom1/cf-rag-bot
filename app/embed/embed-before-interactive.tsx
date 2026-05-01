import Script from "next/script";

/**
 * Runs before first paint inside the iframe so `body`/`html` never flash
 * Tailwind `--cf-page` (cream or near-black in html.dark mode).
 */
const EMBED_PAGE_BG_SCRIPT = `(function(){var M="cf-embed-root";function p(){var h=document.documentElement,b=document.body;if(!h)return;h.classList.add(M);h.style.setProperty("background-color","transparent","important");h.style.setProperty("background","transparent","important");if(!b)return;b.style.setProperty("background-color","transparent","important");b.style.setProperty("background","transparent","important");}if(document.body)p();else document.addEventListener("DOMContentLoaded",p,{once:!0});})();`;

export function EmbedTransparentBeforeInteractive() {
  return (
    <Script id="cf-embed-transparent-paint" strategy="beforeInteractive">
      {EMBED_PAGE_BG_SCRIPT}
    </Script>
  );
}
