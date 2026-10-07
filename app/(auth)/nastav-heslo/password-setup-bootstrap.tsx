"use client";

import { useEffect, useState } from "react";
import { LiveMessage } from "@/components/ui/live-region";
import { isPasswordSetupFragment } from "@/lib/auth-email-fragment";
import { createClient } from "@/lib/supabase/client";
import { activateImplicitPasswordSetupSession } from "./actions";

const INVALID_LINK = "Odkaz vypršal alebo je neplatný. Požiadajte o nový odkaz.";

/** Consumes a legacy implicit Supabase fragment, then lets the server verify its JWT claims. */
export function PasswordSetupBootstrap() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let navigationTimeout: number | undefined;
    let installedClient: ReturnType<typeof createClient> | null = null;

    async function consumeFragment() {
      try {
        const callbackHash = window.location.hash;
        const recoveryNonce = new URL(window.location.href).searchParams.get("grant");
        // Capability aj Supabase bearer tokeny odstránime ešte pred akýmkoľvek requestom.
        window.history.replaceState(null, "", window.location.pathname);
        if (!isPasswordSetupFragment(callbackHash)) {
          if (active) setError(INVALID_LINK);
          return;
        }

        const params = new URLSearchParams(callbackHash.slice(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (!accessToken || !refreshToken || !recoveryNonce) {
          if (active) setError(INVALID_LINK);
          return;
        }

        const supabase = createClient();
        installedClient = supabase;
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!active) return;
        if (sessionError) {
          setError(INVALID_LINK);
          return;
        }
        const activated = await activateImplicitPasswordSetupSession(recoveryNonce);
        if (!active) return;
        if (!activated.ok) {
          await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
          installedClient = null;
          setError(INVALID_LINK);
          return;
        }
        // A full navigation guarantees that the server receives the freshly
        // written auth cookies. A client-only refresh could keep this bootstrap
        // mounted forever when the server rejected the previous render.
        navigationTimeout = window.setTimeout(() => {
          if (active) {
            setError("Odkaz bol overený, ale reláciu sa nepodarilo potvrdiť. Požiadajte o nový odkaz.");
          }
        }, 8_000);
        window.location.replace(window.location.pathname);
      } catch {
        if (installedClient) {
          await installedClient.auth.signOut({ scope: "local" }).catch(() => undefined);
          installedClient = null;
        }
        if (active) setError("Odkaz sa nepodarilo overiť. Skúste to znova alebo požiadajte o nový odkaz.");
      }
    }

    void consumeFragment();
    return () => {
      active = false;
      if (navigationTimeout !== undefined) window.clearTimeout(navigationTimeout);
    };
  }, []);

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
