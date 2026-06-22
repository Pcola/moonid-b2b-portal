"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const labelCls = "flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-3";
const inputCls = "rounded-[10px] border border-[#d2d8d4] bg-[#fbfcfb] px-3.5 py-[13px] text-[15.5px] font-normal normal-case tracking-normal text-ink outline-none transition focus:border-brand";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setErr("Nesprávny e-mail alebo heslo.");
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[22px]">
      {err && (
        <div className="rounded-[10px] border border-[#f0c9c2] bg-[#fdecea] px-3.5 py-2.5 text-[13.5px] text-[#9a3025]">{err}</div>
      )}
      <label className={labelCls}>
        Firemný e-mail
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="objednavky@firma.sk" className={inputCls} />
      </label>
      <label className={labelCls}>
        Heslo
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputCls} />
      </label>
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-muted-3">
          <input type="checkbox" defaultChecked className="h-4 w-4" style={{ accentColor: "#163f38" }} />
          Zapamätať si ma
        </label>
        <a href="/zabudnute-heslo" className="text-[14px] font-semibold text-brand transition hover:text-brand-2">Zabudli ste heslo?</a>
      </div>
      <button type="submit" disabled={loading}
        className="inline-flex items-center justify-center gap-2.5 rounded-[10px] bg-brand px-4 py-[15px] text-[15.5px] font-semibold text-white transition hover:-translate-y-px hover:bg-brand-2 disabled:opacity-60">
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
