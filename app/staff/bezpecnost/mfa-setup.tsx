"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markMfa } from "./actions";

export function MfaSetup({ enrolled, email }: { enrolled: boolean; email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");

  async function startEnroll() {
    setErr(null); setBusy(true);
    // vyčisti prípadné nedokončené (unverified) faktory z predošlého pokusu
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
    setBusy(false);
    if (error || !data) { setErr(error?.message?.includes("MFA") ? "MFA nie je povolené v Supabase projekte (Authentication → MFA)." : (error?.message ?? "Nepodarilo sa spustiť nastavenie.")); return; }
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmEnroll() {
    if (!enroll) return;
    setErr(null); setBusy(true);
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (cErr || !ch) { setErr("Nepodarilo sa overiť. Skúste znova."); setBusy(false); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: ch.id, code: code.trim() });
    if (vErr) { setErr("Nesprávny kód. Skontrolujte čas v telefóne a skúste znova."); setBusy(false); return; }
    await markMfa(true);
    setBusy(false); setEnroll(null); setCode("");
    router.refresh();
  }

  async function disable() {
    if (!confirm("Naozaj vypnúť dvojfaktorové overenie? Váš účet bude chránený len heslom.")) return;
    setErr(null); setBusy(true);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) await supabase.auth.mfa.unenroll({ factorId: f.id });
    await markMfa(false);
    setBusy(false);
    router.refresh();
  }

  const btn = "rounded-[10px] px-4 py-2.5 text-[14px] font-semibold transition disabled:opacity-50";

  if (enrolled) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13.5px] text-muted-3">Konto <span className="font-medium text-ink">{email}</span> je chránené 2FA. Pri každom prihlásení budete zadávať kód z aplikácie.</p>
        <button onClick={disable} disabled={busy} className={`${btn} w-fit border border-line text-[#9a3025] hover:border-[#e0b0a8]`}>{busy ? "…" : "Vypnúť 2FA"}</button>
        {err && <p role="alert" className="text-[13px] text-[#9a3025]">{err}</p>}
      </div>
    );
  }

  if (enroll) {
    return (
      <div className="flex flex-col gap-4">
        <ol className="flex flex-col gap-1.5 text-[13.5px] text-muted-3">
          <li>1. Otvorte autentifikačnú aplikáciu (Google Authenticator, Authy, 1Password…).</li>
          <li>2. Naskenujte QR kód alebo zadajte kľúč ručne.</li>
          <li>3. Zadajte 6-miestny kód, ktorý aplikácia zobrazí.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR kód pre 2FA" width={168} height={168} className="rounded-lg border border-line bg-white p-2" />
          <div className="text-[12.5px] text-muted-2">
            <div className="mb-1 font-semibold uppercase tracking-wide">Kľúč (ručne)</div>
            <code className="select-all break-all rounded bg-cream px-2 py-1 font-mono text-[12px] text-ink">{enroll.secret}</code>
          </div>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted-3">
          Overovací kód
          <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoFocus value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456"
            className="w-[180px] rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[18px] tracking-[0.3em] text-ink outline-none transition focus:border-brand" />
        </label>
        {err && <p role="alert" className="text-[13px] text-[#9a3025]">{err}</p>}
        <div className="flex items-center gap-2.5">
          <button onClick={confirmEnroll} disabled={busy || code.length < 6} className={`${btn} bg-brand text-white hover:bg-brand-2`}>{busy ? "Overujem…" : "Potvrdiť a zapnúť"}</button>
          <button onClick={() => { setEnroll(null); setCode(""); setErr(null); }} disabled={busy} className={`${btn} border border-line text-muted hover:text-ink`}>Zrušiť</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] text-muted-3">Zapnite 2FA cez aplikáciu ako Google Authenticator alebo Authy. Zaberie to minútu.</p>
      <button onClick={startEnroll} disabled={busy} className={`${btn} w-fit bg-brand text-white hover:bg-brand-2`}>{busy ? "…" : "Zapnúť 2FA"}</button>
      {err && <p role="alert" className="text-[13px] text-[#9a3025]">{err}</p>}
    </div>
  );
}
