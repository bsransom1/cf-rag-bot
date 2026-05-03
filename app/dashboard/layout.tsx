import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: allowed } = await supabase
    .from("dashboard_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!allowed) {
    redirect("/login?error=forbidden");
  }

  return (
    <div className="min-h-dvh bg-cf-page">
      <header className="border-b border-cf-border bg-cf-surface px-4 py-3 dark:border-cf-border dark:bg-cf-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="font-display text-lg font-semibold text-cf-ink dark:text-white"
          >
            Chat transcripts
          </Link>
          <nav className="flex items-center gap-3 text-sm text-cf-muted">
            <span className="truncate text-cf-body" title={user.email ?? ""}>
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-cf-brand-cta hover:underline"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
