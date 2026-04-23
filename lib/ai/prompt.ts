/**
 * Prompt construction.
 *
 * The prompt is assembled from three pieces:
 *   - system prompt (from the project config — rules + output format)
 *   - retrieved context (only the retrieved chunks, never the full FAQ)
 *   - the user's question
 *
 * We deliberately label each context chunk with a stable `[source N]` marker
 * so the model can ground its answer and we can post-hoc verify citations
 * if we ever want to.
 */

import type { RetrievedChunk } from "@/types";

export interface BuiltPrompt {
  system: string;
  user: string;
}

export function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "(no relevant context was retrieved)";
  }
  return chunks
    .map((chunk, i) => {
      const header = `[source ${i + 1} | section ${chunk.section} | category ${chunk.category}]`;
      const plain = chunk.plain_english
        ? `\nPlain English: ${chunk.plain_english}`
        : "";
      return `${header}\nQ: ${chunk.question}\nA: ${chunk.answer}${plain}`;
    })
    .join("\n\n---\n\n");
}

export function buildPrompt(
  systemPrompt: string,
  chunks: RetrievedChunk[],
  userMessage: string,
): BuiltPrompt {
  const context = formatContext(chunks);
  const user = [
    "Context:",
    context,
    "",
    `User question: ${userMessage.trim()}`,
    "",
    "Follow the rules and response format defined in the system message.",
  ].join("\n");

  return { system: systemPrompt, user };
}
