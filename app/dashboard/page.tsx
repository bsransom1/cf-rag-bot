import { redirect } from "next/navigation";

import { getDashboardAccess } from "@/lib/dashboard/auth";
import {
  DASHBOARD_SITE_CONFIG,
  dashboardLandingPath,
} from "@/lib/dashboard/sites";

export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  const access = await getDashboardAccess();
  if (access.status === "ok") {
    redirect(dashboardLandingPath(access.sites));
  }
  redirect(DASHBOARD_SITE_CONFIG.CF.path);
}
