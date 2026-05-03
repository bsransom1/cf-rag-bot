/**
 * Database profiles — maps logical Supabase backends to env vars.
 *
 * - Profile `"default"`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
 *   `SUPABASE_SERVICE_ROLE_KEY` (existing production / local setup).
 * - Any other profile id (e.g. `"eu"`, `"client_acme"`): expects
 *   `SUPABASE_URL_EU`, `SUPABASE_ANON_KEY_EU`, `SUPABASE_SERVICE_ROLE_KEY_EU`
 *   where the suffix is the profile id uppercased with non-alphanumerics → `_`.
 *
 * Each `ProjectConfig` can set optional `databaseProfileId` to pick a profile.
 * Omitting it keeps the current single-database behavior and existing embeds.
 */

export const DEFAULT_DATABASE_PROFILE_ID = "default" as const;

export type DatabaseProfileId = string;

export function requiredEnv(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Check your .env file (see .env.example).`,
    );
  }
  return value;
}

export interface DatabaseProfileCredentials {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

/** Normalize project config values: empty or "default" → primary Supabase env. */
export function resolveDatabaseProfileId(
  raw: string | undefined,
): DatabaseProfileId {
  if (raw === undefined) return DEFAULT_DATABASE_PROFILE_ID;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return DEFAULT_DATABASE_PROFILE_ID;
  if (trimmed.toLowerCase() === DEFAULT_DATABASE_PROFILE_ID) {
    return DEFAULT_DATABASE_PROFILE_ID;
  }
  return trimmed;
}

function profileEnvSuffix(profileId: DatabaseProfileId): string {
  const upper = profileId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  if (upper.length === 0 || upper === "DEFAULT") {
    throw new Error(
      `Invalid database profile id "${profileId}". ` +
        `Use "${DEFAULT_DATABASE_PROFILE_ID}" for the primary Supabase project, ` +
        `or a non-default id with matching SUPABASE_*_${upper} variables.`,
    );
  }
  return upper;
}

/**
 * Full credentials for a profile. Used by runtime (url + anon) and ingest (url + service role).
 */
export function getDatabaseProfileCredentials(
  profileId: DatabaseProfileId,
): DatabaseProfileCredentials {
  if (profileId === DEFAULT_DATABASE_PROFILE_ID) {
    return {
      url: requiredEnv("SUPABASE_URL", process.env.SUPABASE_URL),
      anonKey: requiredEnv("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY),
      serviceRoleKey: requiredEnv(
        "SUPABASE_SERVICE_ROLE_KEY",
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
    };
  }

  const suffix = profileEnvSuffix(profileId);
  const urlKey = `SUPABASE_URL_${suffix}` as const;
  const anonKey = `SUPABASE_ANON_KEY_${suffix}` as const;
  const serviceKey = `SUPABASE_SERVICE_ROLE_KEY_${suffix}` as const;

  return {
    url: requiredEnv(urlKey, process.env[urlKey]),
    anonKey: requiredEnv(anonKey, process.env[anonKey]),
    serviceRoleKey: requiredEnv(serviceKey, process.env[serviceKey]),
  };
}
