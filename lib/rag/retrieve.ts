/**
 * Retrieval layer.
 *
 * Responsibilities:
 *   1. Embed the incoming user query.
 *   2. Call the `match_documents` RPC in Supabase (pgvector cosine similarity).
 *   3. Apply project-level filters (e.g. gate business-only categories behind
 *      explicit intent tokens so they don't leak into unrelated answers).
 *   4. Force-include configured categories when the query matches intent tokens
 *      (e.g. eligibility on negatively phrased "can I use this?" questions).
 *   5. Return a small, ranked list of chunks the prompt builder can consume.
 */

import { getSupabaseRuntimeClientForProject } from "@/lib/db/client";
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

const ELIGIBILITY_CANONICAL_QUERY =
  "Who can use this service? Can non-US citizens use the service? Eligibility for someone with no US citizenship, no US documents, and no US ID.";

function queryMatchesTokens(query: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const haystack = query.toLowerCase();
  return tokens.some((t) => haystack.includes(t.toLowerCase()));
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
  return queryMatchesTokens(query, tokens);
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

function wantsForcedCategories(
  project: ProjectConfig,
  query: string,
): string[] {
  const categories = project.forceIncludeCategories ?? [];
  const tokens = project.forceIncludeCategoryIntentTokens ?? [];
  if (categories.length === 0 || tokens.length === 0) return [];
  if (!queryMatchesTokens(query, tokens)) return [];
  return categories;
}

function prependForcedCategories(
  chunks: RetrievedChunk[],
  forced: RetrievedChunk[],
  topK: number,
): RetrievedChunk[] {
  const seen = new Set<string>();
  const out: RetrievedChunk[] = [];
  for (const chunk of [...forced, ...chunks]) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    out.push(chunk);
    if (out.length >= topK) break;
  }
  return out;
}

async function matchDocuments(
  supabase: ReturnType<typeof getSupabaseRuntimeClientForProject>,
  args: {
    queryEmbedding: number[];
    matchCount: number;
    projectId: string;
    minSimilarity: number;
  },
): Promise<RetrievedChunk[]> {
  const { data, error } = await supabase.rpc("match_documents", {
    p_match_args: {
      query_embedding: args.queryEmbedding,
      match_count: args.matchCount,
      p_project_id: args.projectId,
      min_similarity: args.minSimilarity,
    },
  });

  if (error) {
    throw new Error(`match_documents RPC failed: ${error.message}`);
  }

  return (data ?? []) as RetrievedChunk[];
}

export async function retrieveRelevantChunks(
  options: RetrieveOptions,
): Promise<RetrievedChunk[]> {
  const project = getProject(options.projectId);
  const topK = options.topK ?? project.retrieval.topK;
  const minSimilarity = options.minSimilarity ?? project.retrieval.minSimilarity;
  const forcedCategories = wantsForcedCategories(project, options.query);

  const queryEmbedding = await embedText(options.query);

  const supabase = getSupabaseRuntimeClientForProject(project.id);
  // Request extra candidates so gated-category filtering and force-include
  // still have room to return `topK` results after reordering.
  const candidateCount =
    topK +
    (project.gatedCategories?.length ? 3 : 0) +
    (forcedCategories.length ? 8 : 0);

  const rows = await matchDocuments(supabase, {
    queryEmbedding,
    matchCount: candidateCount,
    projectId: project.id,
    minSimilarity,
  });

  const allowGated = allowsGatedCategories(project, options.query);
  const filtered = filterGatedCategories(rows, project, allowGated);

  if (forcedCategories.length === 0) {
    return filtered.slice(0, topK);
  }

  const forcedSet = new Set(forcedCategories);
  let forced = filtered.filter((c) => forcedSet.has(c.category));

  if (forced.length === 0) {
    const canonicalEmbedding = await embedText(ELIGIBILITY_CANONICAL_QUERY);
    const extra = await matchDocuments(supabase, {
      queryEmbedding: canonicalEmbedding,
      matchCount: topK + 3,
      projectId: project.id,
      minSimilarity,
    });
    forced = filterGatedCategories(extra, project, allowGated).filter((c) =>
      forcedSet.has(c.category),
    );
  }

  // Keep room for the query's other top hits (e.g. deed vs notaio).
  return prependForcedCategories(filtered, forced.slice(0, 2), topK);
}
