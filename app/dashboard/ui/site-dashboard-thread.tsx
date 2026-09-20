import { notFound } from "next/navigation";

import { getDashboardAccess } from "@/lib/dashboard/auth";
import { getDashboardThread } from "@/lib/dashboard/data";
import type { DashboardSite } from "@/lib/dashboard/sites";
import {
  DashboardShell,
  NotAllowlistedNotice,
  WrongSiteNotice,
} from "@/app/dashboard/ui/dashboard-shell";
import { SiteLoginForm } from "@/app/dashboard/ui/site-login-form";
import { ThreadView } from "@/app/dashboard/ui/thread-view";

export async function SiteDashboardThread({
  site,
  sessionId,
}: {
  site: DashboardSite;
  sessionId: string;
}) {
  const access = await getDashboardAccess();
  if (access.status === "anon") {
    return <SiteLoginForm site={site} />;
  }
  if (access.status === "forbidden") {
    return <NotAllowlistedNotice site={site} />;
  }
  if (access.site !== site) {
    return <WrongSiteNotice attempted={site} actual={access.site} />;
  }

  const { session, messages, error } = await getDashboardThread(site, sessionId);
  if (!session && !error) {
    notFound();
  }

  return (
    <DashboardShell site={site} email={access.email}>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load this conversation.
        </div>
      ) : (
        <ThreadView site={site} sessionId={sessionId} messages={messages} />
      )}
    </DashboardShell>
  );
}
