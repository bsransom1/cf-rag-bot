# CodiceFiscale.ai RAG Chatbot

A production-quality, modular RAG (retrieval-augmented generation) chatbot answering questions about the Italian **codice fiscale**. Built with Next.js (App Router), TypeScript, TailwindCSS, Supabase (Postgres + pgvector), and the OpenAI API. Designed to be demo-ready and deployable to Vercel.

> ⚖️ **Legal notice.** The knowledge base is sourced from Studio Legale Metta and other public Italian sources. The chatbot is explicitly instructed **not to provide legal advice**, never to speculate, and to recommend consulting a licensed Italian professional when appropriate.

---

## 1. Overview

```
┌─────────────┐   POST /api/chat    ┌────────────────────┐   embed + search    ┌───────────────┐
│  Chat UI    │ ──────────────────▶ │  Next.js API Route │ ──────────────────▶ │  Supabase     │
│ (app/page)  │ ◀────────────────── │  (RAG orchestrator)│ ◀────────────────── │  pgvector     │
└─────────────┘   { response,       └─────────┬──────────┘                     └───────────────┘
    │               sources }                  │
    │ Web Speech API                           │ grounded prompt
    │ (mic → text, client-only)                ▼
    ▼                                  ┌───────────────┐
                                       │   OpenAI      │
                                       │ chat + embed  │
                                       └───────────────┘
```

Key design principles:

- **One chunk = one Q&A pair.** We never dump the full FAQ into the prompt. Each FAQ entry becomes one row with its own embedding.
- **Grounded only.** The system prompt forces the model to answer from retrieved context or say "I don't know." No retrieval hits ⇒ no LLM call, just the fallback string.
- **Gated categories.** Business / advertising content (Section 1.6 of the KB) is only surfaced when the user's query signals intent (e.g., mentions "advertise", "partnership", etc.). Configured in `lib/config/project.ts`.
- **Multi-project ready.** Everything is keyed by `project_id`. To add a second KB, add one entry to `PROJECTS` in `lib/config/project.ts` and a new FAQ JSON file.
- **Two Supabase clients.** Runtime uses the anon key; the ingest script uses the service-role key. The table has RLS enabled with no direct read/write policies — reads happen via the `match_documents` RPC (SECURITY DEFINER).
- **Speech-to-text** uses the **browser Web Speech API** (`lib/speech/`) — no extra npm packages, no server audio, no API keys. Dictation runs entirely in the client after the user grants microphone permission.

---

## 2. Project structure

```
app/
  api/chat/route.ts     # POST /api/chat — RAG orchestrator
  layout.tsx
  page.tsx              # Chat UI shell
  globals.css           # Theme tokens + message / typing animations
components/
  ChatWindow.tsx        # Client chat UI (composer, mic, messages)
lib/
  ai/
    client.ts           # OpenAI client + model constants
    prompt.ts           # Prompt assembly
  rag/
    embed.ts            # Embedding + chunk text builder
    retrieve.ts         # Vector search + category gating
  db/
    client.ts           # Supabase clients (runtime + admin)
  config/
    project.ts          # Per-project config registry
  speech/
    getSpeechRecognition.ts  # Feature-detect + construct recognition
    useSpeechToText.ts       # React hook (start/stop, interim + final)
    web-speech.d.ts          # TS declarations for SpeechRecognition
data/
  italian_immigration.faq.json   # Source FAQ data
scripts/
  ingest.ts             # `npm run ingest`
supabase/
  schema.sql            # DB schema + match_documents(jsonb) RPC
types/
  index.ts              # Shared TS types
.env.example
README.md
```

---

## 3. Setup

### 3.1 Prerequisites

- Node.js **20+**
- An OpenAI API key with access to `text-embedding-3-small` and `gpt-4o-mini`
- A Supabase project (free tier is fine)

### 3.2 Install

```bash
npm install
cp .env.example .env.local
# fill in OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 3.3 Supabase schema

Open the Supabase SQL editor and run the contents of [`supabase/schema.sql`](./supabase/schema.sql). It:

- Enables the `vector` extension.
- Creates `public.documents` with a `vector(1536)` column and an IVFFlat cosine index.
- Enables RLS on the table with **no** direct-access policies.
- Creates the `match_documents` RPC (`SECURITY DEFINER`, **`p_match_args jsonb`**) for cosine similarity search with an optional project filter and similarity floor.

### 3.4 Ingest the knowledge base

```bash
npm run ingest
```

This loads `data/italian_immigration.faq.json`, embeds each Q&A pair, clears any existing rows for that `project_id`, and inserts fresh rows. Re-run whenever the FAQ JSON changes.

Ingest a specific project:

```bash
npm run ingest -- <project_id>
```

### 3.5 Run locally

```bash
npm run dev
# open http://localhost:3000
```

---

## 4. Supabase schema (reference)

The canonical SQL (including a one-time drop of legacy `match_documents` overloads) is in [`supabase/schema.sql`](./supabase/schema.sql). **Run that file as-is** in the SQL editor.

Important: `match_documents` is defined as **`match_documents(p_match_args jsonb)`** so PostgREST always resolves a single RPC signature. The function uses **`set search_path = public, extensions`** so the `vector` type resolves on Supabase.

If you previously ran an older schema, re-running [`supabase/schema.sql`](./supabase/schema.sql) will drop conflicting `public.match_documents(...)` overloads and recreate the table/indexes/RPC.

---

## 5. API contract

### `POST /api/chat`

**Request**

```json
{
  "project_id": "italian_immigration",
  "message": "How do I apply from the US?"
}
```

**Response — 200**

```json
{
  "response": "Answer:\n...\n\nSimplified:\n...",
  "sources": [
    {
      "id": "uuid",
      "section": "1.3",
      "category": "acquisition",
      "question": "How do I get an official codice fiscale?",
      "similarity": 0.8421
    }
  ]
}
```

**Response — 400** (validation error)

```json
{ "error": "message is required and must be a non-empty string" }
```

**Response — 500** (server error)

```json
{ "error": "Internal server error" }
```

Behavior notes:

- If retrieval returns no chunks, the route returns the project's fallback string with `sources: []` — **no LLM call is made**.
- Model output uses `temperature: 0.2`.
- Maximum message length is 2000 chars.

---

## 6. Speech-to-text (dictation)

The chat composer includes a **microphone** control that turns speech into text using the **Web Speech API** (see `lib/speech/`).

| Topic | Detail |
| ----- | ------ |
| **Dependencies** | None — no Whisper, no third-party STT SDK in this repo |
| **Where it runs** | 100% in the user's browser |
| **Configuration** | Default language is `en-US` in `useSpeechToText` (change `lang` in `ChatWindow.tsx` or pass from config later) |
| **HTTPS** | Microphone access requires a **secure context** (`https://` or `http://localhost`) |
| **Browsers** | **Chrome / Edge:** best support. **Safari:** partial. **Firefox:** often limited or behind flags |
| **Privacy** | Audio is processed by the browser/OS speech service, not by your Next.js server |

**UX:** Click the mic to start; speak; interim text appears in the field; finalized phrases are appended. Click again while listening to stop. If the browser blocks the mic, an inline error message is shown.

To **swap** for a hosted STT API later, replace `useSpeechToText` with a hook that streams audio to your provider — the rest of the chat flow is unchanged.

---

## 7. Frontend (chat UI)

- **Layout:** Minimal chat on a soft gray page (`neutral-100`); the whole thread + composer lives in a **floating** white panel (`rounded-2xl`, light border, soft shadow, capped height) so it reads as one component, not a full-bleed app.
- **Motion:** Short **fade-up** on new messages (`app/globals.css`); respects `prefers-reduced-motion`.
- **Composer:** Single rounded field (neutral border), mic (when supported) + send; one-line legal disclaimer.

---

## 8. Deployment (Vercel)

1. Push this repo to GitHub.
2. Import into Vercel.
3. Set the following environment variables in **Project Settings → Environment Variables**:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — *only needed if you run ingest from CI; not required at runtime for `/api/chat`*
4. Deploy over **HTTPS** so dictation can request the microphone.
5. From your local machine (with `.env.local` populated), run `npm run ingest` against the production Supabase project to populate the knowledge base.

The `/api/chat` route uses the Node runtime and only uses `fetch` + the OpenAI + Supabase SDKs, so it runs unmodified on Vercel serverless. `maxDuration` is set to 30 seconds.

---

## 9. How to extend

### 9.1 Add FAQ entries

1. Edit `data/italian_immigration.faq.json`. Each entry:

   ```json
   {
     "question": "...",
     "answer": "...",
     "plain_english": "...",
     "section": "1.x",
     "category": "...",
     "tags": ["..."]
   }
   ```

   `plain_english` is optional. `tags` must be an array (possibly empty).

2. Re-run ingest: `npm run ingest`. The script wipes existing rows for that project and re-inserts them.

### 9.2 Adjust the prompt or behavior

All prompt rules and retrieval knobs live in `lib/config/project.ts`:

- `systemPrompt` — the rules, tone, and output format.
- `retrieval.topK` — how many chunks to retrieve.
- `retrieval.minSimilarity` — cosine similarity floor (0..1). Default `0` favors recall.
- `gatedCategories` + `gatedCategoryIntentTokens` — hide categories unless the user's query contains one of the listed tokens.

### 9.3 Add a new project (different knowledge base)

1. Create `data/<project>.faq.json`.
2. Add an entry to `PROJECTS` in `lib/config/project.ts` with a fresh `id`, a new `faqDataPath`, and a tailored `systemPrompt`.
3. Ingest: `npm run ingest -- <project>`.
4. Pass that `project_id` from your UI / API consumer.

### 9.4 Swap embedding or chat models

Change `EMBEDDING_MODEL` and/or `CHAT_MODEL` in `lib/ai/client.ts`. If the embedding model has a different dimensionality, update the `vector(1536)` column in `supabase/schema.sql` accordingly and re-ingest.

### 9.5 Change dictation language

In `components/ChatWindow.tsx`, the `useSpeechToText({ lang: "en-US", ... })` option accepts any BCP 47 tag supported by the browser (e.g. `it-IT`).

---

## 10. Scripts

| Command              | Description                             |
| -------------------- | --------------------------------------- |
| `npm run dev`        | Next.js dev server on :3000             |
| `npm run build`      | Production build                        |
| `npm run start`      | Serve production build                  |
| `npm run typecheck`  | `tsc --noEmit`                          |
| `npm run ingest`     | Embed FAQ and upsert into Supabase      |

---

## 11. Safety checklist

- [x] System prompt forbids legal advice and speculation.
- [x] No-retrieval path returns a deterministic fallback (no LLM call).
- [x] Service-role key never shipped to the client bundle (only used in `scripts/ingest.ts`).
- [x] RLS enabled; anon role can only call `match_documents`.
- [x] Message length is capped server-side.
- [x] Sources are returned with every answer for auditability.
- [x] Dictation is client-only; no audio is sent to your API.
