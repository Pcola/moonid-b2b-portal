"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
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
