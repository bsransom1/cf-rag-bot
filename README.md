# CodiceFiscale.ai RAG Chatbot

A production-quality, modular RAG (retrieval-augmented generation) chatbot answering questions about the Italian **codice fiscale**. Built with Next.js (App Router), TypeScript, TailwindCSS, Supabase (Postgres + pgvector), and the OpenAI API. Designed to be demo-ready and deployable to Vercel.

> ⚖️ **Legal notice.** The knowledge base is sourced from Studio Legale Metta and other public Italian sources. The chatbot is explicitly instructed **not to provide legal advice**, never to speculate, and to recommend consulting a licensed Italian professional when appropriate.

---

## 1. Overview

```
┌─────────────┐  POST /api/dictation       ┌──────────────┐
│  Chat UI    │ ──▶ audio Blob (FormData) ─▶│  OpenAI      │
│ (app/page)  │  ◀─ transcript text     ◀──│  Whisper     │
└──────┬──────┘                            └──────────────┘
       │  POST /api/chat
       ▼
┌────────────────────┐   embed + search    ┌───────────────┐
│  Next.js API Route │ ──────────────────▶ │  Supabase     │
│  (RAG orchestrator)│ ◀────────────────── │  pgvector     │
└─────────┬──────────┘                     └───────────────┘
          │ grounded prompt
          ▼
┌───────────────┐
│   OpenAI      │
│ chat + embed  │
└───────────────┘
```

Key design principles:

- **One chunk = one Q&A pair.** We never dump the full FAQ into the prompt. Each FAQ entry becomes one row with its own embedding.
- **Grounded only.** The system prompt forces the model to answer from retrieved context or say "I don't know." No retrieval hits ⇒ no LLM call, just the fallback string.
- **Gated categories.** Business / advertising content (Section 1.6 of the KB) is only surfaced when the user's query signals intent (e.g., mentions "advertise", "partnership", etc.). Configured in `lib/config/project.ts`.
- **Simplified section gating.** A plain-English "Simplified:" block is only included when the user's message matches intent tokens (e.g. "clarify", "I don't understand"). See `simplifyIntentTokens` and `userWantsSimplifiedSection` in the project config and `lib/rag/simplifyIntent.ts`.
- **Multi-project ready.** Everything is keyed by `project_id`. To add a second KB, add one entry to `PROJECTS` in `lib/config/project.ts` and a new FAQ JSON file.
- **Two Supabase clients.** Runtime uses the anon key; the ingest script uses the service-role key. The table has RLS enabled with no direct read/write policies — reads happen via the `match_documents` RPC (SECURITY DEFINER).
- **Speech-to-text** uses **OpenAI Whisper** (`whisper-1`) with **automatic language detection** (English + Italian). The browser records audio with `MediaRecorder` + `getUserMedia` and POSTs the Blob as multipart `FormData` to `POST /api/dictation`, which forwards it to OpenAI and returns the transcript. The client then submits it like a typed message.

---

## 2. Project structure

```
app/
  api/
    chat/route.ts       # POST /api/chat — RAG orchestrator
    dictation/route.ts  # POST /api/dictation — OpenAI Whisper transcription
  layout.tsx
  page.tsx              # Chat UI shell
  globals.css           # Theme tokens + message / typing animations
components/
  ChatWindow.tsx            # Client chat UI (EN/IT, mic, composer)
  FormattedAssistantText.tsx # Markdown rendering for assistant replies
lib/
  ai/
    client.ts           # OpenAI client + model constants
    prompt.ts           # Prompt assembly
  chat/
    assistantMessageMarkdown.ts  # Answer:/Simplified: → Markdown for the UI
  rag/
    embed.ts            # Embedding + chunk text builder
    retrieve.ts         # Vector search + category gating
  db/
    client.ts           # Supabase clients (runtime + admin)
  config/
    project.ts          # Per-project config registry
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
# fill in OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# and NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (same URL + anon as above)
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

### Chat transcripts & dashboard (first-time)

1. Re-run or append the **`chat_*`** / **`dashboard_users`** section from [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor.
2. In **Authentication → URL configuration**, set **Site URL** to your production origin and add **`https://<your-domain>/auth/callback`** to **Redirect URLs**.
3. Create a dashboard user (invite by email or sign up), then allowlist them:
   `insert into public.dashboard_users (user_id) values ('<uuid-from-auth.users>');`
4. Set **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (same as `SUPABASE_URL` / `SUPABASE_ANON_KEY`) so `/login` and `/dashboard` work.
5. Open **`/dashboard`** (internal reviewers only; not linked from the public chat).

---

## 5. API contract

### `POST /api/chat`

**Request**

```json
{
  "project_id": "italian_immigration",
  "message": "How do I apply from the US?",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "lang": "en",
  "client_message_id": "optional-uuid-for-logging-dedup"
}
```

`session_id` is required: a UUID generated once per browser thread (`localStorage`, keyed by `project_id`). `client_message_id` is optional metadata stored on the user row.

`lang` is optional (`"en"` | `"it"`). When sent (as in the web UI), the assistant answers in that language even if the user typed or dictated in another language.

**Transcript logging:** when `SUPABASE_SERVICE_ROLE_KEY` is set and the chat tables from `supabase/schema.sql` exist, each turn is written to `chat_sessions` / `chat_messages` using the service-role client. Logging failures are suppressed so the widget still replies; check server logs if transcripts are empty.

**Response — 200**

```json
{
  "response": "Answer:\n..."
}
```

When the user message matches `simplifyIntentTokens` in `lib/config/project.ts`, the model may also include a `Simplified:` block in the `response` string; otherwise the API instructs the model to return only the `Answer:` section.

**Response — 400** (validation error)

```json
{ "error": "message is required and must be a non-empty string" }
```

**Response — 500** (server error)

```json
{ "error": "Internal server error" }
```

Behavior notes:

- If retrieval returns no chunks, the route returns the project's fallback string only — **no LLM call is made**.
- Model output uses `temperature: 0.2`.
- Maximum message length is 2000 chars.

### `POST /api/dictation`

**Request:** `multipart/form-data`

| Field | Type | Notes |
| ----- | ---- | ----- |
| `audio` | `Blob` / `File` | Recorded audio (e.g. `audio/webm;codecs=opus`). Required. |

**Response — 200**

```json
{ "transcript": "transcript text" }
```

**Response — 400** if the multipart body is missing or `audio` is empty.
**Response — 502** if the OpenAI Whisper call fails.

**Environment:** uses `OPENAI_API_KEY` (already required by `/api/chat`). No additional env vars.

**Runtime:** Node.js. The route forwards the audio to OpenAI's transcription endpoint (`https://api.openai.com/v1/audio/transcriptions`) using the `whisper-1` model with **no `language` field**, so English and Italian are auto-detected.

---

## 6. Speech-to-text (dictation)

The composer **microphone** records audio in the browser using `MediaRecorder` + `getUserMedia`, then POSTs the Blob to **`/api/dictation`**, which forwards it to **OpenAI Whisper** and returns the transcript.

| Topic | Detail |
| ----- | ------ |
| **Stack** | Native `MediaRecorder` + `getUserMedia` on the client → `fetch` to `/api/dictation` → server-side `fetch` to OpenAI Whisper |
| **Auth** | Reuses `OPENAI_API_KEY` (server only) |
| **UX** | Click mic to start recording → click again to stop → server transcribes → transcript is inserted into the input and auto-submitted |
| **Language** | Whisper auto-detects speech language; the UI **EN/IT flag** sets reply language and clears the session when switched |
| **Browser support** | Any browser with `MediaRecorder` + `getUserMedia` (HTTPS or `localhost`) |

### 6.1 Embedded widget (`/embed`) and microphone

Dictation calls `getUserMedia({ audio: true })`. If the chat is shown inside **another site’s `<iframe>`** (for example CodiceFiscale.ai embedding the Vercel `/embed` URL), the **parent page must delegate** the microphone feature to the iframe, or the browser will block access and you will see “Microphone access was blocked.”

**Fix on the host site (CodiceFiscale.ai, WordPress, etc.):** add `allow="microphone"` to the iframe tag:

```html
<iframe
  src="https://YOUR-APP.vercel.app/embed"
  allow="microphone"
  title="CodiceFiscale assistant"
  …
></iframe>
```

Reload the page after saving. Users must still click **Allow** if the browser shows a permission prompt.

**Also check:** the page must be served over **HTTPS** (or `localhost`); mixed content or `http://` embeds cannot use the microphone. Site-wide `Permissions-Policy` headers on the **parent** must not disable `microphone` for that document (for example avoid `Permissions-Policy: microphone=()` on pages that host the widget).

---

## 7. Frontend (chat UI)

- **Layout:** Minimal chat on a soft gray page (`neutral-100`); the whole thread + composer lives in a **floating** white panel (`rounded-2xl`, light border, soft shadow, capped height) so it reads as one component, not a full-bleed app.
- **Motion:** Short **fade-up** on new messages (`app/globals.css`); respects `prefers-reduced-motion`.
- **Composer:** Single rounded field (neutral border), mic + send; placeholders and ARIA follow the selected UI language; one-line legal disclaimer.

---

## 8. Deployment (Vercel)

### 8.1 Prerequisites

- Repo on GitHub (or GitLab / Bitbucket connected to Vercel).
- Supabase project with [`supabase/schema.sql`](./supabase/schema.sql) applied.
- FAQ rows loaded: run `npm run ingest` **locally** (or in CI) using `SUPABASE_SERVICE_ROLE_KEY` pointed at the **same** Supabase project Vercel will use. **Production** also needs this key if you want `/api/chat` to **persist transcripts** (server-side only — never expose it to the browser).

### 8.2 New project on Vercel

1. **Import** the repository in the [Vercel dashboard](https://vercel.com/new).
2. **Framework preset:** Next.js (auto-detected). Root directory: **`.`**  
   Build: `npm run build` · Output: Next.js default · Install: `npm install`.
3. **Environment variables** — add for **Production** (and **Preview** if you want preview deployments to work):

   | Name | Required at runtime | Notes |
   |------|---------------------|--------|
   | `OPENAI_API_KEY` | Yes | Server only; never expose to the client. |
   | `SUPABASE_URL` | Yes | Same project you ingested into. |
   | `SUPABASE_ANON_KEY` | Yes | Used by `/api/chat` for `match_documents`. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Yes* | *Required for **transcript logging** and for `npm run ingest`. Server only. |
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes* | *Same value as `SUPABASE_URL` — used by `/login` and `/dashboard` (Supabase Auth). |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes* | *Same value as `SUPABASE_ANON_KEY`. Safe for the browser. |

4. **Deploy.** The site is served over **HTTPS**, which is required for browser microphone access. Dictation calls `/api/dictation`, which forwards audio to OpenAI Whisper using `OPENAI_API_KEY` — no extra configuration is needed.

### 8.3 After the first deploy

- Open the production URL and send a test message. If answers always fall back to “no information,” confirm **`documents`** in Supabase has rows and `SUPABASE_*` values match that project.
- **Hobby** plan serverless routes are capped at **~10s** execution; `app/api/chat/route.ts` sets `maxDuration = 30` for **Pro**. If you see timeouts on Hobby, upgrade or shorten the model path.

### 8.4 Technical notes

- `/api/chat` uses the **Node.js** runtime (`export const runtime = "nodejs"`).
- No Edge-only APIs; OpenAI and Supabase run in Node as usual on Vercel.

### 8.5 Hosted chat or dictation returns an error (most often env)

Vercel does **not** use your laptop’s `.env.local`. You must set **the same three variables** on the Vercel project for **each** environment you use (**Production** and **Preview** are separate—preview deployments and production URLs can differ).

1. **Vercel** → your project → **Settings** → **Environment Variables** → confirm `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and (if you use the dashboard/transcripts) `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for **Production** (and **Preview** if you test on `*.vercel.app` preview URLs). Save, then **Redeploy** (Deployments → ⋮ → Redeploy) so new values apply to running functions.
2. If chat works locally but not on Vercel, 99% of the time a variable is missing, mistyped, or only set for one environment.
3. **Function logs:** Vercel → project → **Logs** (or a specific deployment → **Functions** / **Runtime Logs**). Errors from `/api/chat` and `/api/dictation` are printed there with more detail.
4. **Ingest** runs against your Supabase `documents` table from your machine or CI. If the hosted app returns fallback “no information” for every question, the production Supabase may have no rows for that `project_id`—run `npm run ingest` with keys pointing at the **same** Supabase project you configured in Vercel.

The app does **not** use a separate “Whisper API key.” Dictation and chat both use `OPENAI_API_KEY` (Whisper is `v1/audio/transcriptions` on the same OpenAI account).

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

- `systemPrompt` — the rules and tone; response structure (Answer-only vs Answer+Simplified) is appended in `lib/ai/prompt.ts` from `buildPrompt`.
- `retrieval.topK` — how many chunks to retrieve.
- `retrieval.minSimilarity` — cosine similarity floor (0..1). Default `0` favors recall.
- `gatedCategories` + `gatedCategoryIntentTokens` — hide categories unless the user's query contains one of the listed tokens.
- `simplifyIntentTokens` — if the user's message matches any token, the model may include a `Simplified:` section; otherwise only `Answer:` is requested.

### 9.3 Add a new project (different knowledge base)

1. Create `data/<project>.faq.json`.
2. Add an entry to `PROJECTS` in `lib/config/project.ts` with a fresh `id`, a new `faqDataPath`, and a tailored `systemPrompt`.
3. Ingest: `npm run ingest -- <project>`.
4. Pass that `project_id` from your UI / API consumer.

### 9.4 Swap embedding or chat models

Change `EMBEDDING_MODEL` and/or `CHAT_MODEL` in `lib/ai/client.ts`. If the embedding model has a different dimensionality, update the `vector(1536)` column in `supabase/schema.sql` accordingly and re-ingest.

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
- [x] Chat API returns only the answer text; retrieval citations are not exposed to the client.
- [x] Dictation forwards browser-recorded audio to OpenAI Whisper from the server (`/api/dictation`); no browser `SpeechRecognition`, no third-party MCP.
