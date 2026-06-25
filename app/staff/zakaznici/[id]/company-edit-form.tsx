"use client";

import { useState, useTransition } from "react";
import { updateCompany } from "./actions";

type Tier = { code: string; name: string; discountPct: number };
type Company = {
  id: string; name: string; ico: string; dic: string | null; icDph: string | null;
  address: string | null; city: string | null; priceTierCode: string; splatDays: number; active: boolean;
};

const inp = "rounded-[10px] border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand";
const lbl = "flex flex-col gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2";

export function CompanyEditForm({ company, tiers }: { company: Company; tiers: Tier[] }) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    name: company.name, dic: company.dic ?? "", icDph: company.icDph ?? "",
    address: company.address ?? "", city: company.city ?? "",
    priceTierCode: company.priceTierCode, splatDays: String(company.splatDays), active: company.active,
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateCompany(company.id, { ...f, splatDays: Number(f.splatDays) });
      setMsg(res.ok ? { ok: true, text: "Uložené." } : { ok: false, text: res.error ?? "Nepodarilo sa uložiť." });
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[22px]">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Firemné a obchodné údaje</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${lbl} sm:col-span-2`}>Názov firmy<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} /></label>
        <label className={lbl}>IČO<input value={company.ico} disabled className={`${inp} bg-cream/60 text-muted`} /></label>
        <label className={lbl}>DIČ<input value={f.dic} onChange={(e) => setF({ ...f, dic: e.target.value })} className={inp} /></label>
        <label className={lbl}>IČ DPH<input value={f.icDph} onChange={(e) => setF({ ...f, icDph: e.target.value })} className={inp} /></label>
        <label className={lbl}>Mesto<input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className={inp} /></label>
        <label className={`${lbl} sm:col-span-2`}>Fakturačná adresa (ulica a číslo)<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={inp} /></label>
        <label className={lbl}>Cenová úroveň
          <select value={f.priceTierCode} onChange={(e) => setF({ ...f, priceTierCode: e.target.value })} className={inp}>
            {tiers.map((t) => <option key={t.code} value={t.code}>{t.code} — {t.name} (−{Number(t.discountPct).toFixed(0)} %)</option>)}
          </select>
        </label>
        <label className={lbl}>Splatnosť faktúr (dni)<input type="number" min={0} max={365} value={f.splatDays} onChange={(e) => setF({ ...f, splatDays: e.target.value })} className={inp} /></label>
      </div>
      <label className="flex items-center gap-2.5 text-[13.5px] text-muted">
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="h-4 w-4" style={{ accentColor: "#163f38" }} />
        Aktívna firma <span className="text-muted-2">(neaktívna = zákazník sa nedostane do portálu)</span>
      </label>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="self-start rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
          {pending ? "Ukladám…" : "Uložiť zmeny"}
        </button>
        {msg && <span className={`text-[13px] ${msg.ok ? "text-brand-2" : "text-[#9a3025]"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
