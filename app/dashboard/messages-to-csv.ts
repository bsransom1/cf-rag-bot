/** Minimal CSV export for transcript rows (RFC 4180-style quoting). */
export function messagesToCsv(
  rows: { role: string; content: string; created_at: string }[],
): string {
  const escape = (cell: string) => {
    if (/[",\n\r]/.test(cell)) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };
  const header = ["role", "created_at", "content"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.role, r.created_at, escape(r.content)].join(","),
    ),
  ];
  return lines.join("\n");
}
