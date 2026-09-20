import Link from "next/link";

import {
  DASHBOARD_SITE_CONFIG,
  type DashboardSite,
} from "@/lib/dashboard/sites";

export function DashboardShell({
  site,
  email,
  children,
}: {
  site: DashboardSite;
  email: string | null;
  children: React.ReactNode;
}) {
  const config = DASHBOARD_SITE_CONFIG[site];
  return (
    <div className="min-h-dvh bg-cf-page">
      <header className="border-b border-cf-border bg-cf-surface px-4 py-3 dark:border-cf-border dark:bg-cf-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href={config.path}
            className="font-display text-lg font-semibold text-cf-ink dark:text-white"
          >
            {config.title}
          </Link>
          <nav className="flex items-center gap-3 text-sm text-cf-muted">
            {email ? (
              <span className="truncate text-cf-body" title={email}>
                {email}
              </span>
            ) : null}
            <form action="/auth/signout" method="post">
              <input type="hidden" name="next" value={config.path} />
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

export function WrongSiteNotice({
  attempted,
  actual,
}: {
  attempted: DashboardSite;
  actual: DashboardSite;
}) {
  const here = DASHBOARD_SITE_CONFIG[attempted];
  const there = DASHBOARD_SITE_CONFIG[actual];
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-cf-ink dark:text-white">
        This page is for {here.loginTitle}
      </h1>
      <p className="mt-2 text-sm text-cf-muted">
        Your login is for {there.loginTitle}. Open that dashboard instead.
      </p>
      <Link
        href={there.path}
        className="mt-6 rounded-lg bg-cf-brand-cta px-4 py-2.5 text-center font-medium text-white hover:bg-cf-brand-cta-hover"
      >
        Go to {there.title}
      </Link>
      <form action="/auth/signout" method="post" className="mt-4 text-center">
        <input type="hidden" name="next" value={here.path} />
        <button type="submit" className="text-sm text-cf-brand-cta hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}

export function NotAllowlistedNotice({ site }: { site: DashboardSite }) {
  const config = DASHBOARD_SITE_CONFIG[site];
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-cf-ink dark:text-white">
        {config.loginTitle}
      </h1>
      <p className="mt-2 text-sm text-cf-muted">
        You are signed in, but this account is not set up to review chats. Ask
        an admin to add you.
      </p>
      <form action="/auth/signout" method="post" className="mt-6">
        <input type="hidden" name="next" value={config.path} />
        <button
          type="submit"
          className="rounded-lg bg-cf-brand-cta px-4 py-2.5 font-medium text-white hover:bg-cf-brand-cta-hover"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
