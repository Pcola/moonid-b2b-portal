"use client";

import { useState, useTransition } from "react";
import { exportMyData, requestErasure } from "./actions";

export function GdprSection() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erasing, setErasing] = useState(false);
  const [reason, setReason] = useState("");
  const [erased, setErased] = useState(false);

  function doExport() {
    setMsg(null);
    start(async () => {
      const res = await exportMyData();
      if (!res.ok || !res.data) { setMsg(res.error ?? "Export sa nepodaril."); return; }
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "moonid-moje-udaje.json";
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Export stiahnutý.");
    });
  }

  function doErasure() {
    start(async () => {
      const res = await requestErasure(reason);
      if (!res.ok) { setMsg(res.error ?? "Žiadosť sa nepodarila."); return; }
      setErased(true);
      setErasing(false);
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className="border-b border-line px-6 py-4"><h2 className="text-[18px] font-normal text-ink">Ochrana osobných údajov (GDPR)</h2></div>
      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[14.5px] font-medium text-ink">Export mojich údajov</div>
            <div className="text-[13px] text-muted-2">Stiahnite si všetky údaje, ktoré o vás vedieme (právo na prístup a prenosnosť).</div>
          </div>
          <button onClick={doExport} disabled={pending} className="rounded-[10px] border border-line px-4 py-2.5 text-[14px] font-semibold text-ink transition hover:border-brand disabled:opacity-60">
            {pending ? "Pripravujem…" : "Stiahnuť JSON"}
          </button>
        </div>

        <div className="border-t border-line pt-4">
          {erased ? (
            <p className="text-[13.5px] text-brand-2">Žiadosť o výmaz bola odoslaná. Vybavíme ju do 30 dní a ozveme sa.</p>
          ) : !erasing ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[14.5px] font-medium text-ink">Žiadosť o výmaz údajov</div>
                <div className="text-[13px] text-muted-2">Právo na výmaz. Pozn.: vystavené faktúry podliehajú zákonnej archivácii (10 r.).</div>
              </div>
              <button onClick={() => setErasing(true)} disabled={pending} className="rounded-[10px] border border-[#f0c9c2] px-4 py-2.5 text-[14px] font-semibold text-[#9a3025] transition hover:bg-[#fdf4f2] disabled:opacity-60">
                Požiadať o výmaz
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Dôvod alebo rozsah žiadosti (nepovinné)…" className="rounded-[10px] border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand" />
              <div className="flex gap-2">
                <button onClick={doErasure} disabled={pending} className="rounded-[10px] bg-[#9a3025] px-4 py-2 text-[13.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60">{pending ? "Odosielam…" : "Odoslať žiadosť"}</button>
                <button onClick={() => setErasing(false)} className="rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-medium text-muted transition hover:border-brand/40">Zrušiť</button>
              </div>
            </div>
          )}
        </div>

        {msg && <p className="text-[13px] text-muted-3">{msg}</p>}
      </div>
    </section>
  );
}
