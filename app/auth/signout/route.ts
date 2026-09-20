import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DASHBOARD_SITE_CONFIG } from "@/lib/dashboard/sites";
import { NextResponse } from "next/server";

function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return DASHBOARD_SITE_CONFIG.CF.path;
  if (value === DASHBOARD_SITE_CONFIG.CF.path) return value;
  if (value === DASHBOARD_SITE_CONFIG["italian-notary"].path) return value;
  if (value.startsWith("/dashboard/CF/")) return DASHBOARD_SITE_CONFIG.CF.path;
  if (value.startsWith("/dashboard/italian-notary/")) {
    return DASHBOARD_SITE_CONFIG["italian-notary"].path;
  }
  return DASHBOARD_SITE_CONFIG.CF.path;
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  const form = await request.formData().catch(() => null);
  const next = safeNext(form?.get("next") ?? null);
  return NextResponse.redirect(new URL(next, request.url));
}
