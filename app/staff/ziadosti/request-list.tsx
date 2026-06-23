"use client";

import { useState, useTransition } from "react";
import { approveRequest, rejectRequest } from "./actions";

type Req = {
  id: string;
  ico: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  note: string | null;
  createdAt: string;
};
type Tier = { code: string; name: string; discountPct: string };

export function RequestList({ requests, tiers }: { requests: Req[]; tiers: Tier[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [tierSel, setTierSel] = useState<Record<string, string>>({});
  const [splat, setSplat] = useState<Record<string, number>>({});

  if (requests.length === 0) {
    return <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">Žiadne čakajúce žiadosti. 🎉</div>;
  }

  function doApprove(id: string) {
    setBusy(id); setErrs((e) => ({ ...e, [id]: "" }));
    const tier = tierSel[id] || tiers[0]?.code;
    const days = splat[id] ?? 14;
    start(async () => {
      const res = await approveRequest(id, tier, days);
      setBusy(null);
      if (!res.ok) { setErrs((e) => ({ ...e, [id]: res.error ?? "Chyba." })); return; }
      if (res.inviteLink) setLinks((l) => ({ ...l, [id]: res.inviteLink! }));
    });
  }
  function doReject(id: string) {
    setBusy(id);
    start(async () => { await rejectRequest(id); setBusy(null); });
  }

  return (
    <div className="flex flex-col gap-4">
      {requests.map((r) => {
        const link = links[r.id];
        const isBusy = busy === r.id && pending;
        return (
          <div key={r.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[16px] font-semibold text-ink">{r.companyName} <span className="text-[13px] font-normal text-muted-2">· IČO {r.ico}</span></div>
                <div className="mt-1 text-[14px] text-muted">{r.contactName} · {r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                {r.note && <p className="mt-2 max-w-[640px] text-[13.5px] leading-relaxed text-muted-3">„{r.note}"</p>}
              </div>
              <span className="whitespace-nowrap text-[12px] text-muted-2">{new Date(r.createdAt).toLocaleDateString("sk")}</span>
            </div>

            {link ? (
              <div className="mt-4 rounded-xl border border-mint/40 bg-mintbg/60 p-3.5">
                <div className="text-[13px] font-semibold text-brand">✓ Schválené — pošlite zákazníkovi odkaz na nastavenie hesla:</div>
                <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="mt-2 w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] text-muted-3" />
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
                <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-3">Cenová úroveň
                  <select value={tierSel[r.id] ?? tiers[0]?.code} onChange={(e) => setTierSel((t) => ({ ...t, [r.id]: e.target.value }))}
                    className="rounded-[9px] border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-brand">
                    {tiers.map((t) => <option key={t.code} value={t.code}>{t.code} — {t.name} (−{Number(t.discountPct)} %)</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-3">Splatnosť (dni)
                  <input type="number" min={0} value={splat[r.id] ?? 14} onChange={(e) => setSplat((s) => ({ ...s, [r.id]: Number(e.target.value) }))}
                    className="w-24 rounded-[9px] border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-brand" />
                </label>
                <button onClick={() => doApprove(r.id)} disabled={isBusy}
                  className="rounded-[9px] bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
                  {isBusy ? "…" : "Schváliť + pozvať"}
                </button>
                <button onClick={() => doReject(r.id)} disabled={isBusy}
                  className="rounded-[9px] border border-line px-4 py-2 text-[13.5px] font-medium text-muted transition hover:border-brand/40 hover:text-ink disabled:opacity-50">
                  Zamietnuť
                </button>
                {errs[r.id] && <span className="text-[13px] text-[#9a3025]">{errs[r.id]}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
