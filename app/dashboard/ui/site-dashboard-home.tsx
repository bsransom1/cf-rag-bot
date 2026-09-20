import { getDashboardAccess } from "@/lib/dashboard/auth";
import { listDashboardConversations } from "@/lib/dashboard/data";
import type { DashboardSite } from "@/lib/dashboard/sites";
import { ConversationList } from "@/app/dashboard/ui/conversation-list";
import {
  DashboardShell,
  NotAllowlistedNotice,
  WrongSiteNotice,
} from "@/app/dashboard/ui/dashboard-shell";
import { SiteLoginForm } from "@/app/dashboard/ui/site-login-form";

export async function SiteDashboardHome({ site }: { site: DashboardSite }) {
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

  const { conversations, error } = await listDashboardConversations(site);
  return (
    <DashboardShell site={site} email={access.email}>
      <ConversationList
        site={site}
        conversations={conversations}
        error={error}
      />
    </DashboardShell>
  );
}
