/**
 * Ingestion pipeline.
 *
 * Usage:
 *   npm run ingest                 # ingest the default project
 *   npm run ingest -- <project_id> # ingest a specific project
 *
 * What it does:
 *   1. Loads .env so SUPABASE_* / OPENAI_API_KEY are available.
 *   2. Reads the project's FAQ JSON file.
 *   3. Validates each entry.
 *   4. Builds embedding text (1 chunk = 1 Q&A).
 *   5. Batch-embeds via OpenAI.
 *   6. Wipes existing rows for that project and inserts fresh ones.
 *
 * The ingest script is the ONLY place that uses Supabase service-role keys.
 * It must be run locally by an operator — never from a server handler.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { getSupabaseAdminClientForProject } from "@/lib/db/client";
import { buildEmbeddingText, embedBatch } from "@/lib/rag/embed";
import { getProject } from "@/lib/config/project";
import type { FaqEntry } from "@/types";

const BATCH_SIZE = 64;

function validateEntry(entry: unknown, index: number): FaqEntry {
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`Entry ${index} is not an object`);
  }
  const e = entry as Record<string, unknown>;
  const required = ["question", "answer", "section", "category"] as const;
  for (const key of required) {
    if (typeof e[key] !== "string" || (e[key] as string).trim().length === 0) {
      throw new Error(`Entry ${index} is missing required string field "${key}"`);
    }
  }
  if (!Array.isArray(e.tags) || e.tags.some((t) => typeof t !== "string")) {
    throw new Error(`Entry ${index} "tags" must be an array of strings`);
  }
  if (
    e.plain_english !== undefined &&
    e.plain_english !== null &&
    typeof e.plain_english !== "string"
  ) {
    throw new Error(`Entry ${index} "plain_english" must be a string or omitted`);
  }
  return {
    question: (e.question as string).trim(),
    answer: (e.answer as string).trim(),
    plain_english:
      typeof e.plain_english === "string" && e.plain_english.trim().length > 0
        ? e.plain_english.trim()
        : undefined,
    section: (e.section as string).trim(),
    category: (e.category as string).trim(),
    tags: (e.tags as string[]).map((t) => t.trim()).filter(Boolean),
  };
}

async function loadFaq(path: string): Promise<FaqEntry[]> {
  const absolutePath = resolve(process.cwd(), path);
  const raw = await readFile(absolutePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse FAQ JSON at ${absolutePath}: ${(err as Error).message}`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`FAQ JSON at ${absolutePath} must be a top-level array`);
  }
  return parsed.map((entry, i) => validateEntry(entry, i));
}

async function main(): Promise<void> {
  const projectId = process.argv[2] ?? "italian_immigration";
  const project = getProject(projectId);

  console.log(`→ Ingesting project: ${project.id} (${project.name})`);
  const entries = await loadFaq(project.faqDataPath);
  console.log(`→ Loaded ${entries.length} FAQ entries from ${project.faqDataPath}`);

  const contents = entries.map(buildEmbeddingText);

  console.log(`→ Generating embeddings (batch size ${BATCH_SIZE})...`);
  const embeddings: number[][] = [];
  for (let i = 0; i < contents.length; i += BATCH_SIZE) {
    const slice = contents.slice(i, i + BATCH_SIZE);
    const vectors = await embedBatch(slice);
    embeddings.push(...vectors);
    process.stdout.write(
      `   embedded ${Math.min(i + BATCH_SIZE, contents.length)}/${contents.length}\r`,
    );
  }
  process.stdout.write("\n");

  const rows = entries.map((entry, i) => ({
    project_id: project.id,
    section: entry.section,
    category: entry.category,
    tags: entry.tags,
    question: entry.question,
    answer: entry.answer,
    plain_english: entry.plain_english ?? null,
    content: contents[i],
    embedding: embeddings[i],
  }));

  const supabase = getSupabaseAdminClientForProject(project.id);

  console.log(`→ Clearing existing rows for project=${project.id}...`);
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("project_id", project.id);
  if (deleteError) {
    throw new Error(`Failed to clear existing rows: ${deleteError.message}`);
  }

  console.log(`→ Inserting ${rows.length} rows...`);
  // Insert in small chunks to avoid oversized payloads.
  const INSERT_CHUNK = 50;
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    const { error } = await supabase.from("documents").insert(chunk);
    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
  }

  console.log(`✓ Done. Ingested ${rows.length} chunks for ${project.id}.`);
}

main().catch((err) => {
  console.error("✗ Ingestion failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
