import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { PairingList } from "./pairing-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Manuálne párovanie", robots: { index: false, follow: false } };

const PAGE = 40;

export default async function ParovaniePage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; page?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const filter: "unmatched" | "all" = sp.filter === "all" ? "all" : "unmatched";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ProductSourceWhereInput = { sourceType: "HUMED_FEED" };
  if (filter === "unmatched") { where.matchStatus = "SUGGESTED"; where.productId = null; }
  if (q) where.title = { contains: q, mode: "insensitive" };

  const [items, total, unmatchedCount] = await Promise.all([
    prisma.productSource.findMany({
      where,
      select: {
        id: true, externalSku: true, title: true, imageUrl: true, brand: true, productId: true, matchStatus: true,
        product: { select: { sku: true, name: true, nameDisplay: true } },
      },
      orderBy: { title: "asc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    prisma.productSource.count({ where }),
    prisma.productSource.count({ where: { sourceType: "HUMED_FEED", matchStatus: "SUGGESTED", productId: null } }),
  ]);

  return <PairingList items={items} total={total} unmatchedCount={unmatchedCount} page={page} pageSize={PAGE} filter={filter} q={q} />;
}
