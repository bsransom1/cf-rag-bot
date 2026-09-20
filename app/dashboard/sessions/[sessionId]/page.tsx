import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacySessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  redirect(`/dashboard/CF/${params.sessionId}`);
}
