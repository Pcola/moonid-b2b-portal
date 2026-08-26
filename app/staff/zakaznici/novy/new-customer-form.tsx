"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createCustomer } from "../actions";
import { LiveMessage, useFocusWhen } from "@/components/ui/live-region";
import { inputClass } from "@/components/ui/input";

type Tier = { code: string; name: string; discountPct: number };
const inp = inputClass();
const lbl = "flex flex-col gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2";

export function NewCustomerForm({ tiers, canEditPricing }: { tiers: Tier[]; canEditPricing: boolean }) {
  const [f, setF] = useState({
    name: "", ico: "", dic: "", icDph: "", city: "", zip: "", address: "",
    tierCode: (canEditPricing ? tiers[0] : [...tiers].sort((a, b) => a.discountPct - b.discountPct)[0])?.code ?? "", splatDays: "14", contactEmail: "", contactName: "",
  });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; inviteLink: string | null } | null>(null);
  const doneRef = useFocusWhen<HTMLDivElement>(!!done);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await createCustomer({ ...f, splatDays: Number(f.splatDays) });
      if (!res.ok || !res.id) { setErr(res.error ?? "Nepodarilo sa vytvoriť."); return; }
      setDone({ id: res.id, inviteLink: res.inviteLink ?? null });
      if (res.error) setErr(res.error); // firma OK, ale pozvánka zlyhala
    });
  }

  if (done) {
    return (
      <div role="status" ref={doneRef} tabIndex={-1} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mintbg text-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <p className="text-[16px] font-medium text-ink">Zákazník <strong>{f.name}</strong> vytvorený.</p>
        {err && <p className="text-[13px] text-danger-ink">{err}</p>}
        {done.inviteLink && (
          <div className="mx-auto w-full max-w-[560px] rounded-xl border border-line bg-cream/50 p-3 text-left">
            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2">Pozvánkový odkaz (pošlite zákazníkovi)</p>
            <p className="break-all font-mono text-[12px] text-ink">{done.inviteLink}</p>
          </div>
        )}
        <div className="flex justify-center gap-3">
          <Link href={`/staff/zakaznici/${done.id}`} className="rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2">Otvoriť detail</Link>
          <Link href="/staff/zakaznici" className="rounded-[10px] border border-line px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:border-brand/40">Späť na zoznam</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-[20px] font-normal text-ink">Nový zákazník</h2>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[22px]">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Firemné údaje</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${lbl} sm:col-span-2`}>Názov firmy *<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} /></label>
          <label className={lbl}>IČO *<input value={f.ico} onChange={(e) => setF({ ...f, ico: e.target.value })} className={inp} /></label>
          <label className={lbl}>DIČ<input value={f.dic} onChange={(e) => setF({ ...f, dic: e.target.value })} className={inp} /></label>
          <label className={lbl}>IČ DPH<input value={f.icDph} onChange={(e) => setF({ ...f, icDph: e.target.value })} className={inp} /></label>
          <label className={lbl}>PSČ<input value={f.zip} onChange={(e) => setF({ ...f, zip: e.target.value })} autoComplete="billing postal-code" className={inp} /></label>
          <label className={lbl}>Mesto<input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className={inp} /></label>
          <label className={`${lbl} sm:col-span-2`}>Fakturačná adresa<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={inp} />
            <span className="text-[12.5px] font-normal normal-case tracking-normal text-muted-3">Ulica, PSČ a mesto sú povinné pre objednávanie — bez nich košík objednávku neodošle.</span>
          </label>
          <label className={lbl}>Cenová úroveň *
            <select value={f.tierCode} onChange={(e) => setF({ ...f, tierCode: e.target.value })} disabled={!canEditPricing} aria-describedby={canEditPricing ? undefined : "new-tier-locked"} className={`${inp} disabled:cursor-not-allowed disabled:bg-cream/60 disabled:text-muted`}>
              {tiers.map((t) => <option key={t.code} value={t.code}>{t.code} — {t.name} (−{t.discountPct.toFixed(0)} %)</option>)}
            </select>
            {!canEditPricing && <span id="new-tier-locked" className="text-[12.5px] font-normal normal-case tracking-normal text-muted-3">Zľavovú úroveň priradí administrátor po založení.</span>}
          </label>
          <label className={lbl}>Splatnosť faktúr (dni)<input type="number" min={0} max={365} value={f.splatDays} onChange={(e) => setF({ ...f, splatDays: e.target.value })} className={inp} /></label>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[22px]">
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Kontaktná osoba (voliteľné)</h3>
          <p className="mt-1 text-[13px] text-muted">Ak vyplníte e-mail, pošleme pozvánku na nastavenie hesla. Môžete pridať aj neskôr v detaile.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={lbl}>E-mail<input type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} className={inp} placeholder="objednavky@firma.sk" /></label>
          <label className={lbl}>Meno<input value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} className={inp} /></label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={pending} className="rounded-[10px] bg-brand px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
          {pending ? "Vytváram…" : "Vytvoriť zákazníka"}
        </button>
        <LiveMessage message={pending ? "Vytváram zákazníka…" : null} />
        <LiveMessage message={err} tone="error" />
        {err && <span className="text-[13px] text-danger-ink">{err}</span>}
      </div>
    </div>
  );
}
