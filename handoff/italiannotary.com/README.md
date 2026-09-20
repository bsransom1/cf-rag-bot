# ItalianNotary.com — assistant embed (handoff)

Drop-in widget for [italiannotary.com](https://italiannotary.com/). The assistant lives on our origin; you only host a small iframe plus a resize listener.

| | |
|---|---|
| **Iframe src** | `https://cf-rag-bot.vercel.app/embed/italian-notary` |
| **Snippet** | [`embed.html`](./embed.html) |
| **Reference implementation** | [`/embed-preview/italian-notary`](../../app/embed-preview/italian-notary/page.tsx) on the bot repo |

You do **not** add OpenAI or Supabase keys on italiannotary.com.

## Install

1. Copy the full contents of [`embed.html`](./embed.html) (iframe **and** script).
2. Paste once before `</body>` on every page that should show the assistant.
3. Deploy on **HTTPS**.

**WordPress:** Appearance → Theme File Editor → `footer.php` before `</body>`, or a footer “Insert Headers and Footers” plugin.

**GTM:** Custom HTML tag, All Pages. If the button is clipped, a parent has `overflow: hidden` — put the snippet on `<body>`, not inside that container.

An iframe without the script stays **72×72px**. The chat panel cannot open.

## Protocol

The iframe `postMessage`s the parent when the user opens or closes the panel:

```ts
{ type: "CF_EMBED_RESIZE", open: boolean }
```

- Ignore messages whose `event.origin` is not `https://cf-rag-bot.vercel.app`.
- `open: true` → about 400×640 (capped to the viewport).
- `open: false` → 72×72 circle (FAB only).

Microphone dictation needs `allow="microphone"` on the iframe. Users still have to Allow the browser prompt. Parent `Permissions-Policy: microphone=()` will block it.

## Verify

1. Load a page with the snippet: 72×72 circular logo, bottom-right.
2. Click it: iframe grows into a chat panel.
3. Close it: iframe shrinks back to the circle.
4. Send “How much does notarization cost?” → **$82** per document.
5. Optional: tap the mic. If you see “blocked inside this embedded chat,” check `allow="microphone"` and the parent Permissions-Policy.

## Out of scope for this site

- API keys, RAG, or knowledge-base updates (those stay on the Vercel app).
- Changing assistant copy or booking URLs (same).
- Styling the chat chrome — only the iframe box on the parent is yours to position (`right` / `bottom` / `z-index`).
