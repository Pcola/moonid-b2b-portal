const STAGING_PROJECT_REF = "booeaeyyyitlmuxixjfy";
const STAGING_ROLE = "moonid_app_staging";
const STAGING_POOLER_HOST = "aws-0-eu-central-1.pooler.supabase.com";

export type StagingRuntimeCredential = {
  password: string;
  role: typeof STAGING_ROLE;
};

function decodeUrlComponent(value: string, label: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`RUNTIME_DATABASE_URL contains an invalid percent-encoded ${label}.`);
  }
}

export function parseStagingRuntimeCredential(rawUrl: string): StagingRuntimeCredential {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("RUNTIME_DATABASE_URL is not a valid URL.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("RUNTIME_DATABASE_URL must use the postgresql protocol.");
  }

  const username = decodeUrlComponent(url.username, "username");
  const password = decodeUrlComponent(url.password, "password");
  const expectedUsername = `${STAGING_ROLE}.${STAGING_PROJECT_REF}`;

  if (username !== expectedUsername) {
    throw new Error(`RUNTIME_DATABASE_URL must use the ${STAGING_ROLE} staging role.`);
  }
  if (password.length < 32) {
    throw new Error("RUNTIME_DATABASE_URL must contain a strong runtime password of at least 32 characters.");
  }
  if (url.hostname !== STAGING_POOLER_HOST || url.port !== "6543" || url.pathname !== "/postgres") {
    throw new Error("RUNTIME_DATABASE_URL does not target the expected staging transaction pooler.");
  }
  if (
    url.searchParams.get("pgbouncer") !== "true"
    || url.searchParams.get("connection_limit") !== "1"
    || url.searchParams.get("sslmode") !== "require"
  ) {
    throw new Error("RUNTIME_DATABASE_URL is missing the required secure Prisma pooler parameters.");
  }

  return { password, role: STAGING_ROLE };
}
