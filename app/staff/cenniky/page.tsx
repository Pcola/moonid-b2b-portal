import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    select: { id: true, code: true, name: true, discountPct: true, _count: { select: { companies: true } } },
  });

  return (
    <div className="flex max-w-[1240px] flex-col gap-6">
      <div className="flex items-start gap-3 rounded-xl border border-[#f0e2c4] bg-[#fdf7e9] px-4 py-3 text-[13.5px] text-[#7a5a12]">
        <svg className="mt-0.5 flex-none" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
        <span>Zľavové percentá sú zatiaľ <strong>dočasné</strong> (odhad). Po napojení na cenové hladiny v Pohode sa nahradia reálnymi cenami. Úprava úrovní príde v ďalšej fáze.</span>
      </div>

      <p className="max-w-[640px] text-[15px] leading-relaxed text-muted">Cenové úrovne určujú zľavu z maloobchodnej ceny pre skupiny zákazníkov. Každému zákazníkovi je priradená jedna úroveň.</p>

      <div className="grid gap-[clamp(16px,2vw,22px)]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
        {tiers.map((t) => (
          <div key={t.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Úroveň {t.code}</span>
                <h3 className="text-[22px] font-normal text-ink">{t.name}</h3>
              </div>
              <span className="text-[30px] font-normal leading-none text-brand">−{Number(t.discountPct).toFixed(0)} %</span>
            </div>
            <p className="text-[14px] leading-relaxed text-muted">{DESC[t.code] ?? "Cenová úroveň pre vybraných zákazníkov."}</p>
            <div className="mt-auto border-t border-line pt-3.5 text-[13.5px] text-muted">{t._count.companies} {t._count.companies === 1 ? "zákazník" : t._count.companies >= 2 && t._count.companies <= 4 ? "zákazníci" : "zákazníkov"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
