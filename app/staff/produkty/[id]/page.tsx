import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductEditForm } from "./product-edit-form";
import { TierPricesEditor } from "./tier-prices-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Úprava produktu", robots: { index: false, follow: false } };

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const [product, cats, tiers] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true, sku: true, name: true, nameDisplay: true, origin: true, unit: true, brand: true,
        basePrice: true, vatRate: true, descriptionLong: true, isPublished: true, isSubsidized: true,
        categoryId: true, subcategoryId: true, slug: true,
        media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
        prices: { select: { priceTierCode: true, unitPriceNet: true } },
      },
    }),
    prisma.category.findMany({ select: { id: true, name: true, parentId: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.priceTier.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true, discountPct: true } }),
  ]);
  if (!product) notFound();

  const tierItems = tiers.map((t) => ({ code: t.code, name: t.name, discountPct: Number(t.discountPct) }));
  const priceInitial: Record<string, number> = Object.fromEntries(
    product.prices.map((p) => [p.priceTierCode, Number(p.unitPriceNet)]),
  );

  const data = {
    id: product.id, sku: product.sku, name: product.name, origin: product.origin,
    nameDisplay: product.nameDisplay ?? "", categoryId: product.categoryId ?? "", subcategoryId: product.subcategoryId ?? "", unit: product.unit,
    brand: product.brand ?? "", basePrice: product.basePrice != null ? Number(product.basePrice) : null,
    vatRate: Number(product.vatRate), descriptionLong: product.descriptionLong ?? "",
    isPublished: product.isPublished, isSubsidized: product.isSubsidized,
    image: product.media[0]?.storagePath ?? "", slug: product.slug ?? null,
  };

  return (
    <div className="flex max-w-[880px] flex-col gap-5">
      <Link href="/staff/produkty" className="text-[13.5px] font-medium text-muted transition hover:text-ink">← Produkty</Link>
      <ProductEditForm product={data} cats={cats} />
      <TierPricesEditor
        productId={product.id}
        basePriceNet={data.basePrice}
        vatRate={data.vatRate}
        isSubsidized={data.isSubsidized}
        tiers={tierItems}
        initial={priceInitial}
      />
    </div>
  );
}
