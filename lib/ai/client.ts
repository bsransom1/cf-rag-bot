/**
 * OpenAI client + model constants.
 *
 * Centralizing the client lets us swap providers or change models in one
 * place later without touching the RAG or API code.
 */

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Set it in your .env file (see .env.example).",
    );
  }
  client = new OpenAI({ apiKey });
  return client;
}

/** Embedding model — 1536 dims. Must match the `vector(1536)` column. */
export const EMBEDDING_MODEL = "text-embedding-3-small";

/** Chat model used for the final answer. */
export const CHAT_MODEL = "gpt-4o-mini";
