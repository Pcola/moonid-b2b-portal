export const PASSWORD_SETUP_PATH = "/nastav-heslo";

/**
 * Default Supabase e-mail templates complete verification on /auth/v1/verify
 * and redirect back with the session in the URL fragment. Fragments never
 * reach the server, so an otherwise parameter-less callback must continue to
 * the client password page where the fragment can be consumed and removed.
 */
export function isImplicitPasswordSetupCallback(
  code: string | null,
  tokenHash: string | null,
  next: string,
): boolean {
  return !code && !tokenHash && next === PASSWORD_SETUP_PATH;
}

/** Do not refresh a stale session before the callback exchanges a new token. */
export function shouldRefreshSession(pathname: string): boolean {
  return pathname !== "/auth/callback";
}
