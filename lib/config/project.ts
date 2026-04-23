/**
 * Per-project configuration.
 *
 * The app is designed to support multiple RAG "projects" keyed by `project_id`.
 * To add a new one, add an entry to `PROJECTS` below. Everything else
 * (ingestion, retrieval, prompt) reads from this registry — no other code
 * should need to change.
 */

export interface ProjectConfig {
  /** Stable slug stored in the DB and sent in API requests. */
  id: string;
  /** Human-friendly name for logs / UI. */
  name: string;
  /** Path (relative to repo root) to the FAQ JSON file used by the ingest script. */
  faqDataPath: string;
  /** System prompt applied to every request. */
  systemPrompt: string;
  /** Message returned verbatim when retrieval yields nothing useful. */
  fallbackNoKnowledge: string;
  /** Retrieval tuning knobs. */
  retrieval: {
    /** Top-K chunks to return from vector search. */
    topK: number;
    /** Minimum cosine similarity (0..1) required for a chunk to be used. */
    minSimilarity: number;
  };
  /** Categories that should only be surfaced on explicit intent match. */
  gatedCategories?: string[];
  /** If the user query matches any of these tokens, gated categories are allowed. */
  gatedCategoryIntentTokens?: string[];
}

const ITALIAN_IMMIGRATION_SYSTEM_PROMPT = `You are the CodiceFiscale.ai assistant — a helpful bot that answers questions about the Italian codice fiscale.

Strict rules you MUST follow:
1. Use ONLY the information in the provided "Context" block to answer. Do not use outside knowledge.
2. If the answer is not in the context, reply: "I don't know based on the information I have. For your situation I'd recommend consulting a licensed Italian professional."
3. Never provide legal advice. When a question is fact-specific, edge-case, or jurisdictionally sensitive, recommend consulting a licensed Italian lawyer or accountant (for example, Studio Legale Metta).
4. Do not speculate, invent procedures, or guess at Italian legal or bureaucratic processes.
5. Keep a professional, neutral tone.

Response format — ALWAYS use this structure:

Answer:
<a clear, direct answer grounded in the context>

Simplified:
<optional plain-English restatement, only if it adds real clarity; otherwise omit this section entirely>

If you are recommending professional help, include that guidance inside the "Answer" section.`;

export const PROJECTS: Record<string, ProjectConfig> = {
  italian_immigration: {
    id: "italian_immigration",
    name: "CodiceFiscale.ai — Italian Immigration",
    faqDataPath: "data/italian_immigration.faq.json",
    systemPrompt: ITALIAN_IMMIGRATION_SYSTEM_PROMPT,
    fallbackNoKnowledge:
      "I don't have information on that in my knowledge base. For your situation I'd recommend consulting a licensed Italian professional.",
    retrieval: {
      topK: 3,
      /** Keep at 0 for strong recall; raise only if you see noisy unrelated chunks. */
      minSimilarity: 0,
    },
    gatedCategories: ["business"],
    // Avoid overly broad tokens (e.g. "contact") so routine questions do not
    // pull advertising context into the candidate set.
    gatedCategoryIntentTokens: [
      "advertis",
      "partner",
      "sponsor",
      "banner",
      "placement",
      "marketing",
      "collaborat",
      "business",
    ],
  },
};

export function getProject(projectId: string): ProjectConfig {
  const project = PROJECTS[projectId];
  if (!project) {
    throw new Error(`Unknown project_id: ${projectId}`);
  }
  return project;
}
