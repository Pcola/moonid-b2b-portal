import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DopytyList } from "./dopyty-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Dopyty", robots: { index: false, follow: false } };

const CAP = 300;

export default async function DopytyPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireStaff();
  const { view } = await searchParams;
  const showAll = view === "all";

  const [rows, newCount] = await Promise.all([
    prisma.inquiry.findMany({
      where: showAll ? {} : { handledAt: null },
      orderBy: { createdAt: "desc" },
      take: CAP,
      select: {
        id: true, name: true, company: true, email: true, phone: true, location: true,
        type: true, segment: true, message: true, emailSent: true, handledAt: true, createdAt: true,
      },
    }),
    prisma.inquiry.count({ where: { handledAt: null } }),
  ]);

  const items = rows.map((r) => ({
    id: r.id, name: r.name, company: r.company, email: r.email,
    phone: r.phone, location: r.location, type: r.type, segment: r.segment,
    message: r.message ?? "", emailSent: r.emailSent, handled: r.handledAt != null,
    createdAt: r.createdAt.toISOString(),
  }));

  return <DopytyList items={items} showAll={showAll} newCount={newCount} capped={rows.length >= CAP} cap={CAP} />;
}
