/**
 * Map bot output that uses the Answer:/Simplified: convention into
 * markdown headings and a visual divider, so the UI can style hierarchy and
 * spacing. Safe to run on any string.
 */
export function prepareAssistantMessageMarkdown(raw: string): string {
  let t = raw.trim();
  if (!t) return t;

  t = t.replace(/^Answer:\s*\n?/i, "## Answer\n\n");
  t = t.replace(
    /(?:\n\n|\n)Simplified:\s*\n?/i,
    "\n\n---\n\n## Simplified\n\n",
  );
  return t;
}
