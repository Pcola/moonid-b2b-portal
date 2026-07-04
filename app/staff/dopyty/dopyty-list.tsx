"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setInquiryHandled } from "./actions";

type Item = {
  id: string; name: string; company: string; email: string;
  phone: string | null; location: string | null; type: string | null; segment: string | null;
  message: string; emailSent: boolean; handled: boolean; createdAt: string;
};

function dt(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("sk") + " " + d.toLocaleTimeString("sk", { hour: "2-digit", minute: "2-digit" });
}

function Row({ it }: { it: Item }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle() {
    setErr(null);
    start(async () => {
      const r = await setInquiryHandled(it.id, !it.handled);
      if (r.ok) router.refresh(); else setErr(r.error ?? "Nepodarilo sa.");
    });
  }

  const meta = [it.location, it.type, it.segment].filter(Boolean).join(" · ");
  const replyHref = `mailto:${it.email}?subject=${encodeURIComponent(`Re: Váš dopyt — Moonid`)}`;

  return (
    <div className={`rounded-2xl border bg-white p-5 transition ${it.handled ? "border-line opacity-75" : "border-mint-2"}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{it.company}</span>
            {!it.handled && <span className="rounded-full bg-[#fdf6e7] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a00]">Nový</span>}
            {it.handled && <span className="rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[11px] font-semibold text-[#14633f]">Vybavené</span>}
            {!it.emailSent && <span className="rounded-full bg-[#fdeceb] px-2 py-0.5 text-[11px] font-medium text-[#9a3025]" title="Notifikačný e-mail sa neodoslal (Resend neaktívny) — lead je len tu">mail neodišiel</span>}
          </div>
          <div className="mt-1 text-[13.5px] text-muted">
            {it.name} · <a href={replyHref} className="font-medium text-brand hover:text-brand-2">{it.email}</a>
            {it.phone && <> · <a href={`tel:${it.phone}`} className="text-ink hover:text-brand">{it.phone}</a></>}
          </div>
          {meta && <div className="mt-0.5 text-[12.5px] text-muted-2">{meta}</div>}
        </div>
        <div className="flex flex-none flex-col items-end gap-2">
          <span className="whitespace-nowrap text-[12.5px] text-muted-2">{dt(it.createdAt)}</span>
          <div className="flex items-center gap-2">
            <a href={replyHref} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-brand transition hover:border-brand/40">Odpovedať</a>
            <button onClick={toggle} disabled={pending} className="rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-semibold text-muted transition hover:text-ink disabled:opacity-50">
              {pending ? "…" : it.handled ? "Vrátiť späť" : "Označiť vybavené"}
            </button>
          </div>
        </div>
      </div>
      {it.message && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#fafbfa] px-3.5 py-3 text-[13.5px] leading-relaxed text-muted-3">{it.message}</p>}
      {err && <p className="mt-2 text-[12.5px] text-[#9a3025]">{err}</p>}
    </div>
  );
}

export function DopytyList({ items, showAll, newCount, capped, cap }: { items: Item[]; showAll: boolean; newCount: number; capped: boolean; cap: number }) {
  const tab = "rounded-[10px] px-3.5 py-2 text-[13.5px] font-semibold transition";
  return (
    <div className="flex max-w-[900px] flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-normal tracking-[-0.01em] text-ink">Kontaktné dopyty</h1>
        <p className="mt-1 text-[14px] text-muted">Dopyty z verejného formulára. Ukladajú sa aj keď notifikačný e-mail neodíde, takže sa žiadny lead nestratí.</p>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/staff/dopyty" className={`${tab} ${!showAll ? "bg-brand text-white" : "border border-line text-muted hover:text-ink"}`}>
          Nové{newCount > 0 && <span className={`ml-1.5 ${!showAll ? "text-mint" : "text-brand"}`}>{newCount}</span>}
        </Link>
        <Link href="/staff/dopyty?view=all" className={`${tab} ${showAll ? "bg-brand text-white" : "border border-line text-muted hover:text-ink"}`}>Všetky</Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <p className="text-[15px] font-medium text-ink">{showAll ? "Zatiaľ žiadne dopyty" : "Žiadne nové dopyty"}</p>
          <p className="mt-1 text-[13.5px] text-muted">{showAll ? "Dopyty z kontaktného formulára sa zobrazia tu." : "Všetky dopyty sú vybavené. 🎉"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it) => <Row key={it.id} it={it} />)}
        </div>
      )}
      {capped && <p className="text-center text-[12.5px] text-muted-2">Zobrazených najnovších {cap}. Staršie vybavené dopyty sú v DB.</p>}
    </div>
  );
}
