/**
 * Integration checks for /api/chat funnel behavior.
 *
 * Three-tier canonical model:
 *   CodiceFiscale.ai      → free calculator (compute the code)
 *   ItalianCodiceFiscale.com → paid official registration (licensed pros file with Agenzia)
 *   ItalianTaxes.com      → broader tax compliance (Redditi, RW, IRPEF, IVIE/IVAFE)
 *
 * Usage:
 *   1. Build and start the app: `npm run build && PORT=3011 npm start`
 *   2. `TEST_BASE_URL=http://127.0.0.1:3011 npm run test:chat-scenarios`
 *
 * Requires .env.local (or env): OPENAI_API_KEY, SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY for logging (optional).
 */

import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";

loadEnv({ path: ".env.local" });
loadEnv();

const FALLBACK =
  "I don't have information on that in my knowledge base. For your situation I'd recommend consulting a licensed Italian professional.";
const LLM_UNK =
  "I don't know based on the information I have. For your situation I'd recommend consulting a licensed Italian professional.";

type Expect = {
  /** Response must match this regex */
  mustMatch?: RegExp;
  /** Response must not match (e.g. wrong funnel) */
  mustNotMatch?: RegExp;
  /** If true, fail when response is the empty-chunks fallback */
  notEmptyRetrieval?: boolean;
};

type Scenario = { name: string; message: string; expect: Expect };

const SCENARIOS: Scenario[] = [
  // --- Tier 1: CodiceFiscale.ai = free calculator ---
  {
    name: "calculate intent → CodiceFiscale.ai (not paid registration)",
    message: "How do I calculate my Italian codice fiscale?",
    expect: {
      mustMatch: /CodiceFiscale\.ai|codicefiscale\.ai/i,
      mustNotMatch: /ItalianTaxes\.com/i,
      notEmptyRetrieval: true,
    },
  },
  {
    name: "how to generate code → CodiceFiscale.ai (free calculator)",
    message: "Where can I generate or compute my Italian codice fiscale for free?",
    expect: {
      mustMatch: /CodiceFiscale\.ai|codicefiscale\.ai|calculator|compute/i,
      notEmptyRetrieval: true,
    },
  },
  {
    name: "calculator privacy — no ItalianTaxes funnel",
    message: "Does the CodiceFiscale.ai calculator store my personal data?",
    expect: {
      mustMatch: /CodiceFiscale\.ai|browser|not store|no data|retained/i,
      mustNotMatch: /ItalianTaxes\.com/i,
      notEmptyRetrieval: true,
    },
  },
  // --- Tier 2: ItalianCodiceFiscale.com = paid official registration ---
  {
    name: "activate → ItalianCodiceFiscale.com registration (primary bug case)",
    message: "How do I activate my codice fiscale?",
    expect: {
      mustMatch: /ItalianCodiceFiscale\.com|italiancodicefiscale\.com/i,
      notEmptyRetrieval: true,
    },
  },
  {
    name: "make official → ItalianCodiceFiscale.com",
    message: "What does it mean to make my codice fiscale official?",
    expect: {
      mustMatch: /ItalianCodiceFiscale\.com|italiancodicefiscale\.com|Agenzia|registration|register/i,
      notEmptyRetrieval: true,
    },
  },
  {
    name: "register with tax authority → ItalianCodiceFiscale.com",
    message: "How do I register my codice fiscale with the Italian tax authority?",
    expect: {
      mustMatch: /ItalianCodiceFiscale\.com|italiancodicefiscale\.com|Agenzia|registration/i,
      notEmptyRetrieval: true,
    },
  },
  {
    name: "compare sites — both roles correctly distinguished",
    message: "What is the difference between CodiceFiscale.ai and ItalianCodiceFiscale.com?",
    expect: {
      mustMatch: /CodiceFiscale\.ai/i,
      notEmptyRetrieval: true,
    },
  },
  // --- Tier 3: ItalianTaxes.com = broader tax compliance ---
  {
    name: "ItalianTaxes funnel — platform intro",
    message: "What is ItalianTaxes.com and how does it relate to CodiceFiscale.ai?",
    expect: {
      mustMatch: /ItalianTaxes/i,
      notEmptyRetrieval: true,
    },
  },
  {
    name: "ItalianTaxes funnel — Redditi PF filing",
    message: "Where can I get help filing my Italian personal income tax return Redditi PF?",
    expect: {
      mustMatch: /ItalianTaxes/i,
      notEmptyRetrieval: true,
    },
  },
  {
    name: "ItalianTaxes funnel — Quadro RW foreign assets",
    message: "I need help with Quadro RW and reporting foreign assets to Italy.",
    expect: {
      mustMatch: /ItalianTaxes|Quadro RW|RW/i,
      notEmptyRetrieval: true,
    },
  },
  // --- Anti-wrong-funnel checks ---
  {
    name: "narrow definition — must not push ItalianTaxes",
    message: "In one sentence, what is the Italian codice fiscale?",
    expect: {
      mustNotMatch: /ItalianTaxes\.com/i,
      mustMatch: /codice fiscale|tax code|fiscal|identif/i,
      notEmptyRetrieval: true,
    },
  },
  {
    name: "calculate intent — must not push paid registration only",
    message: "Can you compute my codice fiscale for free?",
    expect: {
      mustMatch: /CodiceFiscale\.ai|codicefiscale\.ai|free|calculator/i,
      notEmptyRetrieval: true,
    },
  },
  {
    name: "business / advertise — gated category surfaces correctly",
    message: "How can my law firm advertise on CodiceFiscale.ai?",
    expect: {
      mustMatch: /advertis|contact|banner|sponsor|website|CodiceFiscale/i,
      notEmptyRetrieval: true,
    },
  },
];

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

async function postChat(
  base: string,
  message: string,
): Promise<{ ok: boolean; status: number; response: string; error?: string }> {
  const res = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: "italian_immigration",
      message,
      session_id: randomUUID(),
      lang: "en",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    response?: string;
    error?: string;
  };
  const text = typeof data.response === "string" ? data.response : "";
  return {
    ok: res.ok,
    status: res.status,
    response: text,
    error: data.error,
  };
}

function isRetrievalFallback(text: string): boolean {
  return text.trim() === FALLBACK.trim() || text.trim() === LLM_UNK.trim();
}

async function main(): Promise<void> {
  const base =
    process.env.TEST_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3011";

  console.log(`→ Chat scenario tests against ${base}\n`);

  let failed = 0;
  for (const s of SCENARIOS) {
    const { ok, status, response, error } = await postChat(base, s.message);
    const issues: string[] = [];

    if (!ok) {
      issues.push(`HTTP ${status}: ${error ?? response.slice(0, 200)}`);
    }

    if (s.expect.notEmptyRetrieval && response && isRetrievalFallback(response)) {
      issues.push("got retrieval/LLM-IDK fallback (empty or no useful context)");
    }

    if (s.expect.mustMatch && !s.expect.mustMatch.test(response)) {
      issues.push(`did not match ${s.expect.mustMatch}`);
    }

    if (s.expect.mustNotMatch && s.expect.mustNotMatch.test(response)) {
      issues.push(`must not match ${s.expect.mustNotMatch} but did`);
    }

    if (issues.length === 0) {
      console.log(`${green("PASS")} — ${s.name}`);
    } else {
      failed++;
      console.log(`${red("FAIL")} — ${s.name}`);
      for (const i of issues) console.log(`       ${i}`);
      console.log(
        `       preview: ${response.replace(/\s+/g, " ").slice(0, 220)}…`,
      );
    }
  }

  console.log("");
  if (failed > 0) {
    console.log(red(`${failed} scenario(s) failed`));
    process.exit(1);
  }
  console.log(green("All scenarios passed."));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
