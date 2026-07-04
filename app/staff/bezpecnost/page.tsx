import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MfaSetup } from "./mfa-setup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Bezpečnosť", robots: { index: false, follow: false } };

export default async function BezpecnostPage() {
  const user = await requireStaff();
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const enrolled = (factors?.totp?.length ?? 0) > 0;

  return (
    <div className="flex max-w-[720px] flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-normal tracking-[-0.01em] text-ink">Bezpečnosť konta</h1>
        <p className="mt-1 text-[14px] text-muted">Dvojfaktorové overenie (2FA/TOTP) chráni váš privilegovaný účet — aj keď niekto získa heslo, bez kódu z vašej aplikácie sa neprihlási. Odporúčané pre všetky staff/admin kontá.</p>
      </div>
      <div className="rounded-2xl border border-line bg-white p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] ${enrolled ? "bg-[#ecfdf3] text-[#14633f]" : "bg-cream text-muted"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          </span>
          <div>
            <div className="text-[15px] font-semibold text-ink">Dvojfaktorové overenie</div>
            <div className={`text-[13px] ${enrolled ? "text-[#14633f]" : "text-muted-2"}`}>{enrolled ? "Aktívne — pri prihlásení sa vyžaduje kód" : "Neaktívne"}</div>
          </div>
        </div>
        <MfaSetup enrolled={enrolled} email={user.email} />
      </div>
    </div>
  );
}
