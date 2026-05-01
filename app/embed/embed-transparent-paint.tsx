"use client";

import { useLayoutEffect } from "react";

/**
 * Tailwind `@apply bg-cf-page` on `body` and stylesheet order can still paint in
 * the iframe. Re-affirm transparency as soon as React hydrates (covers edge
 * cases where the SSR inline script raced the theme initializer).
 */
const HTML_EMBED_MARKER = "cf-embed-root";

export function EmbedTransparentPaint() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add(HTML_EMBED_MARKER);
    html.style.setProperty("background-color", "transparent", "important");
    html.style.setProperty("background", "transparent", "important");
    body.style.setProperty("background-color", "transparent", "important");
    body.style.setProperty("background", "transparent", "important");

    return () => {
      html.classList.remove(HTML_EMBED_MARKER);
      html.style.removeProperty("background-color");
      html.style.removeProperty("background");
      body.style.removeProperty("background-color");
      body.style.removeProperty("background");
    };
  }, []);

  return null;
}
