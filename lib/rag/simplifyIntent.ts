/**
 * Whether the user is asking for a plain-language / clarification restatement
 * (the "Simplified" section). Mirrors the substring style of
 * `allowsGatedCategories` in `retrieve.ts` — conservative token list, last user
 * message only (caller passes the current turn).
 */

import type { ProjectConfig } from "@/lib/config/project";

export function userWantsSimplifiedSection(
  project: ProjectConfig,
  query: string,
): boolean {
  const tokens = project.simplifyIntentTokens ?? [];
  if (tokens.length === 0) return false;
  const haystack = query.toLowerCase();
  return tokens.some((t) => haystack.includes(t.toLowerCase()));
}
