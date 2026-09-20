import { SiteDashboardThread } from "@/app/dashboard/ui/site-dashboard-thread";

export const dynamic = "force-dynamic";

export default function CodiceFiscaleThreadPage({
  params,
}: {
  params: { sessionId: string };
}) {
  return <SiteDashboardThread site="CF" sessionId={params.sessionId} />;
}
