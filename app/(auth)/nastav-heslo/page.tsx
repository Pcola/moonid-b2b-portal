"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    if (password.length < 8) {
      setErr("Heslo musí mať aspoň 8 znakov.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErr("Odkaz vypršal alebo je neplatný. Skúste obnovu hesla znova.");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Link href="/" className="text-[30px] font-bold tracking-[-0.02em] text-brand">moonid</Link>
        </div>
        <div className="rounded-2xl border border-line bg-white p-7 shadow-[0_20px_50px_-30px_rgba(16,42,38,0.3)]">
          <h1 className="mb-5 text-[20px] font-semibold text-ink">Nastavenie hesla</h1>
          {err && <div className="mb-4 rounded-[10px] border border-[#f0c9c2] bg-[#fdecea] px-3.5 py-2.5 text-[13.5px] text-[#9a3025]">{err}</div>}
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted-3">Nové heslo</span>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8}
                className="rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand" />
            </label>
            <button type="submit" disabled={loading}
              className="rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
              {loading ? "Ukladám…" : "Uložiť heslo a prihlásiť"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
