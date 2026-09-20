import { SiteDashboardThread } from "@/app/dashboard/ui/site-dashboard-thread";

export const dynamic = "force-dynamic";

export default function ItalianNotaryThreadPage({
  params,
}: {
  params: { sessionId: string };
}) {
  return (
    <SiteDashboardThread site="italian-notary" sessionId={params.sessionId} />
  );
}
