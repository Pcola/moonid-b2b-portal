"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inp = "rounded-[10px] border border-line bg-white px-3 py-2 text-[13.5px] text-ink outline-none transition focus:border-brand";

export function AuditFilters({ actions, active }: { actions: string[]; active: { action: string; q: string } }) {
  const router = useRouter();
  const [q, setQ] = useState(active.q);

  function go(patch: { action?: string; q?: string }) {
    const action = patch.action !== undefined ? patch.action : active.action;
    const query = patch.q !== undefined ? patch.q : q;
    const u = new URLSearchParams();
    if (action) u.set("action", action);
    if (query.trim()) u.set("q", query.trim());
    const s = u.toString();
    router.push(s ? `/staff/audit?${s}` : "/staff/audit");
  }

  const hasFilter = active.action || active.q;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <select value={active.action} onChange={(e) => go({ action: e.target.value })} className={`${inp} min-w-[190px]`} aria-label="Filter podľa akcie">
        <option value="">Všetky akcie</option>
        {actions.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") go({ q }); }}
          placeholder="Hľadať (e-mail, IP, entita, ID)…"
          className={`${inp} w-[240px]`}
          aria-label="Hľadať v audit logu"
        />
        <button onClick={() => go({ q })} className="rounded-[10px] bg-brand px-3.5 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2">Hľadať</button>
      </div>
      {hasFilter && (
        <button onClick={() => { setQ(""); router.push("/staff/audit"); }} className="text-[13px] font-semibold text-muted transition hover:text-ink">Zrušiť filtre</button>
      )}
    </div>
  );
}
