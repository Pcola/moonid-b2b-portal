const PASSWORD_SETUP_METHODS = new Set(["invite", "recovery"]);
export const PASSWORD_SETUP_GRANT_MAX_AGE_SEC = 15 * 60;
const CLOCK_SKEW_SEC = 60;

type ClaimsLike = {
  amr?: unknown;
};

/**
 * Password setup is allowed only for a freshly verified Supabase invite/recovery
 * grant. A normal password/MFA session must never be enough to reach updateUser.
 *
 * String-only RFC 8176 AMR entries are deliberately rejected because they do not
 * contain a timestamp and therefore cannot prove that the grant is recent.
 */
export function hasRecentPasswordSetupGrant(
  claims: unknown,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!claims || typeof claims !== "object") return false;

  const amr = (claims as ClaimsLike).amr;
  if (!Array.isArray(amr)) return false;

  return amr.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const method = (entry as { method?: unknown }).method;
    const timestamp = (entry as { timestamp?: unknown }).timestamp;
    if (typeof method !== "string" || !PASSWORD_SETUP_METHODS.has(method)) return false;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return false;
    if (timestamp > nowSec + CLOCK_SKEW_SEC) return false;
    return nowSec - timestamp <= PASSWORD_SETUP_GRANT_MAX_AGE_SEC;
  });
}
