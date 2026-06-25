"use client";

import { useState, useTransition } from "react";
import { addDeliveryLocation, removeDeliveryLocation } from "./actions";

type Loc = { id: string; label: string; street: string | null; city: string | null; zip: string | null; isDefault: boolean };

const inp = "rounded-[10px] border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand";

export function LocationsManager({ companyId, locations }: { companyId: string; locations: Loc[] }) {
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [na, setNa] = useState({ label: "", street: "", city: "", zip: "" });
  const [err, setErr] = useState<string | null>(null);

  function add() {
    setErr(null);
    if (!na.label.trim() || !na.street.trim() || !na.city.trim() || !na.zip.trim()) { setErr("Vyplňte všetky polia."); return; }
    start(async () => {
      const res = await addDeliveryLocation(companyId, na);
      if (!res.ok) { setErr(res.error ?? "Nepodarilo sa pridať."); return; }
      setNa({ label: "", street: "", city: "", zip: "" });
      setAdding(false);
    });
  }

  function remove(id: string) {
    start(async () => { await removeDeliveryLocation(id); });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-[22px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Dodacie adresy</h3>
        {!adding && <button onClick={() => setAdding(true)} className="text-[13px] font-semibold text-brand transition hover:text-brand-2">+ Pridať adresu</button>}
      </div>

      {locations.length === 0 && !adding && <p className="text-[13.5px] text-muted-2">Žiadne uložené adresy. Doručuje sa na fakturačnú adresu firmy.</p>}

      {locations.map((l) => (
        <div key={l.id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium text-ink">{l.label}{l.isDefault && <span className="ml-2 rounded bg-mintbg px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-2">predvolená</span>}</div>
            <div className="text-[12.5px] text-muted-2">{[l.street, [l.zip, l.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}</div>
          </div>
          <button onClick={() => remove(l.id)} disabled={pending} title="Odobrať" className="text-muted-2 transition hover:text-[#9a3025] disabled:opacity-50">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
          </button>
        </div>
      ))}

      {adding && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-3.5">
          <input value={na.label} onChange={(e) => setNa({ ...na, label: e.target.value })} placeholder="Označenie (napr. Sklad, Prevádzka centrum)" className={inp} />
          <input value={na.street} onChange={(e) => setNa({ ...na, street: e.target.value })} placeholder="Ulica a číslo" className={inp} />
          <div className="flex gap-2">
            <input value={na.city} onChange={(e) => setNa({ ...na, city: e.target.value })} placeholder="Mesto" className={`${inp} flex-1`} />
            <input value={na.zip} onChange={(e) => setNa({ ...na, zip: e.target.value })} placeholder="PSČ" className={`${inp} w-24`} />
          </div>
          {err && <span className="text-[13px] text-[#9a3025]">{err}</span>}
          <div className="flex gap-2">
            <button onClick={add} disabled={pending} className="rounded-[10px] bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">{pending ? "Pridávam…" : "Pridať"}</button>
            <button onClick={() => { setAdding(false); setErr(null); }} className="rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-medium text-muted transition hover:border-brand/40">Zrušiť</button>
          </div>
        </div>
      )}
    </div>
  );
}
