import "server-only";
import { createClient } from "@supabase/supabase-js";

const ADMIN_API_TIMEOUT_MS = 8_000;

/** Provider výpadok nesmie neobmedzene držať privilegovanú server action ani DB lock. */
function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(ADMIN_API_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

// Admin (service-role) klient — LEN na serveri (vytváranie pozvánok, userov).
// NIKDY neimportovať do klientskeho kódu.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: adminFetch },
  });
}
