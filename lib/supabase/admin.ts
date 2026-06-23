import "server-only";
import { createClient } from "@supabase/supabase-js";

// Admin (service-role) klient — LEN na serveri (vytváranie pozvánok, userov).
// NIKDY neimportovať do klientskeho kódu.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
