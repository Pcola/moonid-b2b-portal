"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changeOwnPassword, updateProfile } from "./actions";
import { LiveMessage } from "@/components/ui/live-region";
import { buttonClass } from "@/components/ui/button";

const inp = "rounded-[10px] border border-field bg-white px-3.5 py-2.5 text-[14.5px] text-ink outline-none transition focus:border-brand";
const lbl = "flex flex-col gap-1.5 text-[12.5px] font-medium text-muted-3";

function NameEditor({ initialName, email }: { initialName: string | null; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = name.trim() !== (initialName ?? "").trim();

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateProfile({ name: name.trim() });
      if (r.ok) { setMsg({ ok: true, text: "Uložené ✓" }); router.refresh(); }
      else setMsg({ ok: false, text: r.error ?? "Nepodarilo sa uložiť." });
    });
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={lbl}>Meno
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" className={inp} placeholder="Meno a priezvisko" />
        </label>
        <label className={lbl}>E-mail
          <input value={email} disabled autoComplete="email" className={`${inp} cursor-not-allowed bg-cream/50 text-muted-2`} />
        </label>
      </div>
      <div className="flex items-center gap-2.5">
        <button onClick={save} disabled={pending || !dirty || !name.trim()} className="rounded-[10px] bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
          {pending ? "Ukladám…" : "Uložiť meno"}
        </button>
        <LiveMessage message={pending ? "Ukladám…" : msg?.ok ? msg.text : null} />
        <LiveMessage message={msg && !msg.ok ? msg.text : null} tone="error" />
        {msg && <span className={`text-[13px] font-medium ${msg.ok ? "text-brand-2" : "text-danger-ink"}`}>{msg.text}</span>}
      </div>
      <p className="text-[12px] text-muted-2">E-mail je prihlasovacie meno — zmenu adresy rieši správca firmy / Moonid.</p>
    </div>
  );
}

function PasswordChanger({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 12) { setMsg({ ok: false, text: "Nové heslo musí mať aspoň 12 znakov." }); return; }
    if (next !== confirm) { setMsg({ ok: false, text: "Nové heslá sa nezhodujú." }); return; }
    if (next === current) { setMsg({ ok: false, text: "Nové heslo sa musí líšiť od súčasného." }); return; }
    setLoading(true);
    const result = await changeOwnPassword({ currentPassword: current, newPassword: next });
    if (!result.ok) {
      setMsg({ ok: false, text: result.error ?? "Heslo sa nepodarilo zmeniť. Skúste znova." });
      setLoading(false);
      return;
    }
    setCurrent(""); setNext(""); setConfirm("");
    router.replace("/login?password=changed");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="border-t border-line px-6 py-4">
        <button onClick={() => { setOpen(true); setMsg(null); }} className="text-[13.5px] font-semibold text-brand transition hover:text-brand-2">Zmeniť heslo</button>
        <LiveMessage message={msg?.ok ? msg.text : null} />
        {msg?.ok && <span className="ml-3 text-[13px] font-medium text-brand-2">{msg.text}</span>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-line px-6 py-5">
      <h3 className="text-[13px] font-semibold text-ink">Zmena hesla</h3>
      {/* skryté používateľské meno pre password managery (a11y/autofill) */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={lbl}>Súčasné heslo
          <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" aria-invalid={msg?.text === "Súčasné heslo je nesprávne." || undefined} aria-describedby={msg && !msg.ok ? "pw-change-error" : undefined} className={inp} />
        </label>
        <label className={lbl}>Nové heslo
          <input type="password" required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={12} aria-invalid={(!!msg && !msg.ok && msg.text !== "Súčasné heslo je nesprávne.") || undefined} aria-describedby={msg && !msg.ok ? "pw-change-error" : undefined} className={inp} />
        </label>
        <label className={lbl}>Nové heslo znova
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={12} aria-invalid={msg?.text === "Nové heslá sa nezhodujú." || undefined} aria-describedby={msg && !msg.ok ? "pw-change-error" : undefined} className={inp} />
        </label>
      </div>
      <div className="flex items-center gap-2.5">
        <button type="submit" disabled={loading} className={buttonClass({ size: "sm" })}>
          {loading ? "Ukladám…" : "Uložiť nové heslo"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setMsg(null); }} className="rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-semibold text-muted transition hover:text-ink">Zrušiť</button>
        <LiveMessage message={loading ? "Ukladám…" : null} />
        <LiveMessage message={msg && !msg.ok ? msg.text : null} tone="error" />
        {msg && !msg.ok && <span id="pw-change-error" className="text-[13px] font-medium text-danger-ink">{msg.text}</span>}
      </div>
      <p className="text-[12px] text-muted-2">Min. 12 znakov. Heslo overujeme voči databáze uniknutých hesiel.</p>
    </form>
  );
}

export function AccountCard({ name, email }: { name: string | null; email: string }) {
  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className="border-b border-line px-6 py-4"><h2 className="text-[18px] font-normal text-ink">Moje konto</h2></div>
      <NameEditor initialName={name} email={email} />
      <PasswordChanger email={email} />
    </section>
  );
}
