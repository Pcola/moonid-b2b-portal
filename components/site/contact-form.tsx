"use client";

import { useState } from "react";

const SEGMENTS = [
  "Hotel, penzión, wellness",
  "Reštaurácia / gastro",
  "Administratíva / kancelárie",
  "Priemysel / haly / autoservis",
  "Obchod a služby",
  "Škola / samospráva",
  "Iné",
];

const TYPY = ["Cenová ponuka", "Prenájom dávkovačov", "Prístup do portálu", "Iné"];

const inputCls =
  "border-0 border-b border-[#d2d8d4] bg-transparent px-0.5 py-2 text-[15.5px] text-ink outline-none transition-colors focus:border-brand";
const labelCls =
  "flex flex-col gap-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/dopyt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("send failed");
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-[18px] px-2 text-center" style={{ padding: "clamp(28px,5vw,64px) 8px" }}>
        <span className="inline-flex h-[62px] w-[62px] items-center justify-center rounded-full bg-mintbg text-brand">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </span>
        <h3 className="text-ink" style={{ fontSize: "clamp(24px,3vw,30px)", letterSpacing: "-0.01em" }}>Ďakujeme, ozveme sa vám čo najskôr.</h3>
        <p className="max-w-[400px] text-[15px] leading-relaxed text-muted-3">
          Vaša správa bola odoslaná. Ak je to súrne, zavolajte nám na{" "}
          <a href="tel:+421919216908" className="font-semibold text-brand">0919 216 908</a>.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-[clamp(24px,3vw,34px)]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-2">Nezáväzný dopyt</span>
        <h3 className="mt-2.5 text-ink" style={{ fontSize: "clamp(22px,2.4vw,28px)", lineHeight: 1.12, letterSpacing: "-0.01em" }}>Vyžiadajte si cenovú ponuku</h3>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-[26px]">
        <div className="grid gap-[26px] sm:grid-cols-2">
          <label className={labelCls}>Meno a priezvisko *
            <input name="meno" type="text" required placeholder="Vaše meno" className={inputCls} />
          </label>
          <label className={labelCls}>Firma / prevádzka *
            <input name="firma" type="text" required placeholder="Názov firmy alebo prevádzky" className={inputCls} />
          </label>
        </div>
        <div className="grid gap-[26px] sm:grid-cols-2">
          <label className={labelCls}>Mesto / PSČ prevádzky
            <input name="lokalita" type="text" placeholder="napr. Nové Zámky" className={inputCls} />
          </label>
          <label className={labelCls}>Typ dopytu
            <select name="typ" className={inputCls} defaultValue="Cenová ponuka">
              {TYPY.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label className={labelCls}>Segment
          <select name="segment" className={inputCls} defaultValue="">
            <option value="">Vyberte segment</option>
            {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className={labelCls}>Čo potrebujete
          <textarea name="sprava" rows={3} placeholder="Napíšte nám, o aký sortiment a objemy máte záujem…" className={`${inputCls} resize-y`} />
        </label>
        <div className="grid gap-[26px] sm:grid-cols-2">
          <label className={labelCls}>E-mail *
            <input name="email" type="email" required placeholder="vas@email.sk" className={inputCls} />
          </label>
          <label className={labelCls}>Telefón
            <input name="telefon" type="tel" placeholder="09xx xxx xxx" className={inputCls} />
          </label>
        </div>
        <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-3">
          <input name="gdpr" type="checkbox" required className="mt-0.5 h-4 w-4 flex-none accent-[#163f38]" />
          <span>Súhlasím so spracovaním osobných údajov za účelom vybavenia dopytu (<a href="/ochrana-osobnych-udajov" target="_blank" rel="noopener" className="font-semibold text-brand underline underline-offset-2">ochrana osobných údajov</a>). *</span>
        </label>
        {error && <p className="text-[14px] text-[#a23b2a]">Odoslanie zlyhalo. Skúste znova alebo nám zavolajte na 0919 216 908.</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-4">
          <button type="submit" disabled={submitting} className="inline-flex items-center gap-2.5 rounded-[9px] bg-brand px-7 py-[15px] text-[15.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-70">
            {submitting ? "Odosielam…" : "Odoslať dopyt"}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
          <span className="text-[13px] leading-snug text-muted-2">Odpovieme spravidla do 24 hodín.</span>
        </div>
      </form>
    </>
  );
}
