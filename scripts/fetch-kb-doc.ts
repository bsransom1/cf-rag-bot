/**
 * Fetch a project's Google Doc (anyone-with-link Viewer) and diff it
 * against the published FAQ JSON. Does not ingest embeddings.
 *
 * Usage:
 *   npm run fetch-kb -- <project_id>
 *   npm run fetch-kb -- <project_id> --write-faq
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { getProject } from "@/lib/config/project";
import type { FaqEntry } from "@/types";
import {
  diffFaqEntries,
  mergeFaqFromDoc,
  parseGoogleKbDoc,
  type KbDocKind,
} from "./parse-kb-doc";

const GOOGLE_EXPORT = (id: string) =>
  `https://docs.google.com/document/d/${id}/export?format=txt`;

function assertKbKind(id: string): KbDocKind {
  if (id === "italian_immigration" || id === "italian_notary") return id;
  throw new Error(
    `fetch-kb only supports italian_immigration or italian_notary (got ${id})`,
  );
}

async function loadFaq(path: string): Promise<FaqEntry[]> {
  const raw = await readFile(resolve(process.cwd(), path), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`FAQ JSON at ${path} must be a top-level array`);
  }
  return parsed as FaqEntry[];
}

async function fetchGoogleDoc(docId: string): Promise<string> {
  const res = await fetch(GOOGLE_EXPORT(docId), { redirect: "follow" });
  if (res.status === 403) {
    throw new Error(
      `Google Doc ${docId} returned 403. Share it as Anyone with the link → Viewer.`,
    );
  }
  if (!res.ok) {
    throw new Error(`Google Doc export failed: HTTP ${res.status} for ${docId}`);
  }
  const text = await res.text();
  if (text.trim().length === 0) {
    throw new Error(`Google Doc ${docId} exported empty text`);
  }
  return text;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const projectId = args.find((a) => !a.startsWith("--"));
  const writeFaq = args.includes("--write-faq");
  if (!projectId) {
    throw new Error("Usage: npm run fetch-kb -- <project_id> [--write-faq]");
  }

  const kind = assertKbKind(projectId);
  const project = getProject(projectId);
  if (!project.googleDocId) {
    throw new Error(`Project ${projectId} has no googleDocId in lib/config/project.ts`);
  }

  console.log(`→ Fetching Google Doc ${project.googleDocId} (${project.name})`);
  const text = await fetchGoogleDoc(project.googleDocId);

  const snapshotPath = resolve(process.cwd(), "data/sources", `${project.id}.md`);
  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, text, "utf8");
  console.log(`→ Wrote snapshot ${snapshotPath} (${text.length} chars)`);

  const parsed = parseGoogleKbDoc(text, kind);
  console.log(`→ Parsed ${parsed.entries.length} Q&A pairs from the Doc`);
  if (parsed.entries.length === 0) {
    throw new Error("Parser found 0 Q&A pairs — check Doc structure");
  }

  const faq = await loadFaq(project.faqDataPath);
  const diff = diffFaqEntries(parsed.entries, faq);

  console.log("\nFAQ diff (Doc vs published JSON)");
  console.log(`  unchanged:   ${diff.unchanged}`);
  console.log(`  changed:     ${diff.changed.length}`);
  console.log(`  added in Doc:${diff.added.length === 0 ? " 0" : ""}`);
  for (const q of diff.added) console.log(`    + ${q}`);
  console.log(`  only in JSON:${diff.onlyInJson.length === 0 ? " 0" : ""}`);
  for (const q of diff.onlyInJson) console.log(`    · ${q}`);

  if (diff.changed.length > 0) {
    console.log("\nChanged questions:");
    for (const row of diff.changed) {
      console.log(`  ~ ${row.question} (${row.fields.join(", ")})`);
    }
  }

  if (parsed.configText) {
    console.log("\nCONFIG block (not ingested — compare with lib/config/project.ts):");
    const preview = parsed.configText.split("\n").slice(0, 12).join("\n");
    console.log(preview);
    if (parsed.configText.includes("booking_step_one")) {
      console.warn(
        "\n⚠ Doc CONFIG still has the old Studio Legale Metta booking path. Current bot uses /booking-appointments/.",
      );
    }
    if (/Can ItalianNotary\.com provide translations\?/i.test(text)) {
      const yes = /Q:\s*Can ItalianNotary\.com provide translations\?\s*\nYes\./i.test(
        text,
      );
      if (yes) {
        console.warn(
          "⚠ Doc still answers that ItalianNotary.com provides translation. Live bot uses a canned refusal from a later stakeholder override — do not ingest PART 6 without confirmation.",
        );
      }
    }
  }

  if (writeFaq) {
    const merged = mergeFaqFromDoc(parsed.entries, faq);
    const faqPath = resolve(process.cwd(), project.faqDataPath);
    await writeFile(
      faqPath,
      `${JSON.stringify(merged.entries, null, 2)}\n`,
      "utf8",
    );
    console.log(`\n→ Wrote ${faqPath}`);
    console.log(`  applied from Doc:     ${merged.applied}`);
    console.log(`  added from Doc:       ${merged.added}`);
    console.log(`  skipped later policy: ${merged.skippedLaterPolicy}`);
    console.log(
      `  skipped new translation-as-service: ${merged.skippedNewTranslation}`,
    );
    console.log(`  kept JSON-only:       ${merged.keptJsonOnly}`);
    console.log("  CONFIG / project.ts was not modified.");
  } else {
    console.log(
      "\n✓ Fetch + parse validation passed. JSON was not modified. Pass --write-faq to overlay Doc Q&As.",
    );
  }
}

main().catch((err) => {
  console.error("✗ fetch-kb failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
