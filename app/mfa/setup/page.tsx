import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { MfaSetup } from "@/app/staff/bezpecnost/mfa-setup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nastavenie 2FA — Moonid", robots: { index: false, follow: false } };

/**
 * Povinný enrolment 2FA pre STAFF/ADMIN. Zámerne MIMO /staff layoutu (a nepoužíva
 * requireStaff) — inak by vynútenie enrolmentu v requireStaff presmerovalo sem donekonečna.
 * Gate len na staff rolu cez getCurrentUser. Po úspešnom zapnutí (enrolled=true) → /staff.
 */
export default async function MfaSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STAFF" && user.role !== "ADMIN") redirect("/dashboard");

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const enrolled = (factors?.totp?.length ?? 0) > 0;
  if (enrolled) redirect("/staff"); // už zaregistrovaný → do administrácie

  return (
    <AuthShell
      panel={
        <AuthPanel
          eyebrow="Povinné pre staff"
          headline="Zapnite dvojfaktorové overenie"
          lead="Privilegovaný účet vyžaduje 2FA. Zaberie to minútu — potom máte plný prístup do administrácie."
        />
      }
    >
      <div className="flex flex-col gap-2.5">
        <h2 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-ink">Zabezpečte svoj účet</h2>
        <p className="text-[15px] leading-relaxed text-muted">
          Staff a admin kontá musia mať zapnuté dvojfaktorové overenie — chráni celú zákaznícku
          databázu, aj keď niekto získa vaše heslo. Bez neho sa do administrácie nedostanete.
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-white p-6">
        <MfaSetup enrolled={false} email={user.email} />
      </div>
      <form action="/auth/logout" method="post">
        <button type="submit" className="text-[13.5px] font-medium text-muted-2 transition-colors hover:text-ink">
          Odhlásiť sa
        </button>
      </form>
    </AuthShell>
  );
}
