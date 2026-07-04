"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";

export function MfaChallengeForm({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (fErr || !totp) { setErr("Nepodarilo sa načítať MFA faktor. Skúste sa znova prihlásiť."); setLoading(false); return; }
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
    if (cErr || !ch) { setErr("Nepodarilo sa vytvoriť výzvu. Skúste znova."); setLoading(false); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: totp.id, challengeId: ch.id, code: code.trim() });
    if (vErr) { setErr("Nesprávny alebo expirovaný kód. Skúste znova."); setLoading(false); return; }
    router.replace(safeNextPath(next));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {err && <div role="alert" className="rounded-[10px] border border-[#f0c9c2] bg-[#fdecea] px-3.5 py-2.5 text-[13.5px] text-[#9a3025]">{err}</div>}
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted-3">
        Overovací kód
        <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} required autoFocus
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[18px] tracking-[0.3em] text-ink outline-none transition focus:border-brand" />
      </label>
      <button type="submit" disabled={loading || code.length < 6}
        className="rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
        {loading ? "Overujem…" : "Overiť a pokračovať"}
      </button>
      <p className="text-center text-[12.5px] text-muted-2">Stratili ste prístup k aplikácii? Kontaktujte administrátora na obnovenie.</p>
    </form>
  );
}
