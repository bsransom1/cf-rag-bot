/**
 * Supabase clients.
 *
 * Two separate clients so we never leak the service-role key into request
 * handlers that could be reached from the browser:
 *
 *   - `getSupabaseRuntimeClient()` uses the anon key. Safe for Next.js
 *     server routes and server components. Vector search is invoked via the
 *     `match_documents` RPC which is callable with the anon role.
 *
 *   - `getSupabaseAdminClient()` uses the service-role key. ONLY for
 *     Node-side scripts (e.g. the ingestion CLI). Never import from `app/`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let runtimeClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Check your .env file (see .env.example).`,
    );
  }
  return value;
}

export function getSupabaseRuntimeClient(): SupabaseClient {
  if (runtimeClient) return runtimeClient;
  const url = required("SUPABASE_URL", process.env.SUPABASE_URL);
  const anonKey = required("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY);
  runtimeClient = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return runtimeClient;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const url = required("SUPABASE_URL", process.env.SUPABASE_URL);
  const serviceKey = required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return adminClient;
}
