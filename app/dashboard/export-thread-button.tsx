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
        className="rounded-md px-2 py-1 text-sm text-cf-muted hover:underline"
      >
        Download JSON
      </button>
      {csv ? (
        <button
          type="button"
          onClick={() =>
            downloadText(csv, "text/csv", `chat-export-${Date.now()}.csv`)
          }
          className="rounded-md px-2 py-1 text-sm text-cf-muted hover:underline"
        >
          Download CSV
        </button>
      ) : null}
    </div>
  );
}
