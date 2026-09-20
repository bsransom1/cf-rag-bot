import Link from "next/link";

import {
  DASHBOARD_SITE_CONFIG,
  formatDashboardTime,
  type DashboardSite,
} from "@/lib/dashboard/sites";
import type { DashboardConversation } from "@/lib/dashboard/data";

export function ConversationList({
  site,
  conversations,
  error,
}: {
  site: DashboardSite;
  conversations: DashboardConversation[];
  error: string | null;
}) {
  const config = DASHBOARD_SITE_CONFIG[site];

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        Could not load conversations. If this is the first time opening this
        page, the chat log may not be connected yet.
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-cf-ink dark:text-white">
        Conversations
      </h1>
      <p className="mt-1 text-sm text-cf-muted">
        Newest first. Open a row to read the questions and answers.
      </p>

      <ul className="mt-8 divide-y divide-cf-border rounded-lg border border-cf-border bg-cf-surface dark:divide-cf-border dark:border-cf-border dark:bg-cf-surface">
        {conversations.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-cf-muted">
            No conversations yet. They appear after visitors use the chat.
          </li>
        ) : (
          conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`${config.path}/${c.id}`}
                className="block px-4 py-3 transition-colors hover:bg-cf-page dark:hover:bg-cf-page"
              >
                <p className="text-sm text-cf-body">{c.preview}</p>
                <p className="mt-1 text-xs text-cf-muted">
                  {c.lastMessageAt ? formatDashboardTime(c.lastMessageAt) : "—"}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
