import { redirect } from "next/navigation";

import { getDashboardAccess } from "@/lib/dashboard/auth";
import { DASHBOARD_SITE_CONFIG } from "@/lib/dashboard/sites";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const access = await getDashboardAccess();
  if (access.status === "ok") {
    redirect(DASHBOARD_SITE_CONFIG[access.site].path);
  }
  redirect(DASHBOARD_SITE_CONFIG.CF.path);
}
