# CodiceFiscale.ai — assistant embed (handoff)

The live widget on [codicefiscale.ai](https://codicefiscale.ai/) is a `ChatbotEmbed` in the site layout. The assistant itself lives on **this** app.

| | |
|---|---|
| **Iframe src (correct)** | `https://cf-rag-bot.vercel.app/embed` |
| **Do not use** | `https://cf-rag-bot-mem2.vercel.app/embed` — that Vercel project is gone (`DEPLOYMENT_NOT_FOUND`) |
| **React drop-in** | [`ChatbotEmbed.tsx`](./ChatbotEmbed.tsx) |

If the iframe still points at `mem2`, the 60×60 circle shows Vercel’s 404 page (`VIEW DOCUMENTATION`) with inner scroll. That is not a CSS bug in this repo.

## Fix on codicefiscale.ai

In `ChatbotEmbed`, change only the iframe `src`:

```diff
- src="https://cf-rag-bot-mem2.vercel.app/embed"
+ src="https://cf-rag-bot.vercel.app/embed"
```

Redeploy the **codicefiscale.ai** site. No env vars or keys belong on that host.

The `CF_EMBED_RESIZE` listener already in the layout does not check `event.origin`, so the URL swap is enough for open/close to keep working.
