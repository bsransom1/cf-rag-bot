/**
 * Supabase clients.
 *
 * Two separate client kinds so we never leak the service-role key into request
 * handlers that could be reached from the browser:
 *
 *   - Runtime clients use the anon key. Safe for Next.js server routes and
 *     server components. Vector search uses the `match_documents` RPC.
 *
 *   - Admin clients use the service-role key. ONLY for Node-side scripts
 *     (e.g. the ingestion CLI). Never import admin helpers from `app/`.
 *
 * Multiple Supabase backends: configure `databaseProfileId` on each
 * `ProjectConfig`, then set matching `SUPABASE_*_<SUFFIX>` env vars for
 * non-default profiles (see `lib/db/profiles.ts`). Omit `databaseProfileId`
 * to keep using the original `SUPABASE_URL` trio — unchanged embeds / deploys.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getProject } from "@/lib/config/project";
import {
  DEFAULT_DATABASE_PROFILE_ID,
  getDatabaseProfileCredentials,
  resolveDatabaseProfileId,
  type DatabaseProfileId,
} from "@/lib/db/profiles";

const runtimeClients = new Map<DatabaseProfileId, SupabaseClient>();
const adminClients = new Map<DatabaseProfileId, SupabaseClient>();

function getOrCreateRuntimeClient(profileId: DatabaseProfileId): SupabaseClient {
  const cached = runtimeClients.get(profileId);
  if (cached) return cached;

  const { url, anonKey } = getDatabaseProfileCredentials(profileId);
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  runtimeClients.set(profileId, client);
  return client;
}

function getOrCreateAdminClient(profileId: DatabaseProfileId): SupabaseClient {
  const cached = adminClients.get(profileId);
  if (cached) return cached;

  const { url, serviceRoleKey } = getDatabaseProfileCredentials(profileId);
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  adminClients.set(profileId, client);
  return client;
}

/**
 * Runtime client for the primary (default) Supabase project — same as before
 * modularizing profiles.
 */
export function getSupabaseRuntimeClient(): SupabaseClient {
  return getOrCreateRuntimeClient(DEFAULT_DATABASE_PROFILE_ID);
}

/**
 * Runtime client for a specific database profile (advanced / multi-tenant DB).
 */
export function getSupabaseRuntimeClientForProfile(
  profileId: DatabaseProfileId,
): SupabaseClient {
  return getOrCreateRuntimeClient(resolveDatabaseProfileId(profileId));
}

/**
 * Resolves `project.databaseProfileId` (if any) and returns the matching client.
 */
export function getSupabaseRuntimeClientForProject(
  projectId: string,
): SupabaseClient {
  const project = getProject(projectId);
  const profileId = resolveDatabaseProfileId(project.databaseProfileId);
  return getOrCreateRuntimeClient(profileId);
}

/** Admin client for the primary Supabase project (ingest scripts). */
export function getSupabaseAdminClient(): SupabaseClient {
  return getOrCreateAdminClient(DEFAULT_DATABASE_PROFILE_ID);
}

export function getSupabaseAdminClientForProfile(
  profileId: DatabaseProfileId,
): SupabaseClient {
  return getOrCreateAdminClient(resolveDatabaseProfileId(profileId));
}

export function getSupabaseAdminClientForProject(
  projectId: string,
): SupabaseClient {
  const project = getProject(projectId);
  const profileId = resolveDatabaseProfileId(project.databaseProfileId);
  return getOrCreateAdminClient(profileId);
}
