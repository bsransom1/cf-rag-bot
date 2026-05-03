"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

async function requireDashboardUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }
  const { data: allowed } = await supabase
    .from("dashboard_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!allowed) {
    redirect("/login?error=forbidden");
  }
  return supabase;
}

export async function deleteChatSessionAction(
  formData: FormData,
): Promise<void> {
  const raw = formData.get("sessionId");
  if (typeof raw !== "string" || raw.length === 0) {
    throw new Error("Missing sessionId");
  }
  const supabase = await requireDashboardUser();
  await supabase.from("chat_sessions").delete().eq("id", raw);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
