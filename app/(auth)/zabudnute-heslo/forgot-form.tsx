"use client";

import { useState, type FormEvent } from "react";
import { requestPasswordReset } from "@/app/(auth)/actions";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await requestPasswordReset(email.trim());
    setSent(true); // rovnaká hláška bez ohľadu na výsledok → žiadny info-leak
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="rounded-[10px] border border-mint/40 bg-mintbg/60 px-4 py-3.5 text-[14.5px] leading-relaxed text-brand">
        Ak e-mail existuje, poslali sme naň odkaz na nastavenie nového hesla. Skontrolujte si schránku.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted-3">
        Firemný e-mail
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="vas@email.sk"
          className="rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand" />
      </label>
      <button type="submit" disabled={loading}
        className="rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
        {loading ? "Odosielam…" : "Poslať odkaz"}
      </button>
    </form>
  );
}
