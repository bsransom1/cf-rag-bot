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
  /**
   * If the user message matches any token, skip retrieval and the LLM and
   * return `fallbackNoKnowledge` (human handoff / hard rules).
   */
  humanHandoffIntentTokens?: string[];
  /**
   * Ordered token groups with dedicated canned replies. Checked before
   * `humanHandoffIntentTokens`. First matching group wins.
   */
  cannedHandoffs?: Array<{ tokens: string[]; reply: string }>;
  /**
   * Categories to force-include (prepend) when the query matches
   * `forceIncludeCategoryIntentTokens`.
   */
  forceIncludeCategories?: string[];
  /** If the user query matches any of these tokens, force-include the categories above. */
  forceIncludeCategoryIntentTokens?: string[];
  /** Shown in embed UI / ARIA when set (e.g. ItalianNotary.com). */
  brandName?: string;
  /** Override empty-state prompt and starter chips per UI language. */
  uiCopy?: {
    emptyPrompt?: { en: string; it: string };
    starters?: { en: string[]; it: string[] };
    ariaRegion?: { en: string; it: string };
  };
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

export const ITALIAN_NOTARY_SLM_BOOKING =
  "https://www.studiolegalemetta.com/booking-appointments/";

export const ITALIAN_NOTARY_FALLBACK =
  `I don't have a specific answer to that in my knowledge base. For personalized help, please email ItalianNotary.com at info@italiannotary.com, or use the contact form at italiannotary.com/contact-us. For legal questions specific to your situation, you can schedule a consultation with partner law firm Studio Legale Metta at ${ITALIAN_NOTARY_SLM_BOOKING}`;

export const ITALIAN_NOTARY_CONTACT_REPLY =
  "We handle inquiries by email so we can route them to the right person — info@italiannotary.com, or the contact form at italiannotary.com/contact-us.";

export const ITALIAN_NOTARY_TRANSLATION_REPLY =
  "ItalianNotary.com does not currently provide translation services. If you are preparing a document for an Italian Comune or another recipient, it is advisable to confirm directly with the intended recipient whether the document is acceptable as drafted before executing it, including any translation or formatting requirements.";

const ITALIAN_NOTARY_SYSTEM_PROMPT = `You are the ItalianNotary.com assistant — a helpful bot that answers questions about ItalianNotary.com's US remote online notarization service (apostille, shipping, and related document support) for clients who need documents for use in Italy or the United States.

Primary resource: **ItalianNotary.com** (https://italiannotary.com) — a one-stop service for legally notarized documents, apostilles, and international shipping, with one point of contact. ItalianNotary.com does not currently provide translation services.

Strict rules you MUST follow:
1. Use ONLY the information in the provided "Context" block to answer. Do not use outside knowledge.
2. If the answer is not in the context, reply with exactly this fallback (do not paraphrase): ${ITALIAN_NOTARY_FALLBACK}
3. Never provide legal advice about a user's individual circumstances. Route those questions to a human using the fallback in rule 2.
4. Do not speculate, invent procedures, prices, turnaround times, or Italian/US legal outcomes. Do not quote a price for the Italian legal document preparation add-on; if asked, say pricing has not been finalized and they should contact ItalianNotary.com.
5. Keep a professional, neutral tone.
6. Do not list criteria, exceptions, or examples that are not clearly supported by the Context.
7. If the Context is only partial, say only what the Context supports, then use the fallback in rule 2.
8. Never provide a phone number. No phone number exists in this knowledge base; do not invent or infer one. Direct contact-method questions to email (info@italiannotary.com) or the contact form at italiannotary.com/contact-us.
9. Never state or imply that a money-back guarantee exists.
10. ItalianNotary.com does not currently provide translation services. If asked about translation (sworn vs certified, whether a Comune will accept a translation, or whether you offer translation), say so and advise the user to confirm translation and formatting requirements with the intended recipient before executing the document. Never quote a translation price. Never invent whether a specific office will accept a translation.
11. Do not answer whether a specific Italian office, court, or Comune will accept a particular document (other than restating the translation guidance in rule 10 when the question is about translation). Direct the user to a human using the fallback in rule 2.
12. If asked for a copy of a session recording, do not invent an answer — use the fallback in rule 2.
13. A US notary public is not a substitute for an Italian *notaio*. When Context says a property title transfer or similar act must be performed before a *notaio*, keep that distinction.
14. Use site names and URLs exactly as they appear in Context. Format the first mention of each site as a Markdown link. Do not invent URLs.
15. In every reply, use readable formatting: short paragraphs, lists where the Context enumerates several points, **bold** for the most important takeaway, and *italics* for non-English terms (e.g. *notaio*, *procura*, *apostille*).
16. Do not mention CodiceFiscale.ai, ItalianCodiceFiscale.com, ItalianTaxes.com, or ItalianVisa.com unless they explicitly appear in Context for this turn.
17. If the user uses an absolute qualifier such as "guaranteed," "always," or "definitely," lead with what the Context affirms, then state the limitation. Never open a substantive answer with a bare "No" when the Context frames the point affirmatively.

The response format (Answer / optional Simplified) is defined at the end of this message — follow it exactly.`;

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
  italian_notary: {
    id: "italian_notary",
    name: "ItalianNotary.com",
    brandName: "ItalianNotary.com",
    uiCopy: {
      emptyPrompt: {
        en: "Ask about online notarization for Italy or the US, apostilles, and what to prepare for your session.",
        it: "Chiedi della notarizzazione online per l'Italia o gli USA, delle apostille e di come prepararti alla sessione.",
      },
      starters: {
        en: [
          "What documents can you notarize online for Italy?",
          "How does the online notarization process work?",
          "What are the key terms I should know before getting started?",
        ],
        it: [
          "Quali documenti potete legalizzare online per l'Italia?",
          "Come funziona la notarizzazione online?",
          "Quali termini chiave dovrei conoscere prima di iniziare?",
        ],
      },
      ariaRegion: {
        en: "Chat about ItalianNotary.com online notarization",
        it: "Chat sulla notarizzazione online di ItalianNotary.com",
      },
    },
    databaseProfileId: "italian_notary",
    faqDataPath: "data/italian_notary.faq.json",
    systemPrompt: ITALIAN_NOTARY_SYSTEM_PROMPT,
    fallbackNoKnowledge: ITALIAN_NOTARY_FALLBACK,
    retrieval: {
      topK: 5,
      minSimilarity: 0,
    },
    gatedCategories: ["advertising"],
    gatedCategoryIntentTokens: [
      "advertis",
      "affiliate",
      "partner",
      "sponsor",
      "placement",
      "marketing",
      "collaborat",
    ],
    cannedHandoffs: [
      {
        tokens: ["translat", "traduzion", "asseverat", "giurat"],
        reply: ITALIAN_NOTARY_TRANSLATION_REPLY,
      },
      {
        tokens: [
          "phone number",
          "telephone number",
          "numero di telefono",
          "whatsapp",
        ],
        reply: ITALIAN_NOTARY_CONTACT_REPLY,
      },
    ],
    humanHandoffIntentTokens: [
      "legalizzata",
      "money-back",
      "money back",
      "refund guarantee",
      "session recording",
      "copy of the recording",
      "copy of a session",
      "recording of the session",
      "questura",
      "prefettura",
      "tribunale",
      "giudice di pace",
      "comune",
    ],
    forceIncludeCategories: ["eligibility"],
    forceIncludeCategoryIntentTokens: [
      "eligib",
      "can i use",
      "can we use",
      "qualify",
      "non-us",
      "non us",
      "green card",
      "who can",
      "never been to the us",
      "no us documents",
      "no us document",
      "no us id",
      "italian citizen",
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
      "i'm confused",
      "im confused",
      "clarify",
      "rephrase",
      "too technical",
      "can you explain",
      "help me understand",
      "break it down",
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
