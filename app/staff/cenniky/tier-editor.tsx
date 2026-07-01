"use client";

import { useState, useTransition } from "react";
import { updateTier } from "./actions";

type Tier = { code: string; name: string; discountPct: number; companies: number };

export function TierEditor({ tiers, descriptions }: { tiers: Tier[]; descriptions: Record<string, string> }) {
  return (
    <div className="grid gap-[clamp(16px,2vw,22px)]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
      {tiers.map((t) => (
        <TierCard key={t.code} tier={t} desc={descriptions[t.code]} />
      ))}
    </div>
  );
}

function TierCard({ tier, desc }: { tier: Tier; desc?: string }) {
  const [name, setName] = useState(tier.name);
  const [pct, setPct] = useState(String(tier.discountPct));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = name !== tier.name || Number(pct) !== Number(tier.discountPct);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateTier(tier.code, { name: name.trim(), discountPct: Number(pct) });
      setMsg(res.ok ? { ok: true, text: "Uložené." } : { ok: false, text: res.error ?? "Nepodarilo sa uložiť." });
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Úroveň {tier.code}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[19px] font-normal text-ink outline-none transition focus:border-brand"
          />
        </div>
        <div className="flex flex-none items-baseline gap-1">
          <span className="text-[22px] font-normal text-brand">−</span>
          <input
            type="number" min={0} max={90} step={0.5}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="w-[68px] rounded-lg border border-line bg-white px-2 py-1 text-right text-[24px] font-normal text-brand outline-none transition focus:border-brand tabular-nums"
          />
          <span className="text-[18px] text-brand">%</span>
        </div>
      </div>
      {desc && <p className="text-[13.5px] leading-relaxed text-muted">{desc}</p>}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3.5">
        <span className="text-[13px] text-muted-2">{tier.companies} {tier.companies === 1 ? "zákazník" : tier.companies >= 2 && tier.companies <= 4 ? "zákazníci" : "zákazníkov"}</span>
        <div className="flex items-center gap-2.5">
          {msg && <span className={`text-[12.5px] ${msg.ok ? "text-brand-2" : "text-[#9a3025]"}`}>{msg.text}</span>}
          <button
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-40"
          >
            {pending ? "Ukladám…" : "Uložiť"}
          </button>
        </div>
      </div>
    </div>
  );
}
