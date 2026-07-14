import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice } from "@/lib/pricing";
import { FavoriteButton } from "@/components/portal/favorite-button";
import { QuickAddButton } from "@/components/portal/quick-add-button";
import { ProductImg } from "@/components/product-img";

export const dynamic = "force-dynamic";
export const metadata = { title: "Obľúbené — Moonid portál", robots: { index: false, follow: false } };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

export default async function OblubenePage() {
  const user = await requireUser();
  if (!user.companyId) {
    return <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">Obľúbené sú dostupné pre firemné kontá.</div>;
  }
  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = tierCode
    ? Number((await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } }))?.discountPct ?? 0)
    : 0;

  const favs = await prisma.favorite.findMany({
    where: { companyId: user.companyId, product: { isPublished: true } },
    orderBy: { createdAt: "desc" },
    select: {
      product: {
        select: {
          id: true, slug: true, name: true, nameDisplay: true, unit: true,
          basePrice: true, vatRate: true, isSubsidized: true, isStocked: true, stockCache: true,
          category: { select: { name: true } },
          media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
          prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } },
        },
      },
    },
  });

  const items = favs.map((f) => {
    const p = f.product;
    const price = resolveUnitPrice({
      basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized,
      tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
      discountPct,
    });
    return {
      id: p.id, slug: p.slug ?? p.id, n: p.nameDisplay || p.name, i: p.media[0]?.storagePath ?? "",
      c: p.category?.name ?? "Ostatné", unit: p.unit,
      stocked: p.isStocked && p.stockCache != null && Number(p.stockCache) > 0, price,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">Obľúbené</h1>
        <p className="mt-1.5 text-[14.5px] text-muted">Produkty označené hviezdou — zdieľané pre celú vašu firmu.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <p className="text-[15px] font-medium text-ink">Zatiaľ žiadne obľúbené</p>
          <p className="mt-1 text-[13.5px] text-muted">Označte produkt hviezdou v <Link href="/katalog" className="font-semibold text-brand">katalógu</Link> a nájdete ho tu.</p>
        </div>
      ) : (
        <div className="grid gap-[clamp(14px,1.6vw,22px)]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(208px,1fr))" }}>
          {items.map((p) => (
            <div key={p.id} className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
              <FavoriteButton productId={p.id} initial={true} className="absolute right-2 top-2 z-10 bg-white/80 backdrop-blur-sm" />
              <Link prefetch={false} href={`/katalog/${p.slug}`} className="relative flex aspect-square items-center justify-center bg-[#fafbfa] p-5">
                <span className={`absolute left-2.5 top-2.5 z-10 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${p.stocked ? "bg-[#ecfdf3] text-[#14633f]" : "bg-[#fdf6e7] text-[#8a5a00]"}`}>{p.stocked ? "Skladom" : "Na objednávku"}</span>
                <ProductImg src={p.i} alt={p.n} sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 208px" iconSize={36} />
              </Link>
              <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-2 line-clamp-1">{p.c}</span>
                <Link prefetch={false} href={`/katalog/${p.slug}`} className="line-clamp-2 text-[14px] font-medium leading-snug text-ink transition hover:text-brand">{p.n}</Link>
                <div className="mt-auto pt-2">
                  {p.price.kind === "PRICE" ? (
                    <>
                      <div className="text-[17px] font-semibold text-ink">{eur(p.price.net)} <span className="text-[12px] font-normal text-muted-2">/ {p.unit}</span></div>
                      <div className="text-[11.5px] text-muted-2">bez DPH · s DPH {eur(p.price.gross)}</div>
                    </>
                  ) : (
                    <span className="text-[13.5px] font-semibold text-brand-2">Cena na vyžiadanie</span>
                  )}
                </div>
                {p.price.kind === "PRICE" && <div className="mt-2.5"><QuickAddButton productId={p.id} /></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
