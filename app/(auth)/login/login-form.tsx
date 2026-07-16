"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";
import { recordLoginSuccess, recordLoginFailure, loginGate } from "@/app/(auth)/actions";

const labelCls = "flex flex-col gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-3";
const inputCls = "rounded-[10px] border border-[#d2d8d4] bg-[#fbfcfb] px-3.5 py-[13px] text-[16.5px] font-normal normal-case tracking-normal text-ink outline-none transition focus:border-brand";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next")); // anti open-redirect
  const initialErr = params.get("disabled")
    ? "Váš účet je deaktivovaný. Kontaktujte nás na moonid@moonid.sk."
    : params.get("timeout")
      ? "Boli ste automaticky odhlásený (dlhšia neaktivita alebo vypršanie relácie). Prihláste sa znova."
      : params.get("error") === "auth"
        ? "Prihlasovací odkaz je neplatný alebo vypršal. Skúste sa prihlásiť nižšie."
        : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(initialErr);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    // app-layer brzda proti brute-force (per-IP + per-účet lockout; doplnok k Supabase limitom)
    const gate = await loginGate(email.trim());
    if (!gate.ok) {
      setErr(gate.locked
        ? "Účet je dočasne uzamknutý pre priveľa neúspešných pokusov. Skúste o 15 minút alebo si obnovte heslo."
        : "Priveľa pokusov o prihlásenie. Skúste to o pár minút.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      void recordLoginFailure(email.trim()); // audit na pozadí
      setErr("Nesprávny e-mail alebo heslo.");
      setLoading(false);
      return;
    }
    void recordLoginSuccess(); // audit + lastLoginAt na pozadí — neblokuje presmerovanie
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[22px]">
      {err && (
        <div id="login-error" role="alert" className="rounded-[10px] border border-[#f0c9c2] bg-[#fdecea] px-3.5 py-2.5 text-[13.5px] text-[#9a3025]">{err}</div>
      )}
      <label className={labelCls}>
        Firemný e-mail
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="objednavky@firma.sk" className={inputCls} aria-invalid={!!err} aria-describedby={err ? "login-error" : undefined} />
      </label>
      <label className={labelCls}>
        Heslo
        <div className="relative">
          <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={`${inputCls} w-full pr-11`} aria-invalid={!!err} aria-describedby={err ? "login-error" : undefined} />
          <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={showPw ? "Skryť heslo" : "Zobraziť heslo"}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[8px] text-muted-2 transition-colors hover:text-ink">
            {showPw ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.9 4.2A9.5 9.5 0 0 1 12 4c6.5 0 10 7 10 7a15 15 0 0 1-2.6 3.3M6.6 6.6A15 15 0 0 0 2 11s3.5 7 10 7a9.5 9.5 0 0 0 3.4-.6" /><path d="M3 3l18 18" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </div>
      </label>
      <div className="flex items-center justify-end">
        <a href="/zabudnute-heslo" className="text-[14px] font-semibold text-brand transition hover:text-brand-2">Zabudli ste heslo?</a>
      </div>
      <button type="submit" disabled={loading}
        className="inline-flex items-center justify-center gap-2.5 rounded-[10px] bg-brand px-4 py-[15px] text-[16px] font-semibold text-white transition hover:-translate-y-px hover:bg-brand-2 disabled:opacity-60">
        {loading ? "Prihlasujem…" : (
          <>
            Prihlásiť sa
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </>
        )}
      </button>
    </form>
  );
}
