import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUnitPrice } from "@/lib/pricing";
import { ProductDetail } from "./product-detail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produkt — Moonid portál", robots: { index: false, follow: false } };

const AXIS_LABEL: Record<string, string> = { size: "Veľkosť balenia", scent: "Vôňa", color: "Farba", pack: "Balenie" };

export default async function PortalProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = tierCode
    ? Number((await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } }))?.discountPct ?? 0)
    : 0;

  const product = await prisma.product.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true, name: true, nameDisplay: true, unit: true, brand: true, color: true, material: true, packSize: true,
      descriptionLong: true, attributes: true, sku: true,
      category: { select: { name: true } },
      variantGroupId: true, variantGroup: { select: { name: true, primaryAxis: true, descriptionLong: true } },
      basePrice: true, vatRate: true, isSubsidized: true, isStocked: true, stockCache: true,
      media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
      prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } },
    },
  });
  if (!product) notFound();

  const vSelect = {
    id: true, unit: true, variantLabel: true, variantSort: true,
    basePrice: true, vatRate: true, isSubsidized: true, isStocked: true, stockCache: true,
    media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
    prices: { where: { priceTierCode: tierCode ?? "__none__" }, take: 1, select: { unitPriceNet: true } },
  } as const;

  type Row = { id: string; unit: string; variantLabel: string | null; basePrice: unknown; vatRate: unknown; isSubsidized: boolean; isStocked: boolean; stockCache: unknown; media: { storagePath: string }[]; prices: { unitPriceNet: unknown }[] };

  const rows: Row[] | null = product.variantGroupId
    ? await prisma.product.findMany({ where: { variantGroupId: product.variantGroupId, isPublished: true }, orderBy: { variantSort: "asc" }, select: vSelect })
    : null;

  function toVariant(p: Row) {
    const price = resolveUnitPrice({
      basePriceNet: p.basePrice != null ? Number(p.basePrice) : null,
      vatRate: Number(p.vatRate), isSubsidized: p.isSubsidized,
      tierUnitNet: p.prices[0]?.unitPriceNet != null ? Number(p.prices[0].unitPriceNet) : null,
      discountPct,
    });
    return {
      id: p.id, label: p.variantLabel ?? p.unit, img: p.media[0]?.storagePath ?? "", unit: p.unit,
      net: price.kind === "PRICE" ? price.net : null, gross: price.kind === "PRICE" ? price.gross : null,
      stocked: p.isStocked && p.stockCache != null && Number(p.stockCache) > 0,
    };
  }

  const selfRow: Row = { id: product.id, unit: product.unit, variantLabel: null, basePrice: product.basePrice, vatRate: product.vatRate, isSubsidized: product.isSubsidized, isStocked: product.isStocked, stockCache: product.stockCache, media: product.media, prices: product.prices };
  const variants = rows && rows.length ? rows.map(toVariant) : [toVariant(selfRow)];

  // špecifikácie z atribútov + polí (bez interných kľúčov)
  const attrs = (product.attributes && typeof product.attributes === "object" ? product.attributes : {}) as Record<string, string>;
  const specs: { k: string; v: string }[] = [];
  if (product.brand) specs.push({ k: "Značka", v: product.brand });
  if (product.packSize && product.variantGroup?.primaryAxis !== "size") specs.push({ k: "Balenie", v: product.packSize });
  if (product.color) specs.push({ k: "Farba", v: product.color });
  if (product.material) specs.push({ k: "Materiál", v: product.material });
  if (attrs.paleta) specs.push({ k: "Paleta", v: String(attrs.paleta) });
  if (attrs.hmotnost) specs.push({ k: "Hmotnosť", v: String(attrs.hmotnost) });
  specs.push({ k: "Kód", v: product.sku });

  return (
    <ProductDetail
      title={product.variantGroup?.name || product.nameDisplay || product.name}
      category={product.category?.name ?? ""}
      brand={product.brand}
      description={product.variantGroup?.descriptionLong || product.descriptionLong || ""}
      specs={specs}
      variants={variants}
      defaultId={product.id}
      axisLabel={AXIS_LABEL[product.variantGroup?.primaryAxis ?? ""] ?? "Variant"}
      tierCode={tierCode}
    />
  );
}
