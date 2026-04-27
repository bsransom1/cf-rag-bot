/**
 * POST /api/chat
 *
 * RAG flow:
 *   1. Validate body (`project_id` + `message`).
 *   2. Retrieve the top-K relevant FAQ chunks via pgvector.
 *   3. If nothing passes the similarity threshold, short-circuit with the
 *      project's "I don't know" fallback — no LLM call, no hallucination.
 *   4. Otherwise, build the prompt from retrieved context and call the model.
 *   5. Return `{ response }` (citations are not exposed to the client).
 *
 * Runs on Node (default). Uses only fetch / OpenAI SDK / Supabase SDK, so it
 * works unmodified on Vercel serverless.
 */

import { NextResponse } from "next/server";

import { CHAT_MODEL, getOpenAI } from "@/lib/ai/client";
import { buildPrompt } from "@/lib/ai/prompt";
import { getProject } from "@/lib/config/project";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import { userWantsSimplifiedSection } from "@/lib/rag/simplifyIntent";
import type { ChatRequestBody, ChatResponseBody } from "@/types";

export const runtime = "nodejs";
// Chat completions can take a few seconds; bump the default serverless budget.
export const maxDuration = 30;

const MAX_MESSAGE_LENGTH = 2000;

function parseBody(raw: unknown): ChatRequestBody | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Request body must be a JSON object" };
  }
  const body = raw as Record<string, unknown>;
  const projectId = body.project_id;
  const message = body.message;
  const langRaw = body.lang;
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return { error: "project_id is required and must be a non-empty string" };
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    return { error: "message is required and must be a non-empty string" };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      error: `message exceeds max length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }
  const lang =
    langRaw === "en" || langRaw === "it" ? (langRaw as "en" | "it") : undefined;
  return { project_id: projectId.trim(), message: message.trim(), lang };
}

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = parseBody(rawBody);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let project;
  try {
    project = getProject(parsed.project_id);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }

  try {
    const chunks = await retrieveRelevantChunks({
      projectId: project.id,
      query: parsed.message,
    });

    if (chunks.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[/api/chat] retrieval returned 0 chunks — check: (1) `npm run ingest` so `documents` has rows, " +
            "(2) `project_id` in DB matches config, (3) Supabase schema uses match_documents(jsonb) with search_path including extensions.",
        );
      }
      const body: ChatResponseBody = {
        response: project.fallbackNoKnowledge,
      };
      return NextResponse.json(body);
    }

    const wantsSimplified = userWantsSimplifiedSection(project, parsed.message);
    const { system, user } = buildPrompt(
      project.systemPrompt,
      chunks,
      parsed.message,
      { wantsSimplified, lang: parsed.lang },
    );

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ??
      project.fallbackNoKnowledge;

    const body: ChatResponseBody = { response: answer };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[/api/chat] failure:", err);
    return NextResponse.json(
      { error: chatRouteClientMessage(err) },
      { status: chatRouteStatus(err) },
    );
  }
}

function openAiHttpStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  if (!("status" in err)) return undefined;
  const s = (err as { status?: unknown }).status;
  return typeof s === "number" ? s : undefined;
}

function chatRouteStatus(err: unknown): number {
  const http = openAiHttpStatus(err);
  if (http === 401) return 401;
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("Missing required environment") ||
    msg.includes("Missing OPENAI_API_KEY")
  ) {
    return 503;
  }
  if (msg.includes("match_documents RPC failed")) {
    return 502;
  }
  if (msg.includes("401") || msg.toLowerCase().includes("invalid api key")) {
    return 401;
  }
  return 500;
}

/**
 * Keep messages safe for the browser: no stack traces, no secrets.
 * Enough for deployers to fix Vercel env or Supabase without reading logs only.
 */
function chatRouteClientMessage(err: unknown): string {
  const http = openAiHttpStatus(err);
  const msg = err instanceof Error ? err.message : String(err);
  if (http === 401 || msg.toLowerCase().includes("invalid api key")) {
    return (
      "OpenAI rejected the API key. Regenerate the key in the OpenAI dashboard and " +
      "update OPENAI_API_KEY in Vercel, then redeploy."
    );
  }
  if (
    msg.includes("Missing required environment") ||
    msg.includes("Missing OPENAI_API_KEY")
  ) {
    return (
      "Server is missing configuration. In Vercel: Project → Settings → Environment " +
      "Variables, set OPENAI_API_KEY, SUPABASE_URL, and SUPABASE_ANON_KEY for Production " +
      "(and Preview if you use preview URLs), then redeploy."
    );
  }
  if (msg.includes("match_documents RPC failed")) {
    return (
      "Database lookup failed. Confirm SUPABASE_URL and SUPABASE_ANON_KEY match your " +
      "project, the schema in supabase/schema.sql is applied, and `npm run ingest` has " +
      "loaded rows. Check Vercel function logs for the RPC error detail."
    );
  }
  if (process.env.NODE_ENV === "development") {
    return `Internal error (dev): ${msg}`;
  }
  return "Internal server error. Check Vercel function logs for this request.";
}
