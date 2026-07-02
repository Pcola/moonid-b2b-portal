"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";

/** Kontrola hesla voči HaveIBeenPwned (k-anonymity — posiela sa len 5-znakový SHA-1 prefix). */
async function isPwned(pw: string): Promise<boolean> {
  try {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
    const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    if (!res.ok) return false;
    return (await res.text()).split("\n").some((line) => line.split(":")[0].trim() === hash.slice(5));
  } catch {
    return false;
  }
}

const inp = "rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[14.5px] text-ink outline-none transition focus:border-brand";
const lbl = "flex flex-col gap-1.5 text-[12.5px] font-medium text-muted-3";

function NameEditor({ initialName, email }: { initialName: string | null; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = name.trim() !== (initialName ?? "").trim();

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateProfile({ name: name.trim() });
      if (r.ok) { setMsg({ ok: true, text: "Uložené ✓" }); router.refresh(); }
      else setMsg({ ok: false, text: r.error ?? "Nepodarilo sa uložiť." });
    });
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={lbl}>Meno
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inp} placeholder="Meno a priezvisko" />
        </label>
        <label className={lbl}>E-mail
          <input value={email} disabled className={`${inp} cursor-not-allowed bg-cream/50 text-muted-2`} />
        </label>
      </div>
      <div className="flex items-center gap-2.5">
        <button onClick={save} disabled={pending || !dirty || !name.trim()} className="rounded-[10px] bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
          {pending ? "Ukladám…" : "Uložiť meno"}
        </button>
        {msg && <span className={`text-[13px] font-medium ${msg.ok ? "text-brand-2" : "text-[#9a3025]"}`}>{msg.text}</span>}
      </div>
      <p className="text-[12px] text-muted-2">E-mail je prihlasovacie meno — zmenu adresy rieši správca firmy / Moonid.</p>
    </div>
  );
}

function PasswordChanger({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 12) { setMsg({ ok: false, text: "Nové heslo musí mať aspoň 12 znakov." }); return; }
    if (next !== confirm) { setMsg({ ok: false, text: "Nové heslá sa nezhodujú." }); return; }
    if (next === current) { setMsg({ ok: false, text: "Nové heslo sa musí líšiť od súčasného." }); return; }
    setLoading(true);
    const supabase = createClient();
    // re-auth: over súčasné heslo predtým, než ho zmeníme (ASVS — zmena hesla vyžaduje re-autentifikáciu)
    const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: current });
    if (reauthErr) { setMsg({ ok: false, text: "Súčasné heslo je nesprávne." }); setLoading(false); return; }
    if (await isPwned(next)) { setMsg({ ok: false, text: "Toto heslo sa našlo v známych únikoch dát. Zvoľte iné." }); setLoading(false); return; }
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) { setMsg({ ok: false, text: "Heslo sa nepodarilo zmeniť. Skúste znova." }); setLoading(false); return; }
    // zruš ostatné relácie (možné kompromitované zariadenia), aktuálnu nechaj
    await supabase.auth.signOut({ scope: "others" }).catch(() => {});
    setMsg({ ok: true, text: "Heslo zmenené ✓ Ostatné relácie boli odhlásené." });
    setCurrent(""); setNext(""); setConfirm(""); setLoading(false); setOpen(false);
  }

  if (!open) {
    return (
      <div className="border-t border-line px-6 py-4">
        <button onClick={() => { setOpen(true); setMsg(null); }} className="text-[13.5px] font-semibold text-brand transition hover:text-brand-2">Zmeniť heslo</button>
        {msg?.ok && <span className="ml-3 text-[13px] font-medium text-brand-2">{msg.text}</span>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-line px-6 py-5">
      <h3 className="text-[13px] font-semibold text-ink">Zmena hesla</h3>
      {/* skryté používateľské meno pre password managery (a11y/autofill) */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={lbl}>Súčasné heslo
          <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={inp} />
        </label>
        <label className={lbl}>Nové heslo
          <input type="password" required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={12} className={inp} />
        </label>
        <label className={lbl}>Nové heslo znova
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={12} className={inp} />
        </label>
      </div>
      <div className="flex items-center gap-2.5">
        <button type="submit" disabled={loading} className="rounded-[10px] bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
          {loading ? "Ukladám…" : "Uložiť nové heslo"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setMsg(null); }} className="rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-semibold text-muted transition hover:text-ink">Zrušiť</button>
        {msg && !msg.ok && <span className="text-[13px] font-medium text-[#9a3025]">{msg.text}</span>}
      </div>
      <p className="text-[12px] text-muted-2">Min. 12 znakov. Heslo overujeme voči databáze uniknutých hesiel.</p>
    </form>
  );
}

export function AccountCard({ name, email }: { name: string | null; email: string }) {
  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className="border-b border-line px-6 py-4"><h2 className="text-[18px] font-normal text-ink">Moje konto</h2></div>
      <NameEditor initialName={name} email={email} />
      <PasswordChanger email={email} />
    </section>
  );
}
