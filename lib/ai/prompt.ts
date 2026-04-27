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

/** Appended in `buildPrompt` based on per-turn user intent. */
const FORMATTING_LINE = `Within your Answer, use GitHub-Flavored Markdown: separate clear ideas with a blank line; use **bold** for important terms, *italics* for foreign words or form names, bullet lists for multiple conditions, and \`###\` subheadings when they improve scan-ability. You may use <u>…</u> only for defined terms or very short labels (use sparingly). Do not use a single dense block of text if several shorter paragraphs or a short list is clearer.`;

const RESPONSE_FORMAT_ANSWER_ONLY = `

Response format (mandatory):
Answer:
<clear, direct answer grounded in the context; ${FORMATTING_LINE}>

Do not include a "Simplified:" section, heading, or any second summary — only the Answer section.`;

const RESPONSE_FORMAT_WITH_SIMPLIFIED = `

Response format (mandatory):
Answer:
<clear, direct answer grounded in the context; ${FORMATTING_LINE}>

Simplified:
<short plain-English restatement; use the same Markdown and spacing style when it helps readability>`;

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

function languageDirective(lang: "en" | "it" | undefined): string {
  if (lang === "en") {
    return `\n\nLanguage: Respond in English. If the user's question is in Italian, translate your answer into English. Italian terms of art (e.g. "codice fiscale", "Agenzia delle Entrate", form names) may be kept in italics.`;
  }
  if (lang === "it") {
    return `\n\nLingua: Rispondi in italiano. Se la domanda dell'utente è in inglese, traduci la risposta in italiano. Conserva in italiano i termini ufficiali (es. "codice fiscale", "Agenzia delle Entrate", nomi dei moduli).`;
  }
  return "";
}

export function buildPrompt(
  systemPrompt: string,
  chunks: RetrievedChunk[],
  userMessage: string,
  options: { wantsSimplified: boolean; lang?: "en" | "it" },
): BuiltPrompt {
  const context = formatContext(chunks);
  const format =
    options.wantsSimplified ? RESPONSE_FORMAT_WITH_SIMPLIFIED : RESPONSE_FORMAT_ANSWER_ONLY;
  const system = systemPrompt + format + languageDirective(options.lang);
  const user = [
    "Context:",
    context,
    "",
    `User question: ${userMessage.trim()}`,
    "",
    "Follow the rules and response format defined in the system message.",
  ].join("\n");

  return { system, user };
}
