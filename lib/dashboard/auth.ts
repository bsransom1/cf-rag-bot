import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  parseDashboardSite,
  type DashboardSite,
} from "@/lib/dashboard/sites";

export type DashboardAccess =
  | { status: "anon" }
  | { status: "forbidden" }
  | { status: "ok"; sites: DashboardSite[]; email: string | null };

function sitesFromRows(rows: { site: string | null }[]): DashboardSite[] {
  const found = new Set<DashboardSite>();
  for (const row of rows) {
    const site = parseDashboardSite(row.site);
    if (site) found.add(site);
  }
  return (["CF", "italian-notary"] as const).filter((site) => found.has(site));
}

export async function getDashboardAccess(): Promise<DashboardAccess> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "anon" };

    const { data, error } = await supabase
      .from("dashboard_users")
      .select("user_id, site")
      .eq("user_id", user.id);

    if (error) {
      const fallback = await supabase
        .from("dashboard_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!fallback.data) return { status: "forbidden" };
      return { status: "ok", sites: ["CF"], email: user.email ?? null };
    }

    const sites = sitesFromRows(data ?? []);
    if (sites.length === 0) return { status: "forbidden" };
    return { status: "ok", sites, email: user.email ?? null };
  } catch {
    return { status: "anon" };
  }
}
