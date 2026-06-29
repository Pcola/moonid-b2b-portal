"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProduct } from "../actions";

const inputCls = "w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-[14.5px] text-ink outline-none transition focus:border-brand";
const labelCls = "mb-1.5 block text-[12.5px] font-semibold uppercase tracking-wide text-muted-2";

export function NewProductForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createProduct(fd);
      if (!res.ok) { setError(res.error ?? "Nepodarilo sa uložiť."); return; }
      router.push("/staff/katalog");
      router.refresh();
    });
  }

  return (
    <div className="max-w-[680px]">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/staff/katalog" className="text-[14px] font-semibold text-brand transition hover:text-brand-2">← Katalóg</Link>
        <h1 className="text-[22px] font-normal tracking-[-0.01em] text-ink">Nový produkt</h1>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6">
        <div>
          <label className={labelCls}>Názov *</label>
          <input name="name" required maxLength={200} className={inputCls} placeholder="napr. Tekuté mydlo 5 l" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>SKU / kód *</label>
            <input name="sku" required maxLength={60} className={inputCls} placeholder="napr. MAN-MYDLO-5L" />
          </div>
          <div>
            <label className={labelCls}>Kategória</label>
            <select name="categoryId" className={inputCls} defaultValue="">
              <option value="">— bez kategórie —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Jednotka</label>
            <input name="unit" defaultValue="ks" maxLength={20} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Cena bez DPH (€)</label>
            <input name="basePrice" inputMode="decimal" className={inputCls} placeholder="napr. 12,50" />
          </div>
          <div>
            <label className={labelCls}>DPH (%)</label>
            <input name="vatRate" inputMode="decimal" defaultValue="23" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Popis</label>
          <textarea name="descriptionLong" rows={3} maxLength={4000} className={inputCls} placeholder="Voliteľný popis produktu…" />
        </div>

        <div>
          <label className={labelCls}>Obrázok</label>
          <input name="image" type="file" accept="image/*" className="block w-full text-[13.5px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-mintbg file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-brand" />
          <p className="mt-1 text-[12px] text-muted-2">Nahrá sa do vlastného úložiska (nie dodávateľa).</p>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <label className="flex items-center gap-2.5 text-[14px] text-ink">
            <input type="checkbox" name="isPublished" className="h-4 w-4 accent-brand" /> Publikovať v katalógu zákazníkov
          </label>
          <label className="flex items-center gap-2.5 text-[14px] text-ink">
            <input type="checkbox" name="isSubsidized" className="h-4 w-4 accent-brand" /> Dotovaný / na vyžiadanie (cena sa nezobrazí)
          </label>
        </div>

        {error && <p className="text-[13.5px] text-[#9a3025]">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="rounded-[10px] bg-brand px-5 py-3 text-[14.5px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-50">
            {pending ? "Ukladám…" : "Uložiť produkt"}
          </button>
          <Link href="/staff/katalog" className="rounded-[10px] border border-line px-5 py-3 text-[14.5px] font-medium text-muted transition hover:border-brand/40">Zrušiť</Link>
        </div>
      </form>
    </div>
  );
}
