import "server-only";

import { createClient } from "@supabase/supabase-js";

const PROVIDER_TIMEOUT_MS = 8_000;

function recoveryFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

/** Sends through Supabase's hosted SMTP without persisting an auth session server-side. */
export async function sendHostedPasswordRecovery(
  email: string,
  redirectTo: string,
): Promise<{ ok: boolean }> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: recoveryFetch },
    },
  );
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  return { ok: !error };
}
