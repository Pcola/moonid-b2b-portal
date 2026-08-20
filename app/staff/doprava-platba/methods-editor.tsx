"use client";

import { useState, useTransition } from "react";
import { updateDeliveryMethod, updatePaymentMethod } from "./actions";

type Delivery = { code: string; label: string; description: string | null; enabled: boolean; requiresAddress: boolean; flatFee: number; freeThreshold: number | null };
type Payment = { code: string; label: string; description: string | null; enabled: boolean; surcharge: number };

const inp = "rounded-[9px] border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand";
const lbl = "flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-wide text-muted-2";
const chk = "flex items-center gap-2 text-[13.5px] font-medium text-ink";

function Saved({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <span className={`text-[13px] font-semibold ${msg.ok ? "text-brand" : "text-[#9a3025]"}`}>{msg.text}</span>;
}

function DeliveryCard({ m, editable }: { m: Delivery; editable: boolean }) {
  const [label, setLabel] = useState(m.label);
  const [description, setDescription] = useState(m.description ?? "");
  const [enabled, setEnabled] = useState(m.enabled);
  const [requiresAddress, setRequiresAddress] = useState(m.requiresAddress);
  const [flatFee, setFlatFee] = useState(String(m.flatFee));
  const [freeThreshold, setFreeThreshold] = useState(m.freeThreshold != null ? String(m.freeThreshold) : "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateDeliveryMethod(m.code, {
        label, description: description.trim() || null, enabled, requiresAddress,
        flatFee: Number(flatFee.replace(",", ".")) || 0,
        freeThreshold: freeThreshold.trim() === "" ? null : (Number(freeThreshold.replace(",", ".")) || 0),
      });
      setMsg(res.ok ? { ok: true, text: "Uložené ✓" } : { ok: false, text: res.error ?? "Chyba" });
    });
  }

  return (
    <div className={`rounded-2xl border bg-white p-5 ${enabled ? "border-line" : "border-dashed border-line opacity-70"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-cream px-2 py-0.5 font-mono text-[12px] font-semibold text-muted-3">{m.code}</span>
        {editable
          ? <label className={chk}><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-[#163f38]" />Zapnuté</label>
          : <span className="text-[13px] font-semibold text-muted-3">{enabled ? "Zapnuté" : "Vypnuté"}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`${lbl} sm:col-span-2`}>Názov{editable ? <input value={label} onChange={(e) => setLabel(e.target.value)} className={inp} /> : <span className="normal-case tracking-normal text-[14px] font-normal text-ink">{m.label}</span>}</label>
        <label className={`${lbl} sm:col-span-2`}>Popis pre zákazníka{editable ? <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inp} resize-y`} placeholder="Napr. adresa odberného miesta / info o doručení" /> : <span className="normal-case tracking-normal text-[14px] font-normal text-ink">{m.description || "—"}</span>}</label>
        <label className={lbl}>Paušál (€ bez DPH){editable ? <input value={flatFee} onChange={(e) => setFlatFee(e.target.value)} inputMode="decimal" className={inp} placeholder="napr. 4.90" /> : <span className="normal-case tracking-normal text-[14px] font-normal text-ink tabular-nums">{m.flatFee.toFixed(2)} €</span>}</label>
        <label className={lbl}>Zdarma nad (€ bez DPH){editable ? <input value={freeThreshold} onChange={(e) => setFreeThreshold(e.target.value)} inputMode="decimal" className={inp} placeholder="prázdne = nikdy zdarma" /> : <span className="normal-case tracking-normal text-[14px] font-normal text-ink tabular-nums">{m.freeThreshold == null ? "Nikdy" : `${m.freeThreshold.toFixed(2)} €`}</span>}</label>
      </div>
      {editable ? <label className={`${chk} mt-3`}><input type="checkbox" checked={requiresAddress} onChange={(e) => setRequiresAddress(e.target.checked)} className="h-4 w-4 accent-[#163f38]" />Vyžaduje dodaciu adresu <span className="font-normal text-muted-2">(osobný odber = vypnuté)</span></label> : <span className="mt-3 text-[13.5px] text-muted-3">{m.requiresAddress ? "Vyžaduje dodaciu adresu" : "Dodacia adresa sa nevyžaduje"}</span>}
      {editable && <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={pending} className="rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">{pending ? "Ukladám…" : "Uložiť"}</button>
        <Saved msg={msg} />
      </div>}
    </div>
  );
}

function PaymentCard({ m, editable }: { m: Payment; editable: boolean }) {
  const [label, setLabel] = useState(m.label);
  const [description, setDescription] = useState(m.description ?? "");
  const [enabled, setEnabled] = useState(m.enabled);
  const [surcharge, setSurcharge] = useState(String(m.surcharge));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updatePaymentMethod(m.code, {
        label, description: description.trim() || null, enabled,
        surcharge: Number(surcharge.replace(",", ".")) || 0,
      });
      setMsg(res.ok ? { ok: true, text: "Uložené ✓" } : { ok: false, text: res.error ?? "Chyba" });
    });
  }

  return (
    <div className={`rounded-2xl border bg-white p-5 ${enabled ? "border-line" : "border-dashed border-line opacity-70"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-cream px-2 py-0.5 font-mono text-[12px] font-semibold text-muted-3">{m.code}</span>
        {editable
          ? <label className={chk}><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-[#163f38]" />Zapnuté</label>
          : <span className="text-[13px] font-semibold text-muted-3">{enabled ? "Zapnuté" : "Vypnuté"}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`${lbl} sm:col-span-2`}>Názov{editable ? <input value={label} onChange={(e) => setLabel(e.target.value)} className={inp} /> : <span className="normal-case tracking-normal text-[14px] font-normal text-ink">{m.label}</span>}</label>
        <label className={`${lbl} sm:col-span-2`}>Popis pre zákazníka{editable ? <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inp} resize-y`} /> : <span className="normal-case tracking-normal text-[14px] font-normal text-ink">{m.description || "—"}</span>}</label>
        <label className={lbl}>Príplatok (€ bez DPH){editable ? <input value={surcharge} onChange={(e) => setSurcharge(e.target.value)} inputMode="decimal" className={inp} placeholder="napr. 1.00 (dobierka)" /> : <span className="normal-case tracking-normal text-[14px] font-normal text-ink tabular-nums">{m.surcharge.toFixed(2)} €</span>}</label>
      </div>
      {editable && <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={pending} className="rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">{pending ? "Ukladám…" : "Uložiť"}</button>
        <Saved msg={msg} />
      </div>}
    </div>
  );
}

export function MethodsEditor({ delivery, payment, editable }: { delivery: Delivery[]; payment: Payment[]; editable: boolean }) {
  return (
    <div className="flex max-w-[1080px] flex-col gap-8">
      <div className="rounded-xl border border-mint-2/50 bg-mintbg/30 px-4 py-3 text-[13.5px] text-muted-3">
        Tu riadite, čo zákazník vidí pri objednávaní — spôsoby dopravy a platby, poplatky a prahy pre dopravu zdarma. Zmeny sa prejavia okamžite. Splatnosť faktúr sa nastavuje pri jednotlivých zákazníkoch.
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[20px] font-normal tracking-[-0.01em] text-ink">Doprava</h2>
          <p className="text-[13.5px] text-muted">Poplatok je paušál bez DPH; „zdarma nad" sa porovnáva s hodnotou tovaru bez DPH. DPH sa k doprave doráta automaticky.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{delivery.map((m) => <DeliveryCard key={m.code} m={m} editable={editable} />)}</div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[20px] font-normal tracking-[-0.01em] text-ink">Platba</h2>
          <p className="text-[13.5px] text-muted">Príplatok (napr. za dobierku) je bez DPH; DPH sa doráta. Platba na faktúru používa splatnosť nastavenú u zákazníka.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{payment.map((m) => <PaymentCard key={m.code} m={m} editable={editable} />)}</div>
      </section>
    </div>
  );
}
