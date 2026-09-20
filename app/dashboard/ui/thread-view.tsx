import Link from "next/link";

import { deleteChatSessionAction } from "@/app/dashboard/actions";
import { ExportThreadButton } from "@/app/dashboard/export-thread-button";
import { messagesToCsv } from "@/app/dashboard/messages-to-csv";
import type { DashboardMessage } from "@/lib/dashboard/data";
import {
  DASHBOARD_SITE_CONFIG,
  formatDashboardTime,
  type DashboardSite,
} from "@/lib/dashboard/sites";

export function ThreadView({
  site,
  sessionId,
  messages,
}: {
  site: DashboardSite;
  sessionId: string;
  messages: DashboardMessage[];
}) {
  const config = DASHBOARD_SITE_CONFIG[site];
  const csvExport = messagesToCsv(
    messages.map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.createdAt,
    })),
  );
  const json = JSON.stringify({ sessionId, messages }, null, 2);

  return (
    <div>
      <Link
        href={config.path}
        className="text-sm text-cf-brand-cta hover:underline"
      >
        ← All conversations
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-xl font-semibold text-cf-ink dark:text-white">
          Conversation
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <ExportThreadButton json={json} csv={csvExport} />
          <form action={deleteChatSessionAction}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="site" value={site} />
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-sm text-red-700 hover:underline dark:text-red-300"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {messages.map((m) => (
          <article
            key={m.id}
            className={
              m.role === "user"
                ? "rounded-lg border border-cf-border bg-cf-page px-4 py-3 dark:border-cf-border dark:bg-cf-page"
                : "rounded-lg border border-cf-border bg-cf-surface px-4 py-3 dark:border-cf-border dark:bg-cf-surface"
            }
          >
            <div className="flex items-baseline justify-between gap-2 text-xs text-cf-muted">
              <span className="font-semibold text-cf-body">
                {m.role === "user" ? "Visitor" : "Assistant"}
              </span>
              <time dateTime={m.createdAt}>
                {formatDashboardTime(m.createdAt)}
              </time>
            </div>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-cf-body">
              {m.content}
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}
