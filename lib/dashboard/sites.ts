/** Dashboard “rooms”: one URL per site, one allowlist value each. */

export const DASHBOARD_SITES = ["CF", "italian-notary"] as const;

export type DashboardSite = (typeof DASHBOARD_SITES)[number];

export interface DashboardSiteConfig {
  slug: DashboardSite;
  path: string;
  title: string;
  loginTitle: string;
  projectId: string;
}

export const DASHBOARD_SITE_CONFIG: Record<DashboardSite, DashboardSiteConfig> =
  {
    CF: {
      slug: "CF",
      path: "/dashboard/CF",
      title: "CodiceFiscale.ai chats",
      loginTitle: "CodiceFiscale.ai",
      projectId: "italian_immigration",
    },
    "italian-notary": {
      slug: "italian-notary",
      path: "/dashboard/italian-notary",
      title: "ItalianNotary.com chats",
      loginTitle: "ItalianNotary.com",
      projectId: "italian_notary",
    },
  };

export function isDashboardSite(value: string): value is DashboardSite {
  return (DASHBOARD_SITES as readonly string[]).includes(value);
}

export function parseDashboardSite(value: unknown): DashboardSite | null {
  if (typeof value !== "string") return null;
  return isDashboardSite(value) ? value : null;
}

/** Where /dashboard and /login send someone who can open one or both rooms. */
export function dashboardLandingPath(sites: readonly DashboardSite[]): string {
  if (sites.includes("italian-notary")) {
    return DASHBOARD_SITE_CONFIG["italian-notary"].path;
  }
  const site = sites[0] ?? "CF";
  return DASHBOARD_SITE_CONFIG[site].path;
}

/** Date + time, no seconds: "Sep 19, 2026, 8:44 PM". */
export function formatDashboardTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
