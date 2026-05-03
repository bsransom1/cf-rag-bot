"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(
    error === "forbidden"
      ? "You are signed in but are not allowlisted for the dashboard. Ask an admin to add your user id to public.dashboard_users."
      : error === "config"
        ? "Server missing NEXT_PUBLIC Supabase configuration."
        : error === "auth"
          ? "Sign-in failed or link expired."
          : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setMsg(signErr.message);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-semibold text-cf-ink dark:text-white">
        Dashboard sign-in
      </h1>
      <p className="mt-2 text-sm text-cf-muted">
        For internal reviewers only. Use the account your admin invited.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-cf-ink dark:text-white">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
