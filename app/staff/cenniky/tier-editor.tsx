"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTier, createTier, deleteTier } from "./actions";

type Tier = { code: string; name: string; discountPct: number; companies: number };

export function TierEditor({ tiers, descriptions }: { tiers: Tier[]; descriptions: Record<string, string> }) {
  return (
    <div className="grid gap-[clamp(16px,2vw,22px)]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
      {tiers.map((t) => (
        <TierCard key={t.code} tier={t} desc={descriptions[t.code]} />
      ))}
      <NewTierCard />
    </div>
  );
}

function TierCard({ tier, desc }: { tier: Tier; desc?: string }) {
  const router = useRouter();
  const [name, setName] = useState(tier.name);
  const [pct, setPct] = useState(String(tier.discountPct));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = name !== tier.name || Number(pct) !== Number(tier.discountPct);
  const canDelete = tier.companies === 0;

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateTier(tier.code, { name: name.trim(), discountPct: Number(pct) });
      setMsg(res.ok ? { ok: true, text: "Uložené." } : { ok: false, text: res.error ?? "Nepodarilo sa uložiť." });
    });
  }

  function remove() {
    if (!confirm(`Zmazať cenovú úroveň ${tier.code}?`)) return;
    setMsg(null);
    start(async () => {
      const res = await deleteTier(tier.code);
      if (!res.ok) setMsg({ ok: false, text: res.error ?? "Nepodarilo sa zmazať." });
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Úroveň {tier.code}</span>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[19px] font-normal text-ink outline-none transition focus:border-brand" />
        </div>
        <div className="flex flex-none items-baseline gap-1">
          <span className="text-[22px] font-normal text-brand">−</span>
          <input type="number" min={0} max={90} step={0.5} value={pct} onChange={(e) => setPct(e.target.value)}
            className="w-[68px] rounded-lg border border-line bg-white px-2 py-1 text-right text-[24px] font-normal text-brand outline-none transition focus:border-brand tabular-nums" />
          <span className="text-[18px] text-brand">%</span>
        </div>
      </div>
      {desc && <p className="text-[13.5px] leading-relaxed text-muted">{desc}</p>}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-2">{tier.companies} {tier.companies === 1 ? "zákazník" : tier.companies >= 2 && tier.companies <= 4 ? "zákazníci" : "zákazníkov"}</span>
          {canDelete && <button onClick={remove} disabled={pending} title="Zmazať úroveň" className="text-muted-2 transition hover:text-[#9a3025] disabled:opacity-40">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
          </button>}
        </div>
        <div className="flex items-center gap-2.5">
          {msg && <span className={`text-[12.5px] ${msg.ok ? "text-brand-2" : "text-[#9a3025]"}`}>{msg.text}</span>}
          <button onClick={save} disabled={pending || !dirty}
            className="rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-40">
            {pending ? "…" : "Uložiť"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTierCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pct, setPct] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function create() {
    setErr(null);
    start(async () => {
      const res = await createTier({ code: code.trim(), name: name.trim(), discountPct: Number(pct) });
      if (!res.ok) { setErr(res.error ?? "Nepodarilo sa vytvoriť."); return; }
      setCode(""); setName(""); setPct(""); setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-white/50 text-muted-2 transition hover:border-brand/40 hover:text-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        <span className="text-[13.5px] font-semibold">Nová úroveň</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand/30 bg-white p-6">
      <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Nová cenová úroveň</span>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="KÓD" className="w-[90px] rounded-lg border border-line bg-white px-2.5 py-2 text-[14px] font-semibold uppercase text-ink outline-none focus:border-brand" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Názov" className="flex-1 rounded-lg border border-line bg-white px-2.5 py-2 text-[14px] text-ink outline-none focus:border-brand" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-[16px] text-brand">−</span>
          <input type="number" min={0} max={90} step={0.5} value={pct} onChange={(e) => setPct(e.target.value)} placeholder="0" className="w-[64px] rounded-lg border border-line bg-white px-2 py-1.5 text-right text-[16px] text-brand outline-none focus:border-brand tabular-nums" />
          <span className="text-[14px] text-brand">%</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { setOpen(false); setErr(null); }} className="text-[13px] font-medium text-muted transition hover:text-ink">Zrušiť</button>
          <button onClick={create} disabled={pending || !code.trim() || !name.trim()} className="rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-40">{pending ? "…" : "Vytvoriť"}</button>
        </div>
      </div>
      {err && <span className="text-[12.5px] text-[#9a3025]">{err}</span>}
    </div>
  );
}
