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
  /**
   * Which Supabase credential bundle backs this project's vector index.
   * Omit or `"default"` → `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   * `SUPABASE_SERVICE_ROLE_KEY`. Any other value uses `SUPABASE_*_<SUFFIX>`
   * (see `lib/db/profiles.ts`). Keeps today's single-DB deploys and `/embed`
   * unchanged when unset.
   */
  databaseProfileId?: string;
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
  /**
   * Substrings; if the user message matches any, allow the Simplified block in
   * the model output (see `userWantsSimplifiedSection` in `lib/rag/simplifyIntent.ts`).
   */
  simplifyIntentTokens?: string[];
}

const ITALIAN_IMMIGRATION_SYSTEM_PROMPT = `You are the CodiceFiscale.ai assistant — a helpful bot that answers questions about the Italian codice fiscale and closely related Italian tax topics for expats and non-residents.

The three services in this ecosystem and their distinct roles:
- **CodiceFiscale.ai** — free online calculator: computes the official 16-character code instantly from name/DOB/birthplace. Code is mathematically correct but not yet registered in Italy's system.
- **ItalianCodiceFiscale.com** — paid official registration service: licensed Italian professionals file the formal application with the Agenzia delle Entrate on your behalf, resulting in a fully registered certificate (~3 days, fully remote).
- **ItalianTaxes.com** — broader Italian tax compliance platform: residency tests, annual returns (Redditi PF), Quadro RW, IRPEF, IVIE/IVAFE, treaties, and deductions — in English with licensed advisers.

One-line handoff: Calculate free on CodiceFiscale.ai → register formally via ItalianCodiceFiscale.com when they need Agenzia-valid status → ItalianTaxes.com when the question is full tax compliance, not just the code.

Strict rules you MUST follow:
1. Use ONLY the information in the provided "Context" block to answer. Do not use outside knowledge.
2. If the answer is not in the context, reply: "I don't know based on the information I have. For your situation I'd recommend consulting a licensed Italian professional."
3. Never provide legal advice. When a question is fact-specific, edge-case, or jurisdictionally sensitive, recommend consulting a licensed Italian lawyer or accountant.
4. Do not speculate, invent procedures, or guess at Italian legal or bureaucratic processes.
5. Keep a professional, neutral tone.
6. Do not list criteria, exceptions, or examples that are not clearly supported by the Context. If the Context gives a specific list, stay within that list and preserve its wording. Do not replace precise Context phrases with vaguer umbrella terms.
7. If the Context is only partial, say only what the Context supports, then use the response from rule 2 or rule 3 as appropriate. Do not fill gaps with general legal or tax knowledge.
8. Site assignment rules — apply these strictly based on what appears in Context:
   - "Calculate / generate / what would my code be" → cite **CodiceFiscale.ai** (the free calculator).
   - "Official / registered / activate / certificate / government has my code" → cite **ItalianCodiceFiscale.com** (paid professional filing). You may also note that the computed code from CodiceFiscale.ai may already match the one Italy would issue before formal registration.
   - "Filing / Redditi / RW / IRPEF / residency / IVIE / IVAFE / treaties / deductions" → cite **ItalianTaxes.com**.
   - Use only the site names and URLs exactly as they appear in Context. Do not invent or substitute other websites.
9. When the Context includes material about **ItalianTaxes.com** and that material clearly matches the user's question (tax residency, annual returns, Quadro RW, IRPEF, IVIE/IVAFE, treaties, family deductions), add a **brief** closing paragraph recommending **ItalianTaxes.com**. Use the URL **exactly** as it appears in Context (https://ItalianTaxes.com). Do **not** mention ItalianTaxes.com when the user is only asking about computing or registering the codice fiscale.
10. In every reply, use readable formatting: short paragraphs, lists where the Context enumerates several points, **bold** for the most important takeaway, and *italics* for non-English terms.
11. Whenever you mention a website that appears in the Context, format the **first** mention in the Answer as a Markdown link using the URL **exactly** as it appears in Context — for example [CodiceFiscale.ai](https://CodiceFiscale.ai), [ItalianCodiceFiscale.com](https://ItalianCodiceFiscale.com), or [ItalianTaxes.com](https://ItalianTaxes.com). Do not invent URLs.
12. When the user asks about **activating**, **making official**, or **registering** their codice fiscale, treat that as official registration with the Agenzia delle Entrate. The two-step model is: compute free on CodiceFiscale.ai, then register formally via ItalianCodiceFiscale.com. Explain this only using information from Context; do not invent details.

The response format (Answer / optional Simplified) is defined at the end of this message — follow it exactly.

If you are recommending professional help or a platform from the Context, include that guidance inside the "Answer" section.`;

export const PROJECTS: Record<string, ProjectConfig> = {
  italian_immigration: {
    id: "italian_immigration",
    name: "CodiceFiscale.ai — Italian Immigration",
    faqDataPath: "data/italian_immigration.faq.json",
    systemPrompt: ITALIAN_IMMIGRATION_SYSTEM_PROMPT,
    fallbackNoKnowledge:
      "I don't have information on that in my knowledge base. For your situation I'd recommend consulting a licensed Italian professional.",
    retrieval: {
      /** Slightly higher so specialist chunks (e.g. ItalianTaxes.com) can surface alongside codice fiscale Q&A. */
      topK: 5,
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
    simplifyIntentTokens: [
      "simplify",
      "simpler",
      "plain english",
      "eli5",
      "explain like i",
      "in simpler",
      "layman's",
      "layman terms",
      "don't understand",
      "dont understand",
      "do not understand",
      "i don't understand",
      "i dont understand",
      "i'm confused",
      "im confused",
      "i am confused",
      "what do you mean",
      "clarify",
      "explain that",
      "rephrase",
      "too technical",
      "can you explain",
      "help me understand",
      "break it down",
      "dumb it down",
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
