"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { updateProduct, updateProductImage } from "../actions";
import { LiveMessage } from "@/components/ui/live-region";

type Product = {
  id: string; sku: string; name: string; origin: string; nameDisplay: string; categoryId: string; subcategoryId: string;
  unit: string; brand: string; basePrice: number | null; vatRate: number; descriptionLong: string;
  isPublished: boolean; isSubsidized: boolean; isStocked: boolean; image: string; slug: string | null;
  stockCache: number | null; stockFresh: boolean; stockSyncedAt: string | null;
};

const inp = "rounded-[10px] border border-field bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand";
const lbl = "flex flex-col gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-2";

export function ProductEditForm({ product, cats, canEditPricing }: { product: Product; cats: { id: string; name: string; parentId: string | null }[]; canEditPricing: boolean }) {
  const [f, setF] = useState({
    nameDisplay: product.nameDisplay, categoryId: product.categoryId, subcategoryId: product.subcategoryId, unit: product.unit, brand: product.brand,
    basePrice: product.basePrice != null ? String(product.basePrice) : "", vatRate: String(product.vatRate),
    descriptionLong: product.descriptionLong, isPublished: product.isPublished, isSubsidized: product.isSubsidized,
    isStocked: product.isStocked,
  });
  const topCats = cats.filter((c) => !c.parentId);
  const subCats = cats.filter((c) => c.parentId === f.categoryId);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [img, setImg] = useState(product.image);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgMsg, setImgMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateProduct(product.id, {
        nameDisplay: f.nameDisplay, categoryId: f.categoryId, subcategoryId: f.subcategoryId, unit: f.unit, brand: f.brand,
        basePrice: f.basePrice.trim() === "" ? null : Number(f.basePrice.replace(",", ".")),
        vatRate: Number(f.vatRate.replace(",", ".")), descriptionLong: f.descriptionLong,
        isPublished: f.isPublished, isSubsidized: f.isSubsidized, isStocked: f.isStocked,
      });
      setMsg(res.ok ? { ok: true, text: "Uložené." } : { ok: false, text: res.error ?? "Nepodarilo sa uložiť." });
    });
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true); setImgMsg(null);
    const fd = new FormData(); fd.append("image", file);
    const res = await updateProductImage(product.id, fd);
    setImgBusy(false);
    if (res.ok && res.url) { setImg(res.url + "?t=" + Date.now()); setImgMsg(null); }
    else setImgMsg(res.error ?? "Nahrávanie zlyhalo.");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[20px] font-normal text-ink">{f.nameDisplay || product.name}</h2>
          <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted-2">
            <span className="font-mono">{product.sku}</span>
            <span className="rounded bg-cream px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide">{product.origin}</span>
            {product.slug && <Link href={`/katalog/${product.slug}`} className="text-brand hover:text-brand-2" target="_blank">náhľad ↗</Link>}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        {/* obrázok */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-[#fafbfa]">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="max-h-full max-w-full object-contain p-2" />
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-muted-2 opacity-40"><rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPickImage} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={imgBusy} className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink transition hover:border-brand/40 disabled:opacity-50">
            {imgBusy ? "Nahrávam…" : img ? "Zmeniť obrázok" : "Nahrať obrázok"}
          </button>
          <LiveMessage message={imgBusy ? "Nahrávam obrázok…" : null} />
          <LiveMessage message={imgMsg} tone="error" />
          {imgMsg && <span className="text-[12px] text-[#9a3025]">{imgMsg}</span>}
          <p className="text-[11.5px] text-muted-2">JPG/PNG/WEBP, max 5 MB. Ukladá sa do vlastného úložiska.</p>
        </div>

        {/* polia */}
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[22px]">
          <label className={lbl}>Zobrazovaný názov <span className="font-normal normal-case text-muted-2">(prázdne = názov z Pohody: {product.name})</span>
            <input value={f.nameDisplay} onChange={(e) => setF({ ...f, nameDisplay: e.target.value })} placeholder={product.name} className={inp} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={lbl}>Kategória
              <select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value, subcategoryId: "" })} className={inp}>
                <option value="">— nezaradené —</option>
                {topCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className={lbl}>Podkategória
              <select value={f.subcategoryId} onChange={(e) => setF({ ...f, subcategoryId: e.target.value })} disabled={subCats.length === 0} className={`${inp} disabled:opacity-50`}>
                <option value="">{subCats.length === 0 ? "— žiadne podkategórie —" : "— bez podkategórie —"}</option>
                {subCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className={lbl}>Značka<input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} className={inp} /></label>
            <label className={lbl}>Jednotka<input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className={inp} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className={lbl}>Cena (bez DPH)<input value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: e.target.value })} inputMode="decimal" disabled={!canEditPricing} aria-describedby={canEditPricing ? undefined : "pricing-locked"} className={`${inp} disabled:cursor-not-allowed disabled:bg-cream/60 disabled:text-muted`} /></label>
              <label className={lbl}>DPH %<input value={f.vatRate} onChange={(e) => setF({ ...f, vatRate: e.target.value })} inputMode="decimal" disabled={!canEditPricing} aria-describedby={canEditPricing ? undefined : "pricing-locked"} className={`${inp} disabled:cursor-not-allowed disabled:bg-cream/60 disabled:text-muted`} /></label>
            {!canEditPricing && <p id="pricing-locked" className="text-[12.5px] text-muted-3">Nákupnú cenu a DPH mení administrátor.</p>}
            </div>
          </div>
          <label className={lbl}>Popis
            <textarea value={f.descriptionLong} onChange={(e) => setF({ ...f, descriptionLong: e.target.value })} rows={4} className={`${inp} resize-y`} />
          </label>
          <div className="flex flex-wrap gap-5 border-t border-line pt-3.5">
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
              <input type="checkbox" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} className="h-4 w-4" style={{ accentColor: "#163f38" }} />
              Publikované <span className="text-muted-2">(viditeľné v katalógu)</span>
            </label>
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
              <input type="checkbox" checked={f.isSubsidized} onChange={(e) => setF({ ...f, isSubsidized: e.target.checked })} className="h-4 w-4" style={{ accentColor: "#163f38" }} />
              Cena na vyžiadanie
            </label>
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
              <input type="checkbox" checked={f.isStocked} onChange={(e) => setF({ ...f, isStocked: e.target.checked })} className="h-4 w-4" style={{ accentColor: "#163f38" }} aria-describedby="stocked-help" />
              Držíme skladom <span className="text-muted-2">(nie je to na objednávku)</span>
            </label>
          </div>
          {/* Čestné znenie: prepínač hovorí len o našom zámere držať tovar na sklade.
              Badge „Skladom" v katalógu rozhoduje isInStock() (lib/stock.ts) — ten navyše
              žiada kladný počet kusov a skladové dáta z Pohody nie staršie než 48 h. */}
          <p id="stocked-help" className="-mt-2 text-[12.5px] leading-relaxed text-muted-3">
            Znamená iba „tento tovar bežne držíme skladom“. Zákazník uvidí „Skladom“ len vtedy, keď z Pohody prídu čerstvé skladové dáta (do 48 h) a počet kusov je väčší než nula — inak sa položka správa ako na objednávku.
            {" "}
            <span className="text-muted-2">
              Aktuálne: {f.isStocked
                ? (product.stockFresh && product.stockCache != null && product.stockCache > 0
                    ? `zobrazuje sa ako skladom (${product.stockCache} ks, sync ${new Date(product.stockSyncedAt!).toLocaleDateString("sk")})`
                    : product.stockSyncedAt
                      ? `zobrazuje sa ako na objednávku — skladové dáta sú z ${new Date(product.stockSyncedAt).toLocaleDateString("sk")}`
                      : "zobrazuje sa ako na objednávku — z Pohody zatiaľ neprišli žiadne skladové dáta")
                : "zobrazuje sa ako na objednávku"}.
            </span>
          </p>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={pending} className="self-start rounded-[10px] bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
              {pending ? "Ukladám…" : "Uložiť zmeny"}
            </button>
            <LiveMessage message={pending ? "Ukladám…" : msg?.ok ? msg.text : null} />
            <LiveMessage message={msg && !msg.ok ? msg.text : null} tone="error" />
            {msg && <span className={`text-[13px] ${msg.ok ? "text-brand-2" : "text-[#9a3025]"}`}>{msg.text}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
