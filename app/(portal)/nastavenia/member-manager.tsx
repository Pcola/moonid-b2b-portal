"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteMember, setMemberPermissions, setMemberActive } from "./actions";

type Member = { id: string; name: string | null; email: string; role: string; active: boolean; canOrderDirectly: boolean; approverId: string | null };

const ROLE: Record<string, string> = { CUSTOMER_ADMIN: "Správca firmy", CUSTOMER_USER: "Používateľ", STAFF: "Moonid tím", ADMIN: "Administrátor" };
const inp = "rounded-[9px] border border-line bg-white px-2.5 py-2 text-[13.5px] text-ink outline-none transition focus:border-brand";

function MemberRow({ m, members, currentUserId }: { m: Member; members: Member[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"direct" | "approval">(m.canOrderDirectly ? "direct" : "approval");
  const [approverId, setApproverId] = useState<string>(m.approverId ?? "");
  const isAdminRole = m.role === "CUSTOMER_ADMIN";
  const approvers = members.filter((x) => x.id !== m.id && x.active);

  function save() {
    setErr(null);
    start(async () => {
      const r = await setMemberPermissions(m.id, { canOrderDirectly: mode === "direct", approverId: mode === "approval" ? (approverId || null) : null });
      if (r.ok) router.refresh(); else setErr(r.error ?? "Nepodarilo sa uložiť.");
    });
  }
  function toggleActive() {
    setErr(null);
    start(async () => { const r = await setMemberActive(m.id, !m.active); if (r.ok) router.refresh(); else setErr(r.error ?? "Chyba"); });
  }

  const dirty = (mode === "direct") !== m.canOrderDirectly || (mode === "approval" && approverId !== (m.approverId ?? ""));

  return (
    <div className={`flex flex-col gap-3 px-6 py-4 ${m.active ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-mintbg text-[12.5px] font-bold text-brand">{(m.name || m.email).slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-ink">{m.name || m.email}{m.id === currentUserId && <span className="ml-1.5 text-[12px] text-muted-2">(vy)</span>}</div>
          {m.name && <div className="truncate text-[12.5px] text-muted-2">{m.email}</div>}
        </div>
        <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11.5px] font-medium text-muted">{ROLE[m.role] ?? m.role}</span>
        {!m.active && <span className="rounded-full bg-[#fdeceb] px-2.5 py-0.5 text-[11.5px] font-medium text-[#9a3025]">neaktívne</span>}
        {m.id !== currentUserId && (
          <button onClick={toggleActive} disabled={pending} className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-muted transition hover:text-ink disabled:opacity-50">{m.active ? "Deaktivovať" : "Aktivovať"}</button>
        )}
      </div>

      {isAdminRole ? (
        <div className="text-[12.5px] text-muted-2">Správca firmy — objednáva priamo a schvaľuje objednávky.</div>
      ) : m.active ? (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg bg-[#fafbfa] px-3 py-2.5">
          <span className="text-[12.5px] font-semibold text-muted-3">Objednávanie:</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as "direct" | "approval")} className={inp}>
            <option value="direct">Objednáva priamo</option>
            <option value="approval">Vyžaduje schválenie</option>
          </select>
          {mode === "approval" && (
            <>
              <span className="text-[12.5px] text-muted-3">schvaľuje:</span>
              <select value={approverId} onChange={(e) => setApproverId(e.target.value)} className={inp}>
                <option value="">— vyberte —</option>
                {approvers.map((a) => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
              </select>
            </>
          )}
          {dirty && <button onClick={save} disabled={pending} className="rounded-[9px] bg-brand px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">{pending ? "…" : "Uložiť"}</button>}
        </div>
      ) : null}
      {err && <div className="text-[12.5px] text-[#9a3025]">{err}</div>}
    </div>
  );
}

function InviteMember() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);

  function invite() {
    setMsg(null); setLink(null);
    start(async () => {
      const r = await inviteMember({ email, name });
      if (r.ok) { setMsg({ ok: true, text: "Pozvánka odoslaná ✓" }); setLink(r.inviteLink ?? null); setEmail(""); setName(""); router.refresh(); }
      else setMsg({ ok: false, text: r.error ?? "Chyba" });
    });
  }
  if (!open) {
    return <button onClick={() => setOpen(true)} className="inline-flex w-fit items-center gap-2 rounded-[10px] border border-dashed border-line bg-white px-4 py-2.5 text-[13.5px] font-semibold text-brand transition hover:border-mint-2">+ Pozvať člena firmy</button>;
  }
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-brand/30 bg-white p-4">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-mail kolegu *" className={inp} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meno (nepovinné)" className={inp} />
      </div>
      <div className="flex items-center gap-2.5">
        <button onClick={invite} disabled={pending || !email.trim()} className="rounded-[10px] bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">{pending ? "Pozývam…" : "Pozvať"}</button>
        <button onClick={() => { setOpen(false); setMsg(null); setLink(null); }} className="rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-semibold text-muted transition hover:text-ink">Zrušiť</button>
        {msg && <span className={`text-[13px] font-semibold ${msg.ok ? "text-brand" : "text-[#9a3025]"}`}>{msg.text}</span>}
      </div>
      {link && (
        <div className="rounded-lg border border-line bg-[#fafbfa] px-3 py-2.5 text-[12px] text-muted-3">
          Pozvánkový odkaz (ak e-mail nedorazí, pošlite ho kolegovi ručne):
          <div className="mt-1 break-all font-mono text-[11.5px] text-ink">{link}</div>
        </div>
      )}
    </div>
  );
}

export function MemberManager({ isAdmin, members, currentUserId }: { isAdmin: boolean; members: Member[]; currentUserId: string }) {
  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="text-[18px] font-normal text-ink">Používatelia</h2>
        <span className="text-[12.5px] text-muted-2">{members.length} {members.length === 1 ? "konto" : members.length >= 2 && members.length <= 4 ? "kontá" : "kont"}</span>
      </div>
      <div className="divide-y divide-line">
        {members.map((m) => (
          isAdmin
            ? <MemberRow key={m.id} m={m} members={members} currentUserId={currentUserId} />
            : (
              <div key={m.id} className="flex items-center gap-3 px-6 py-3.5">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-mintbg text-[12.5px] font-bold text-brand">{(m.name || m.email).slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-ink">{m.name || m.email}</div>
                  {m.name && <div className="truncate text-[12.5px] text-muted-2">{m.email}</div>}
                </div>
                <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11.5px] font-medium text-muted">{ROLE[m.role] ?? m.role}</span>
                {!m.canOrderDirectly && <span className="rounded-full bg-[#fdf6e7] px-2.5 py-0.5 text-[11px] font-medium text-[#8a5a00]">na schválenie</span>}
              </div>
            )
        ))}
      </div>
      {isAdmin && <div className="border-t border-line px-6 py-4"><InviteMember /></div>}
      {!isAdmin && <div className="border-t border-line px-6 py-3.5 text-[12.5px] text-muted-2">Používateľov a ich práva spravuje správca firmy.</div>}
    </section>
  );
}
