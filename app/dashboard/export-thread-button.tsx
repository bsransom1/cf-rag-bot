"use client";

interface Props {
  json: string;
  csv?: string;
}

function downloadText(
  text: string,
  mime: string,
  filename: string,
): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportThreadButton({ json, csv }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() =>
          downloadText(json, "application/json", `chat-export-${Date.now()}.json`)
        }
        className="rounded-lg border border-cf-border bg-cf-surface px-3 py-2 text-sm font-medium text-cf-body transition-colors hover:bg-cf-page dark:border-cf-border dark:bg-cf-surface dark:hover:bg-cf-page"
      >
        Export JSON
      </button>
      {csv ? (
        <button
          type="button"
          onClick={() =>
            downloadText(csv, "text/csv", `chat-export-${Date.now()}.csv`)
          }
          className="rounded-lg border border-cf-border bg-cf-surface px-3 py-2 text-sm font-medium text-cf-body transition-colors hover:bg-cf-page dark:border-cf-border dark:bg-cf-surface dark:hover:bg-cf-page"
        >
          Export CSV
        </button>
      ) : null}
    </div>
  );
}
