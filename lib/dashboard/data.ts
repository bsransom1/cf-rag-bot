import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdminClientForProject } from "@/lib/db/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DASHBOARD_SITE_CONFIG,
  type DashboardSite,
} from "@/lib/dashboard/sites";

const PREVIEW_LENGTH = 140;

export interface DashboardConversation {
  id: string;
  preview: string;
  lastMessageAt: string | null;
}

export interface DashboardMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

function transcriptClient(site: DashboardSite): SupabaseClient {
  if (site === "italian-notary") {
    return getSupabaseAdminClientForProject("italian_notary");
  }
  return createServerSupabaseClient() as unknown as SupabaseClient;
}

function asError(err: unknown): string {
  return err instanceof Error ? err.message : "Could not load conversations";
}

function clipPreview(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= PREVIEW_LENGTH) return oneLine;
  return `${oneLine.slice(0, PREVIEW_LENGTH).trimEnd()}…`;
}

export async function listDashboardConversations(
  site: DashboardSite,
): Promise<{ conversations: DashboardConversation[]; error: string | null }> {
  try {
    const supabase = transcriptClient(site);
    const projectId = DASHBOARD_SITE_CONFIG[site].projectId;

    const { data: sessions, error: sessErr } = await supabase
      .from("chat_sessions")
      .select("id, last_message_at")
      .eq("project_id", projectId)
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (sessErr) {
      return { conversations: [], error: sessErr.message };
    }
    if (!sessions || sessions.length === 0) {
      return { conversations: [], error: null };
    }

    const ids = sessions.map((s) => s.id);
    const { data: messages, error: msgErr } = await supabase
      .from("chat_messages")
      .select("session_id, content, created_at")
      .eq("role", "user")
      .in("session_id", ids)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return { conversations: [], error: msgErr.message };
    }

    const firstBySession = new Map<string, string>();
    for (const row of messages ?? []) {
      if (!firstBySession.has(row.session_id)) {
        firstBySession.set(row.session_id, row.content);
      }
    }

    return {
      conversations: sessions.map((s) => ({
        id: s.id,
        preview: clipPreview(firstBySession.get(s.id) ?? "Conversation"),
        lastMessageAt: s.last_message_at,
      })),
      error: null,
    };
  } catch (err) {
    return { conversations: [], error: asError(err) };
  }
}

export async function getDashboardThread(
  site: DashboardSite,
  sessionId: string,
): Promise<{
  session: { id: string; lastMessageAt: string | null } | null;
  messages: DashboardMessage[];
  error: string | null;
}> {
  try {
    const supabase = transcriptClient(site);
    const projectId = DASHBOARD_SITE_CONFIG[site].projectId;

    const { data: session, error: sessErr } = await supabase
      .from("chat_sessions")
      .select("id, last_message_at, project_id")
      .eq("id", sessionId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (sessErr) {
      return { session: null, messages: [], error: sessErr.message };
    }
    if (!session) {
      return { session: null, messages: [], error: null };
    }

    const { data: messages, error: msgErr } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return {
        session: { id: session.id, lastMessageAt: session.last_message_at },
        messages: [],
        error: msgErr.message,
      };
    }

    return {
      session: { id: session.id, lastMessageAt: session.last_message_at },
      messages: (messages ?? []).map((m) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        createdAt: m.created_at,
      })),
      error: null,
    };
  } catch (err) {
    return { session: null, messages: [], error: asError(err) };
  }
}

export async function deleteDashboardConversation(
  site: DashboardSite,
  sessionId: string,
): Promise<void> {
  const supabase = transcriptClient(site);
  const projectId = DASHBOARD_SITE_CONFIG[site].projectId;
  await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("project_id", projectId);
}
