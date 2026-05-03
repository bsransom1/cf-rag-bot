import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteChatSessionAction } from "@/app/dashboard/actions";
import { messagesToCsv } from "@/app/dashboard/messages-to-csv";
import { ExportThreadButton } from "@/app/dashboard/export-thread-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardSessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const supabase = createServerSupabaseClient();
  const sessionId = params.sessionId;

  const { data: session, error: sessErr } = await supabase
    .from("chat_sessions")
    .select("id, project_id, started_at, last_message_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessErr || !session) {
    notFound();
  }

  const { data: messages, error: msgErr } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Could not load messages: {msgErr.message}
      </div>
    );
  }

  const messagesList = messages ?? [];
  const exportPayload = {
    session,
    messages: messagesList,
  };
  const csvExport = messagesToCsv(
    messagesList.map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    })),
  );

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm text-cf-brand-cta hover:underline"
      >
        ← All sessions
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-cf-ink dark:text-white">
            Thread
          </h1>
          <p className="mt-1 font-mono text-xs text-cf-muted">{session.id}</p>
          <p className="mt-1 text-sm text-cf-muted">
            Project: <strong>{session.project_id}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportThreadButton
            json={JSON.stringify(exportPayload, null, 2)}
            csv={csvExport}
          />
          <form action={deleteChatSessionAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <button
              type="submit"
              className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              Delete session
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {(messages ?? []).map((m) => (
          <article
            key={m.id}
            className={
              m.role === "user"
                ? "rounded-lg border border-cf-border bg-cf-page px-4 py-3 dark:border-cf-border dark:bg-cf-page"
                : "rounded-lg border border-cf-border bg-cf-surface px-4 py-3 dark:border-cf-border dark:bg-cf-surface"
            }
          >
            <div className="flex items-baseline justify-between gap-2 text-xs text-cf-muted">
              <span className="font-semibold uppercase tracking-wide text-cf-body">
                {m.role}
              </span>
              <time dateTime={m.created_at}>
                {new Date(m.created_at).toLocaleString()}
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
