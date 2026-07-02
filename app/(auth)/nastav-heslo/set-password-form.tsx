"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Kontrola hesla voči HaveIBeenPwned (k-anonymity — posiela sa len 5-znakový SHA-1 prefix). */
async function isPwned(pw: string): Promise<boolean> {
  try {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
    const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    if (!res.ok) return false;
    const suffix = hash.slice(5);
    return (await res.text()).split("\n").some((line) => line.split(":")[0].trim() === suffix);
  } catch {
    return false; // ak je HIBP nedostupné, registráciu nezablokujeme
  }
}

export function SetPasswordForm({ email }: { email?: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 12) {
      setErr("Heslo musí mať aspoň 12 znakov.");
      return;
    }
    setLoading(true);
    if (await isPwned(password)) {
      setErr("Toto heslo sa našlo v známych únikoch dát. Zvoľte iné, bezpečnejšie heslo.");
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
    // bezpečnosť: po zmene hesla zruš ostatné relácie (kompromitované zariadenia), aktuálnu nechaj
    await supabase.auth.signOut({ scope: "others" }).catch(() => {});
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* skryté používateľské meno pre správcov hesiel (autofill/a11y) */}
      {email && <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />}
      {err && <div className="rounded-[10px] border border-[#f0c9c2] bg-[#fdecea] px-3.5 py-2.5 text-[13.5px] text-[#9a3025]">{err}</div>}
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted-3">
        Nové heslo
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={12}
          className="rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand" />
      </label>
      <button type="submit" disabled={loading}
        className="rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
        {loading ? "Ukladám…" : "Uložiť heslo a prihlásiť"}
      </button>
    </form>
  );
}
