"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setErr("Nesprávny e-mail alebo heslo.");
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {err && (
        <div className="rounded-[10px] border border-[#f0c9c2] bg-[#fdecea] px-3.5 py-2.5 text-[13.5px] text-[#9a3025]">{err}</div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted-3">E-mail</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
          className="rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand" />
      </label>
      <label className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-3">Heslo</span>
          <a href="/zabudnute-heslo" className="text-[12.5px] text-brand transition hover:text-brand-2">Zabudnuté heslo?</a>
        </div>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
          className="rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand" />
      </label>
      <button type="submit" disabled={loading}
        className="mt-1 rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
        {loading ? "Prihlasujem…" : "Prihlásiť sa"}
      </button>
    </form>
  );
}
