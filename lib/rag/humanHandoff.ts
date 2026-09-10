/**
 * Hard-rule routing: some queries must skip RAG/LLM and return a canned
 * reply or the project's human-handoff / fallback string
 * (see ItalianNotary.com CONFIG).
 */

import type { ProjectConfig } from "@/lib/config/project";

function queryMatchesTokens(query: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const haystack = query.toLowerCase();
  return tokens.some((t) => haystack.includes(t.toLowerCase()));
}

export function userMustHandoffToHuman(
  project: ProjectConfig,
  query: string,
): boolean {
  return resolveHandoffReply(project, query) !== null;
}

/**
 * First matching `cannedHandoffs` group wins, then `humanHandoffIntentTokens`
 * → `fallbackNoKnowledge`. Returns null when the query should go through RAG.
 */
export function resolveHandoffReply(
  project: ProjectConfig,
  query: string,
): string | null {
  for (const group of project.cannedHandoffs ?? []) {
    if (queryMatchesTokens(query, group.tokens)) {
      return group.reply;
    }
  }
  if (queryMatchesTokens(query, project.humanHandoffIntentTokens ?? [])) {
    return project.fallbackNoKnowledge;
  }
  return null;
}
