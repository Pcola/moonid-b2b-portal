import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffOrders } from "./orders-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Objednávky", robots: { index: false, follow: false } };

// Ohraničenie dotazu — pri raste nad CAP príde na rad server-side stránkovanie/filtrovanie.
// Pre súčasný objem (malý veľkoobchod) pokrýva mesiace; cap je viditeľný (nie tiché orezanie).
const CAP = 500;

export default async function StaffOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  await requireStaff();
  const orders = await prisma.order.findMany({
    where: { status: { not: "CAKA_SCHVALENIE" } }, // neschválené objednávky staffu nepatria
    orderBy: { createdAt: "desc" },
    take: CAP,
    select: {
      id: true, number: true, status: true, total: true, createdAt: true,
      company: { select: { name: true, priceTier: { select: { code: true } } } },
      _count: { select: { items: true } },
    },
  });

  const items = orders.map((o) => ({
    id: o.id, number: o.number, status: o.status,
    customer: o.company.name, tier: o.company.priceTier?.code ?? "—",
    count: o._count.items, total: Number(o.total), date: o.createdAt.toISOString(),
  }));

  return <StaffOrders items={items} initialQ={(q ?? "").slice(0, 120)} capped={orders.length >= CAP} cap={CAP} />;
}
