import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffOrders } from "./orders-list";

export const dynamic = "force-dynamic";

export default async function StaffOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  await requireStaff();
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
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

  return <StaffOrders items={items} initialQ={q ?? ""} />;
}
