"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createAccessRequest } from "./actions";

const inputCls = "rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand";
const labelCls = "flex flex-col gap-1.5 text-[13px] font-medium text-muted-3";

export function RegistraciaForm() {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    if (!fd.get("gdpr")) { setErr("Potvrďte súhlas so spracovaním údajov."); return; }
    setLoading(true);
    const res = await createAccessRequest({
      ico: fd.get("ico"),
      companyName: fd.get("companyName"),
      contactName: fd.get("contactName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      note: fd.get("note"),
      hp: fd.get("hp"),
    });
    setLoading(false);
    if (!res.ok) { setErr(res.error ?? "Nepodarilo sa odoslať."); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mintbg text-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h2 className="text-[20px] font-semibold text-ink">Žiadosť odoslaná</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">Ďakujeme. Po overení vás sprístupníme do portálu a pošleme e-mail s pozvánkou na nastavenie hesla.</p>
        <Link href="/" className="mt-5 inline-block text-[14px] font-semibold text-brand transition hover:text-brand-2">Späť na úvod</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {err && <div className="rounded-[10px] border border-[#f0c9c2] bg-[#fdecea] px-3.5 py-2.5 text-[13.5px] text-[#9a3025]">{err}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>Názov firmy<input name="companyName" required className={inputCls} /></label>
        <label className={labelCls}>IČO<input name="ico" required inputMode="numeric" className={inputCls} /></label>
        <label className={labelCls}>Meno a priezvisko<input name="contactName" required className={inputCls} /></label>
        <label className={labelCls}>Firemný e-mail<input name="email" type="email" required className={inputCls} /></label>
        <label className={`${labelCls} sm:col-span-2`}>Telefón <span className="text-muted-2">(nepovinné)</span><input name="phone" className={inputCls} /></label>
        <label className={`${labelCls} sm:col-span-2`}>Poznámka <span className="text-muted-2">(nepovinné)</span><textarea name="note" rows={3} className={`${inputCls} resize-y`} placeholder="Napr. typ prevádzky, čo objednávate…" /></label>
      </div>
      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
        <input type="checkbox" name="gdpr" required className="mt-0.5 h-4 w-4 flex-none" style={{ accentColor: "#163f38" }} />
        <span>Súhlasím so spracovaním údajov za účelom vybavenia žiadosti o prístup (<a href="/ochrana-osobnych-udajov" target="_blank" rel="noopener" className="font-semibold text-brand underline underline-offset-2">ochrana osobných údajov</a>).</span>
      </label>
      <button type="submit" disabled={loading}
        className="mt-1 self-start rounded-[10px] bg-brand px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
        {loading ? "Odosielam…" : "Odoslať žiadosť"}
      </button>
    </form>
  );
}
