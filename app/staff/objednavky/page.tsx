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
  const [orders, pendingApproval] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "CAKA_SCHVALENIE" } }, // neschválené objednávky staffu nepatria (do zoznamu)
      orderBy: { createdAt: "desc" },
      take: CAP,
      select: {
        id: true, number: true, status: true, total: true, createdAt: true,
        company: { select: { name: true, priceTier: { select: { code: true } } } },
        _count: { select: { items: true } },
      },
    }),
    // …ale zaseknuté schvaľovanie (approver na dovolenke) nesmie byť neviditeľné → počet upozorní
    prisma.order.count({ where: { status: "CAKA_SCHVALENIE" } }),
  ]);

  const items = orders.map((o) => ({
    id: o.id, number: o.number, status: o.status,
    customer: o.company.name, tier: o.company.priceTier?.code ?? "—",
    count: o._count.items, total: Number(o.total), date: o.createdAt.toISOString(),
  }));

  return (
    <>
      {pendingApproval > 0 && (
        <div className="mb-4 rounded-xl border border-[#e8d9b0] bg-[#fdf6e7] px-4 py-3 text-[13.5px] text-[#8a5a00]">
          Čaká na schválenie zákazníkom: <strong>{pendingApproval}</strong> — v zozname sa zobrazia až po schválení. Ak niektorá visí dlho, skontrolujte so zákazníkom jeho schvaľovateľa.
        </div>
      )}
      <StaffOrders items={items} initialQ={(q ?? "").slice(0, 120)} capped={orders.length >= CAP} cap={CAP} />
    </>
  );
}
