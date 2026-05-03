/**
 * Persist chat turns to Supabase (service-role client). Failures are logged;
 * callers can choose to swallow errors so /api/chat still returns when logging
 * is misconfigured.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

function logPersistError(err: unknown, context: string): void {
  console.error(`[chat persist] ${context}:`, err);
}

export async function persistSessionAndUserMessageSafe(
  supabase: SupabaseClient,
  params: {
    sessionId: string;
    projectId: string;
    userMessage: string;
    clientMessageId?: string | null;
  },
): Promise<boolean> {
  try {
    const { error: rpcError } = await supabase.rpc("upsert_chat_session", {
      p_session_id: params.sessionId,
      p_project_id: params.projectId,
    });
    if (rpcError) {
      logPersistError(rpcError, "upsert_chat_session");
      return false;
    }

    const userRow: Record<string, unknown> = {
      session_id: params.sessionId,
      project_id: params.projectId,
      role: "user",
      content: params.userMessage,
    };
    if (params.clientMessageId) {
      userRow.client_message_id = params.clientMessageId;
    }

    const { error: userIns } = await supabase.from("chat_messages").insert(userRow);
    if (userIns) {
      logPersistError(userIns, "insert user message");
      return false;
    }
    return true;
  } catch (err) {
    logPersistError(err, "persistSessionAndUserMessageSafe");
    return false;
  }
}

export async function persistAssistantMessageSafe(
  supabase: SupabaseClient,
  params: {
    sessionId: string;
    projectId: string;
    content: string;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from("chat_messages").insert({
      session_id: params.sessionId,
      project_id: params.projectId,
      role: "assistant",
      content: params.content,
    });
    if (error) {
      logPersistError(error, "insert assistant message");
    }
  } catch (err) {
    logPersistError(err, "persistAssistantMessageSafe");
  }
}
