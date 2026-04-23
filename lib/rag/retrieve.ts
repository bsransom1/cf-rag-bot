/**
 * Retrieval layer.
 *
 * Responsibilities:
 *   1. Embed the incoming user query.
 *   2. Call the `match_documents` RPC in Supabase (pgvector cosine similarity).
 *   3. Apply project-level filters (e.g. gate business-only categories behind
 *      explicit intent tokens so they don't leak into unrelated answers).
 *   4. Return a small, ranked list of chunks the prompt builder can consume.
 */

import { getSupabaseRuntimeClient } from "@/lib/db/client";
import { embedText } from "@/lib/rag/embed";
import { getProject, type ProjectConfig } from "@/lib/config/project";
import type { RetrievedChunk } from "@/types";

interface RetrieveOptions {
  projectId: string;
  query: string;
  /** Optional overrides; fall back to project config if omitted. */
  topK?: number;
  minSimilarity?: number;
}

/**
 * Decide whether the user's query signals intent for the project's gated
 * categories (e.g. advertising / partnerships). We use simple substring
 * matching against a curated token list — this is intentionally conservative
 * so business content never bleeds into unrelated answers.
 */
function allowsGatedCategories(project: ProjectConfig, query: string): boolean {
  if (!project.gatedCategories?.length) return true;
  const tokens = project.gatedCategoryIntentTokens ?? [];
  if (tokens.length === 0) return false;
  const haystack = query.toLowerCase();
  return tokens.some((t) => haystack.includes(t.toLowerCase()));
}

function filterGatedCategories(
  chunks: RetrievedChunk[],
  project: ProjectConfig,
  allowGated: boolean,
): RetrievedChunk[] {
  if (allowGated || !project.gatedCategories?.length) return chunks;
  const blocked = new Set(project.gatedCategories);
  return chunks.filter((c) => !blocked.has(c.category));
}

export async function retrieveRelevantChunks(
  options: RetrieveOptions,
): Promise<RetrievedChunk[]> {
  const project = getProject(options.projectId);
  const topK = options.topK ?? project.retrieval.topK;
  const minSimilarity = options.minSimilarity ?? project.retrieval.minSimilarity;

  const queryEmbedding = await embedText(options.query);

  const supabase = getSupabaseRuntimeClient();
  // NOTE: we request a few extra candidates so the gated-category filter
  // still has room to return `topK` results after filtering.
  const candidateCount = topK + (project.gatedCategories?.length ? 3 : 0);

  // Single jsonb argument avoids PostgREST multi-arg / overload resolution
  // issues (you may see "schema cache" errors with a 4-arg signature).
  const { data, error } = await supabase.rpc("match_documents", {
    p_match_args: {
      query_embedding: queryEmbedding,
      match_count: candidateCount,
      p_project_id: project.id,
      min_similarity: minSimilarity,
    },
  });

  if (error) {
    throw new Error(`match_documents RPC failed: ${error.message}`);
  }

  const rows = (data ?? []) as RetrievedChunk[];
  const allowGated = allowsGatedCategories(project, options.query);
  const filtered = filterGatedCategories(rows, project, allowGated);

  return filtered.slice(0, topK);
}
