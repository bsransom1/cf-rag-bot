import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  const supabase = createServerSupabaseClient();
  const projectFilter = searchParams.project?.trim() || null;

  let query = supabase
    .from("chat_sessions")
    .select("id, project_id, started_at, last_message_at")
    .order("last_message_at", { ascending: false })
    .limit(200);

  if (projectFilter) {
    query = query.eq("project_id", projectFilter);
  }

  const { data: sessions, error } = await query;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        Could not load sessions: {error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-cf-ink dark:text-white">
            Sessions
          </h1>
          <p className="mt-1 text-sm text-cf-muted">
            Recent chat threads (newest first). Filter by{" "}
            <code className="rounded bg-cf-border/40 px-1">project_id</code> from
            the URL, e.g.{" "}
            <code className="rounded bg-cf-border/40 px-1">
              ?project=italian_immigration
            </code>
            .
          </p>
        </div>
        {projectFilter ? (
          <Link
            href="/dashboard"
            className="text-sm text-cf-brand-cta hover:underline"
          >
            Clear filter ({projectFilter})
          </Link>
        ) : null}
      </div>

      <ul className="mt-8 divide-y divide-cf-border rounded-lg border border-cf-border bg-cf-surface dark:divide-cf-border dark:border-cf-border dark:bg-cf-surface">
        {(sessions ?? []).length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-cf-muted">
            No sessions yet. They appear after visitors use the chat widget.
          </li>
        ) : (
          (sessions ?? []).map((s) => (
            <li key={s.id}>
              <Link
                href={`/dashboard/sessions/${s.id}`}
                className="block px-4 py-3 transition-colors hover:bg-cf-page dark:hover:bg-cf-page"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-xs text-cf-muted">{s.id}</span>
                  <span className="rounded bg-cf-border/30 px-2 py-0.5 text-xs font-medium text-cf-body dark:bg-white/10">
                    {s.project_id}
                  </span>
                </div>
                <p className="mt-1 text-xs text-cf-muted">
                  Last message:{" "}
                  {s.last_message_at
                    ? new Date(s.last_message_at).toLocaleString()
                    : "—"}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
