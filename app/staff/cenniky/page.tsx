import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TierEditor } from "./tier-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Cenníky", robots: { index: false, follow: false } };

const DESC: Record<string, string> = {
  A: "Základná zľava pre menšie prevádzky a inštitúcie.",
  B1: "Pravidelní zákazníci so stredným objemom odberu.",
  B2: "Hotely a wellness s veľkým a stabilným odberom.",
  B3: "Najväčší gastro odberatelia s rámcovou zmluvou.",
};

export default async function StaffPricing() {
  await requireStaff();
  const tiers = await prisma.priceTier.findMany({
    orderBy: { code: "asc" },
    select: { code: true, name: true, discountPct: true, _count: { select: { companies: true } } },
  });

  const items = tiers.map((t) => ({ code: t.code, name: t.name, discountPct: Number(t.discountPct), companies: t._count.companies }));

  return (
    <div className="flex max-w-[1240px] flex-col gap-6">
      <div className="flex items-start gap-3 rounded-xl border border-[#f0e2c4] bg-[#fdf7e9] px-4 py-3 text-[13.5px] text-[#7a5a12]">
        <svg className="mt-0.5 flex-none" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
        <span>Zľava sa uplatňuje na maloobchodnú cenu z Pohody (<code className="font-mono">basePrice × (1 − zľava)</code>). <strong>Zmena úrovne prepočíta ceny všetkých zákazníkov na tejto úrovni.</strong> Nastav reálne dohodnuté percentá.</span>
      </div>

      <p className="max-w-[640px] text-[15px] leading-relaxed text-muted">Cenové úrovne určujú zľavu pre skupiny zákazníkov. Každému zákazníkovi je priradená jedna úroveň (v detaile firmy).</p>

      <TierEditor tiers={items} descriptions={DESC} />
    </div>
  );
}
