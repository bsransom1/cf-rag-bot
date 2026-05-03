/**
 * Embedding helpers.
 *
 * Kept small on purpose — ingestion and retrieval both need consistent
 * embedding behavior, so we funnel everything through these two functions.
 */

import { EMBEDDING_MODEL, getOpenAI } from "@/lib/ai/client";
import type { FaqEntry } from "@/types";

/**
 * Build the canonical text we embed for a single FAQ entry.
 *
 * One chunk == one Q&A pair. We intentionally do NOT merge entries or create
 * oversized blobs; keeping chunks narrow sharpens retrieval.
 */
export function buildEmbeddingText(entry: FaqEntry): string {
  const parts: string[] = [
    `Question: ${entry.question.trim()}`,
    `Answer: ${entry.answer.trim()}`,
  ];
  if (entry.plain_english && entry.plain_english.trim().length > 0) {
    parts.push(`Plain English: ${entry.plain_english.trim()}`);
  }
  if (entry.tags.length > 0) {
    parts.push(`Keywords: ${entry.tags.join(", ")}`);
  }
  return parts.join("\n\n");
}

/** Embed a single string. Returns a 1536-dim vector. */
export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Batch-embed an array of strings. OpenAI accepts up to a few thousand inputs
 * per request; we stay well under that with a small dataset but the batching
 * makes ingest scale gracefully.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
