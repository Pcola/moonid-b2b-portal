import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { MfaChallengeForm } from "./mfa-challenge-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dvojfaktorové overenie — Moonid", robots: { index: false, follow: false } };

// Nepoužíva requireStaff (tá by pri AAL1+faktor presmerovala späť sem = loop).
export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // ak nie je čo overovať (žiadny faktor alebo už AAL2), používateľ sem nepatrí.
  // Pri chybe (aal undefined) NErobíme redirect — inak by fail-closed mfaStatus() vytvoril
  // slučku /staff↔/mfa. Radšej ostane na výzve (fail-closed); trvalý výpadok = MFA_ENFORCE=off.
  if (aal && !(aal.nextLevel === "aal2" && aal.currentLevel === "aal1")) {
    redirect(user.role === "STAFF" || user.role === "ADMIN" ? "/staff" : "/dashboard");
  }

  const { next } = await searchParams;
  return (
    <AuthShell panel={<AuthPanel headline="Dvojfaktorové overenie" lead="Ešte jeden krok — zadajte kód z vašej autentifikačnej aplikácie." />}>
      <div className="flex flex-col gap-2.5">
        <h2 className="text-[32px] tracking-[-0.01em] text-ink">Overenie</h2>
        <p className="text-[15px] leading-relaxed text-muted">Zadajte 6-miestny kód z aplikácie (Google Authenticator, Authy, 1Password…).</p>
      </div>
      <MfaChallengeForm next={next ?? "/staff"} />
    </AuthShell>
  );
}
