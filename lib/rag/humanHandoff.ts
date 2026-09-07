/**
 * Hard-rule routing: some queries must skip RAG/LLM and return the project's
 * human-handoff / fallback string (see ItalianNotary.com CONFIG).
 */

import type { ProjectConfig } from "@/lib/config/project";

export function userMustHandoffToHuman(
  project: ProjectConfig,
  query: string,
): boolean {
  const tokens = project.humanHandoffIntentTokens ?? [];
  if (tokens.length === 0) return false;
  const haystack = query.toLowerCase();
  return tokens.some((t) => haystack.includes(t.toLowerCase()));
}
