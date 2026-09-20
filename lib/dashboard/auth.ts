import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  parseDashboardSite,
  type DashboardSite,
} from "@/lib/dashboard/sites";

export type DashboardAccess =
  | { status: "anon" }
  | { status: "forbidden" }
  | { status: "ok"; site: DashboardSite; email: string | null };

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
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      const fallback = await supabase
        .from("dashboard_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!fallback.data) return { status: "forbidden" };
      return { status: "ok", site: "CF", email: user.email ?? null };
    }

    if (!data) return { status: "forbidden" };
    const site = parseDashboardSite(data.site) ?? "CF";
    return { status: "ok", site, email: user.email ?? null };
  } catch {
    return { status: "anon" };
  }
}
