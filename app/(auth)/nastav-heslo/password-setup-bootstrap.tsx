"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveMessage } from "@/components/ui/live-region";
import { isPasswordSetupFragment } from "@/lib/auth-email-fragment";
import { createClient } from "@/lib/supabase/client";

const INVALID_LINK = "Odkaz vypršal alebo je neplatný. Požiadajte o nový odkaz.";

/** Consumes a legacy implicit Supabase fragment, then lets the server verify its JWT claims. */
export function PasswordSetupBootstrap() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function consumeFragment() {
      try {
        if (!isPasswordSetupFragment(window.location.hash)) {
          if (active) setError(INVALID_LINK);
          return;
        }

        const params = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        if (!accessToken || !refreshToken) {
          if (active) setError(INVALID_LINK);
          return;
        }

        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!active) return;
        if (sessionError) {
          setError(INVALID_LINK);
          return;
        }
        router.refresh();
      } catch {
        if (active) setError("Odkaz sa nepodarilo overiť. Skúste to znova alebo požiadajte o nový odkaz.");
      }
    }

    void consumeFragment();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex flex-col gap-3">
      <LiveMessage message={error ?? "Overujem odkaz…"} tone={error ? "error" : undefined} />
      <div className={`rounded-[10px] border px-3.5 py-2.5 text-[13.5px] ${error ? "border-danger-line bg-danger text-danger-ink" : "border-line bg-cream/40 text-muted"}`}>
        {error ?? "Overujem bezpečnostný odkaz…"}
      </div>
      {error && <a href="/zabudnute-heslo" className="text-[13.5px] font-semibold text-brand hover:text-brand-2">Požiadať o nový odkaz</a>}
    </div>
  );
}
