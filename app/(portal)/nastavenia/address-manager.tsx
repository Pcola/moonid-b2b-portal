"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBillingAddress, addDeliveryLocation, updateDeliveryLocation, deleteDeliveryLocation, setDefaultDeliveryLocation } from "./actions";

type Loc = { id: string; label: string; street: string | null; zip: string | null; city: string | null; isDefault: boolean };
type Billing = { street: string | null; zip: string | null; city: string | null };

const inp = "rounded-[10px] border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand";
const lbl = "flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-wide text-muted-2";

function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return <span className={`text-[13px] font-semibold ${m.ok ? "text-brand" : "text-[#9a3025]"}`}>{m.text}</span>;
}

function fmt(a: { street: string | null; zip: string | null; city: string | null }) {
  return [a.street, [a.zip, a.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—";
}

function BillingSection({ isAdmin, billing }: { isAdmin: boolean; billing: Billing }) {
  const router = useRouter();
  const [street, setStreet] = useState(billing.street ?? "");
  const [zip, setZip] = useState(billing.zip ?? "");
  const [city, setCity] = useState(billing.city ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!isAdmin) {
    return <p className="text-[14.5px] text-ink">{fmt(billing)}</p>;
  }
  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateBillingAddress({ street: street.trim() || null, zip: zip.trim() || null, city: city.trim() || null });
      if (res.ok) { setMsg({ ok: true, text: "Uložené ✓" }); router.refresh(); }
      else setMsg({ ok: false, text: res.error ?? "Chyba" });
    });
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_1fr]">
        <label className={lbl}>Ulica a číslo<input value={street} onChange={(e) => setStreet(e.target.value)} className={inp} /></label>
        <label className={lbl}>PSČ<input value={zip} onChange={(e) => setZip(e.target.value)} className={inp} /></label>
        <label className={lbl}>Mesto<input value={city} onChange={(e) => setCity(e.target.value)} className={inp} /></label>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">{pending ? "Ukladám…" : "Uložiť"}</button>
        <Msg m={msg} />
      </div>
    </div>
  );
}

function LocationRow({ loc, isAdmin }: { loc: Loc; isAdmin: boolean }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [label, setLabel] = useState(loc.label);
  const [street, setStreet] = useState(loc.street ?? "");
  const [zip, setZip] = useState(loc.zip ?? "");
  const [city, setCity] = useState(loc.city ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    start(async () => {
      const res = await updateDeliveryLocation(loc.id, { label, street, zip, city });
      if (res.ok) { setEdit(false); router.refresh(); } else setErr(res.error ?? "Chyba");
    });
  }
  function remove() {
    setErr(null);
    start(async () => { const res = await deleteDeliveryLocation(loc.id); if (res.ok) router.refresh(); else setErr(res.error ?? "Chyba"); });
  }
  function makeDefault() {
    start(async () => { await setDefaultDeliveryLocation(loc.id); router.refresh(); });
  }

  if (edit) {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl border border-brand/30 bg-white p-4">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className={lbl}>Označenie<input value={label} onChange={(e) => setLabel(e.target.value)} className={inp} /></label>
          <label className={lbl}>Ulica a číslo<input value={street} onChange={(e) => setStreet(e.target.value)} className={inp} /></label>
          <label className={lbl}>PSČ<input value={zip} onChange={(e) => setZip(e.target.value)} className={inp} /></label>
          <label className={lbl}>Mesto<input value={city} onChange={(e) => setCity(e.target.value)} className={inp} /></label>
        </div>
        {err && <span className="text-[13px] text-[#9a3025]">{err}</span>}
        <div className="flex items-center gap-2.5">
          <button onClick={save} disabled={pending} className="rounded-[10px] bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">{pending ? "Ukladám…" : "Uložiť"}</button>
          <button onClick={() => { setEdit(false); setErr(null); }} className="rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-semibold text-muted transition hover:text-ink">Zrušiť</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14.5px] font-medium text-ink">{loc.label}</span>
          {loc.isDefault && <span className="rounded-full bg-mintbg px-2 py-0.5 text-[11px] font-semibold text-brand">predvolená</span>}
        </div>
        <div className="text-[13px] text-muted-2">{fmt(loc)}</div>
        {err && <div className="mt-1 text-[12.5px] text-[#9a3025]">{err}</div>}
      </div>
      {isAdmin && (
        <div className="flex flex-none items-center gap-1.5">
          {!loc.isDefault && <button onClick={makeDefault} disabled={pending} title="Nastaviť ako predvolenú" className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-muted transition hover:text-ink disabled:opacity-50">Predvolená</button>}
          <button onClick={() => setEdit(true)} title="Upraviť" className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-brand transition hover:border-mint-2">Upraviť</button>
          <button onClick={remove} disabled={pending} title="Zmazať" className="rounded-lg border border-line px-2.5 py-1.5 text-muted-2 transition hover:text-[#9a3025] disabled:opacity-50">✕</button>
        </div>
      )}
    </div>
  );
}

function AddLocation() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function add() {
    setErr(null);
    start(async () => {
      const res = await addDeliveryLocation({ label, street, zip, city });
      if (res.ok) { setOpen(false); setLabel(""); setStreet(""); setZip(""); setCity(""); router.refresh(); }
      else setErr(res.error ?? "Chyba");
    });
  }
  if (!open) {
    return <button onClick={() => setOpen(true)} className="inline-flex w-fit items-center gap-2 rounded-[10px] border border-dashed border-line bg-white px-4 py-2.5 text-[13.5px] font-semibold text-brand transition hover:border-mint-2">+ Pridať dodaciu adresu</button>;
  }
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-brand/30 bg-white p-4">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className={lbl}>Označenie<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="napr. Prevádzka centrum" className={inp} /></label>
        <label className={lbl}>Ulica a číslo<input value={street} onChange={(e) => setStreet(e.target.value)} className={inp} /></label>
        <label className={lbl}>PSČ<input value={zip} onChange={(e) => setZip(e.target.value)} className={inp} /></label>
        <label className={lbl}>Mesto<input value={city} onChange={(e) => setCity(e.target.value)} className={inp} /></label>
      </div>
      {err && <span className="text-[13px] text-[#9a3025]">{err}</span>}
      <div className="flex items-center gap-2.5">
        <button onClick={add} disabled={pending} className="rounded-[10px] bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">{pending ? "Pridávam…" : "Pridať adresu"}</button>
        <button onClick={() => { setOpen(false); setErr(null); }} className="rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-semibold text-muted transition hover:text-ink">Zrušiť</button>
      </div>
    </div>
  );
}

export function AddressManager({ isAdmin, billing, locations }: { isAdmin: boolean; billing: Billing; locations: Loc[] }) {
  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className="border-b border-line px-6 py-4"><h2 className="text-[18px] font-normal text-ink">Adresy</h2></div>
      <div className="flex flex-col gap-6 px-6 py-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-2">Fakturačná adresa</h3>
            {!isAdmin && <span className="text-[12px] text-muted-2">len na čítanie</span>}
          </div>
          <BillingSection isAdmin={isAdmin} billing={billing} />
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-2">Dodacie adresy {locations.length > 0 && <span className="text-muted-3">({locations.length})</span>}</h3>
          </div>
          {locations.length === 0 && <p className="text-[13.5px] text-muted">Zatiaľ žiadne uložené dodacie adresy. Pri objednávke sa doručí na fakturačnú adresu, alebo si tu pridajte pobočky.</p>}
          <div className="flex flex-col gap-2.5">
            {locations.map((l) => <LocationRow key={l.id} loc={l} isAdmin={isAdmin} />)}
          </div>
          {isAdmin && <AddLocation />}
        </div>

        {!isAdmin && <p className="text-[12.5px] text-muted-2">Adresy môže upravovať správca firmy.</p>}
      </div>
    </section>
  );
}
