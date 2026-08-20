const PASSWORD_SETUP_TYPES = new Set(["invite", "recovery"]);

/**
 * Supabase Dashboard e-mails use an implicit session in the URL fragment. The
 * fragment never reaches a server callback, so route only the two password
 * setup flows to the client page that can verify and consume that session.
 */
export function isPasswordSetupFragment(hash: string): boolean {
  if (!hash.startsWith("#")) return false;

  const params = new URLSearchParams(hash.slice(1));
  return (
    PASSWORD_SETUP_TYPES.has(params.get("type") ?? "") &&
    Boolean(params.get("access_token")) &&
    Boolean(params.get("refresh_token"))
  );
}

