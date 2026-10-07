import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { createClient } from "@/lib/supabase/server";
import { hasRecentPasswordSetupGrant } from "@/lib/password-setup-session";
import { PasswordSetupBootstrap } from "./password-setup-bootstrap";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Nastavenie hesla — Moonid B2B portál" };
export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const canSetPassword = hasRecentPasswordSetupGrant(claims);
  const email = canSetPassword && typeof claims?.email === "string" ? claims.email : null;

  return (
    <AuthShell
      panel={
        <AuthPanel
          headline="Nastavte si nové heslo"
          lead="Zvoľte si bezpečné heslo a pokračujte rovno do portálu."
        />
      }
    >
      <div className="flex flex-col gap-2.5">
        <h1 className="text-[32px] tracking-[-0.01em] text-ink">Nastavenie hesla</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          {email ? <>Nastavujete heslo pre účet <strong className="font-semibold text-ink">{email}</strong>.</> : "Zadajte nové heslo k vášmu firemnému účtu."}
        </p>
      </div>
      {canSetPassword ? <SetPasswordForm email={email} /> : <PasswordSetupBootstrap />}
    </AuthShell>
  );
}
