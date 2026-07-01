"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addUserToCompany } from "../actions";

const inp = "rounded-lg border border-line bg-white px-2.5 py-1.5 text-[13.5px] text-ink outline-none transition focus:border-brand";

export function AddUserForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);

  function submit() {
    if (!email.trim()) return;
    setMsg(null); setLink(null);
    start(async () => {
      const res = await addUserToCompany(companyId, email.trim(), name.trim());
      if (!res.ok) { setMsg({ ok: false, text: res.error ?? "Nepodarilo sa." }); return; }
      setMsg({ ok: true, text: "Používateľ pozvaný." });
      setLink(res.inviteLink ?? null);
      setEmail(""); setName("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-1 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-brand transition hover:text-brand-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Pridať používateľa
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-xl border border-dashed border-line p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="e-mail *" className={inp} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="meno (voliteľné)" className={inp} />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={pending || !email.trim()} className="rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
          {pending ? "Pozývam…" : "Pozvať"}
        </button>
        <button onClick={() => { setOpen(false); setMsg(null); setLink(null); }} className="text-[13px] font-medium text-muted transition hover:text-ink">Zrušiť</button>
        {msg && <span className={`text-[12.5px] ${msg.ok ? "text-brand-2" : "text-[#9a3025]"}`}>{msg.text}</span>}
      </div>
      {link && (
        <div className="rounded-lg border border-line bg-cream/50 p-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-2">Pozvánkový odkaz</p>
          <p className="break-all font-mono text-[11.5px] text-ink">{link}</p>
        </div>
      )}
    </div>
  );
}
