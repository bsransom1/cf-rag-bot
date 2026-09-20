"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDashboardAccess } from "@/lib/dashboard/auth";
import { deleteDashboardConversation } from "@/lib/dashboard/data";
import {
  DASHBOARD_SITE_CONFIG,
  parseDashboardSite,
} from "@/lib/dashboard/sites";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signInDashboardAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  const site = parseDashboardSite(formData.get("site"));
  const email = formData.get("email");
  const password = formData.get("password");
  const home = site
    ? DASHBOARD_SITE_CONFIG[site].path
    : DASHBOARD_SITE_CONFIG.CF.path;

  if (typeof email !== "string" || typeof password !== "string" || !site) {
    return { error: "Enter your email and password." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    return { error: error.message };
  }

  redirect(home);
}

export async function deleteChatSessionAction(
  formData: FormData,
): Promise<void> {
  const raw = formData.get("sessionId");
  const site = parseDashboardSite(formData.get("site"));
  if (typeof raw !== "string" || raw.length === 0 || !site) {
    throw new Error("Missing conversation");
  }

  const access = await getDashboardAccess();
  const home = DASHBOARD_SITE_CONFIG[site].path;
  if (access.status === "anon") {
    redirect(home);
  }
  if (access.status !== "ok" || access.site !== site) {
    redirect(home);
  }

  await deleteDashboardConversation(site, raw);
  revalidatePath(home);
  redirect(home);
}
