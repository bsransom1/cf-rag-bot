"use client";

import { useState } from "react";

import { signInDashboardAction } from "@/app/dashboard/actions";
import {
  DASHBOARD_SITE_CONFIG,
  type DashboardSite,
} from "@/lib/dashboard/sites";

export function SiteLoginForm({ site }: { site: DashboardSite }) {
  const config = DASHBOARD_SITE_CONFIG[site];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setMsg(null);
    const result = await signInDashboardAction(formData);
    if (result?.error) {
      setMsg(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-cf-ink dark:text-white">
        {config.loginTitle}
      </h1>
      <p className="mt-2 text-sm text-cf-muted">
        Sign in with the email you were invited with to review chats.
      </p>

      <form action={onSubmit} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="site" value={site} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-cf-ink dark:text-white">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="rounded-lg border border-cf-border bg-cf-surface px-3 py-2 text-cf-body outline-none ring-cf-brand-cta focus:ring-2 dark:bg-cf-surface"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-cf-ink dark:text-white">
            Password
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="rounded-lg border border-cf-border bg-cf-surface px-3 py-2 text-cf-body outline-none ring-cf-brand-cta focus:ring-2 dark:bg-cf-surface"
          />
        </label>
        {msg ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {msg}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-cf-brand-cta px-4 py-2.5 font-medium text-white transition-colors hover:bg-cf-brand-cta-hover disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
