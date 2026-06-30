"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { quickAddToCart } from "../kosik/actions";

type Result = Awaited<ReturnType<typeof quickAddToCart>>;

export function QuickOrderForm() {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => setText((prev) => (prev ? prev + "\n" : "") + t));
  }

  function submit() {
    setRes(null);
    start(async () => setRes(await quickAddToCart(text)));
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={"napr.\nMYDLO-5L, 3\nUTIERKY-200, 5\nVRECIA-120L"}
        className="w-full rounded-[12px] border border-line bg-white px-4 py-3 font-mono text-[14px] text-ink outline-none transition focus:border-brand"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={submit} disabled={pending || !text.trim()} className="rounded-[10px] bg-brand px-5 py-3 text-[14.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
          {pending ? "Pridávam…" : "Pridať do košíka"}
        </button>
        <label className="cursor-pointer text-[13.5px] font-semibold text-brand hover:text-brand-2">
          Nahrať CSV
          <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="hidden" />
        </label>
      </div>

      {res && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 text-[14px]">
          {res.error && <p className="text-[#9a3025]">{res.error}</p>}
          {res.ok && (
            <>
              {res.added.length > 0 ? (
                <div>
                  <p className="font-semibold text-brand-2">Pridané do košíka ({res.added.length}):</p>
                  <ul className="mt-1.5 flex flex-col gap-0.5 text-muted">
                    {res.added.map((a) => <li key={a.sku}><span className="font-mono text-[12.5px] text-muted-2">{a.sku}</span> · {a.name} — {a.qty} ks</li>)}
                  </ul>
                </div>
              ) : <p className="text-muted">Nič sa nepridalo.</p>}
              {res.notFound.length > 0 && (
                <p className="text-[#9a6b0e]">Nenájdené SKU: <span className="font-mono text-[12.5px]">{res.notFound.join(", ")}</span></p>
              )}
              {res.onRequest.length > 0 && (
                <p className="text-muted-2">Na vyžiadanie (nepridané): <span className="font-mono text-[12.5px]">{res.onRequest.join(", ")}</span></p>
              )}
              {res.added.length > 0 && (
                <Link href="/kosik" className="mt-1 inline-flex w-fit items-center gap-2 rounded-[10px] bg-brand px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2">Prejsť do košíka →</Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
