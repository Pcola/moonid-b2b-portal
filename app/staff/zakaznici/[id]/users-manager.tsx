"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompanyUserActive, setCompanyUserRole, resendCompanyUserInvite } from "../actions";

type U = { id: string; name: string | null; email: string; role: string; active: boolean };

const ROLE: Record<string, string> = { CUSTOMER_ADMIN: "Správca firmy", CUSTOMER_USER: "Používateľ", STAFF: "Staff", ADMIN: "Admin" };
const sel = "rounded-lg border border-line bg-white px-2 py-1 text-[12.5px] text-ink outline-none transition focus:border-brand";
const btn = "rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-muted transition hover:text-ink disabled:opacity-50";

function UserRow({ u }: { u: U }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const isInternal = u.role === "STAFF" || u.role === "ADMIN";

  function run(fn: () => Promise<{ ok: boolean; error?: string; inviteLink?: string | null }>, keepLink = false) {
    setErr(null); if (!keepLink) setLink(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Nepodarilo sa.");
      else if (r.inviteLink !== undefined) setLink(r.inviteLink ?? null);
      router.refresh(); // aj po chybe — vráti napr. rolový select na skutočný stav z DB
    });
  }

  return (
    <div className={`flex flex-col gap-2 border-b border-line pb-3 last:border-0 last:pb-0 ${u.active ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-ink">{u.name ?? u.email}</div>
          <div className="truncate text-[12.5px] text-muted-2">{u.email}</div>
        </div>
        {!u.active && <span className="whitespace-nowrap rounded-full bg-[#fdeceb] px-2 py-0.5 text-[11px] font-medium text-[#9a3025]">neaktívne</span>}
      </div>

      {isInternal ? (
        <span className="text-[12px] text-muted-2">{ROLE[u.role] ?? u.role} — interné konto</span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={u.role}
            disabled={pending}
            onChange={(e) => { const v = e.target.value; if (v !== u.role) run(() => setCompanyUserRole(u.id, v)); }}
            className={sel}
            aria-label="Rola používateľa"
          >
            <option value="CUSTOMER_ADMIN">Správca firmy</option>
            <option value="CUSTOMER_USER">Používateľ</option>
          </select>
          <button onClick={() => run(() => setCompanyUserActive(u.id, !u.active))} disabled={pending} className={btn}>
            {u.active ? "Deaktivovať" : "Aktivovať"}
          </button>
          {u.active && (
            <button onClick={() => run(() => resendCompanyUserInvite(u.id), true)} disabled={pending} className={btn}>
              Poslať prístup znova
            </button>
          )}
        </div>
      )}

      {err && <span className="text-[12px] text-[#9a3025]">{err}</span>}
      {link && (
        <div className="rounded-lg border border-line bg-cream/50 p-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Prístupový odkaz (pošlite používateľovi)</p>
          <p className="break-all font-mono text-[11.5px] text-ink">{link}</p>
        </div>
      )}
    </div>
  );
}

export function UsersManager({ users }: { users: U[] }) {
  if (users.length === 0) return <p className="text-[13.5px] text-muted-2">Žiadni používatelia.</p>;
  return (
    <div className="flex flex-col gap-3">
      {users.map((u) => <UserRow key={u.id} u={u} />)}
    </div>
  );
}
