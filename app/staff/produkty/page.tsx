import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ProductsList } from "./products-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Produkty", robots: { index: false, follow: false } };

const PAGE = 30;
type SP = { q?: string; status?: string; cat?: string; page?: string };

export default async function StaffProduktyPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 120);
  const status = sp.status === "pub" || sp.status === "hid" || sp.status === "req" ? sp.status : "";
  const cat = (sp.cat ?? "").slice(0, 100);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ProductWhereInput = {};
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" } },
    { nameDisplay: { contains: q, mode: "insensitive" } },
    { sku: { contains: q, mode: "insensitive" } },
  ];
  if (status === "pub") where.isPublished = true;
  else if (status === "hid") where.isPublished = false;
  else if (status === "req") where.isSubsidized = true;
  if (cat) where.categoryId = cat;

  const [rows, total, cats, cPub, cHid, cReq] = await Promise.all([
    prisma.product.findMany({
      where, orderBy: [{ isPublished: "desc" }, { name: "asc" }], take: PAGE, skip: (page - 1) * PAGE,
      select: {
        id: true, sku: true, name: true, nameDisplay: true, unit: true, basePrice: true,
        isPublished: true, isSubsidized: true,
        category: { select: { name: true } },
        media: { where: { isPrimary: true }, take: 1, select: { storagePath: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.count({ where: { isPublished: true } }),
    prisma.product.count({ where: { isPublished: false } }),
    prisma.product.count({ where: { isSubsidized: true } }),
  ]);

  const items = rows.map((p) => ({
    id: p.id, sku: p.sku, name: p.nameDisplay || p.name, unit: p.unit,
    basePrice: p.basePrice != null ? Number(p.basePrice) : null,
    isPublished: p.isPublished, isSubsidized: p.isSubsidized,
    category: p.category?.name ?? null, image: p.media[0]?.storagePath ?? "",
  }));

  return (
    <ProductsList
      items={items} total={total} page={page} pageSize={PAGE}
      cats={cats} counts={{ pub: cPub, hid: cHid, req: cReq }}
      active={{ q, status, cat }}
    />
  );
}
