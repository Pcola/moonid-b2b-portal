"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/nastav-heslo`,
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Link href="/" className="text-[30px] font-bold tracking-[-0.02em] text-brand">moonid</Link>
        </div>
        <div className="rounded-2xl border border-line bg-white p-7 shadow-[0_20px_50px_-30px_rgba(16,42,38,0.3)]">
          <h1 className="mb-2 text-[20px] font-semibold text-ink">Zabudnuté heslo</h1>
          {sent ? (
            <p className="text-[14.5px] leading-relaxed text-muted">Ak e-mail existuje, poslali sme naň odkaz na nastavenie nového hesla.</p>
          ) : (
            <>
              <p className="mb-5 text-[14px] leading-relaxed text-muted">Zadajte e-mail a pošleme vám odkaz na obnovu hesla.</p>
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="vas@email.sk"
                  className="rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand" />
                <button type="submit" disabled={loading}
                  className="rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
                  {loading ? "Odosielam…" : "Poslať odkaz"}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-[13.5px] text-muted-2">
          <Link href="/login" className="font-medium text-brand transition hover:text-brand-2">Späť na prihlásenie</Link>
        </p>
      </div>
    </main>
  );
}
