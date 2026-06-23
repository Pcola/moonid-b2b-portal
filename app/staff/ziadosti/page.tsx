import { prisma } from "@/lib/prisma";
import { RequestList } from "./request-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Žiadosti o prístup", robots: { index: false } };

export default async function ZiadostiPage() {
  const [requests, tiers] = await Promise.all([
    prisma.accessRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { id: true, ico: true, companyName: true, contactName: true, email: true, phone: true, note: true, createdAt: true },
    }),
    prisma.priceTier.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true, discountPct: true } }),
  ]);

  return (
    <div className="max-w-[900px]">
      <p className="text-[15px] text-muted">Schváľte žiadosť — priradí sa cenová úroveň, založí/napojí firma a vytvorí sa pozvánka.</p>
      <div className="mt-6">
        <RequestList
          requests={requests.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
          tiers={tiers.map((t) => ({ code: t.code, name: t.name, discountPct: String(t.discountPct) }))}
        />
      </div>
    </div>
  );
}
