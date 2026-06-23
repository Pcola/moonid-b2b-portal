import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Objednávky — Moonid portál", robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; cls: string }> = {
  PRIJATA: { label: "Prijatá", cls: "bg-[#fdf6e7] text-[#8a5a00]" },
  POTVRDENA: { label: "Potvrdená", cls: "bg-[#eef2ff] text-[#3730a3]" },
  PRIPRAVUJE: { label: "Pripravuje sa", cls: "bg-[#eef2ff] text-[#3730a3]" },
  NA_CESTE: { label: "Na ceste", cls: "bg-[#eef2ff] text-[#3730a3]" },
  DORUCENA: { label: "Doručená", cls: "bg-[#ecfdf3] text-[#14633f]" },
  STORNO: { label: "Stornovaná", cls: "bg-[#f3f0ee] text-[#86827a]" },
};
function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

export default async function ObjednavkyPage() {
  const user = await requireUser();
  if (!user.companyId) {
    return <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">Objednávky sú dostupné pre firemné kontá.</div>;
  }
  const orders = await prisma.order.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, number: true, status: true, total: true, hasBackorder: true, createdAt: true, _count: { select: { items: true } } },
  });

  return (
    <div className="max-w-[980px]">
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">
          Zatiaľ žiadne objednávky. <Link href="/katalog" className="font-semibold text-brand hover:text-brand-2">Prejsť do katalógu</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {orders.map((o, i) => {
            const s = STATUS[o.status] ?? { label: o.status, cls: "bg-cream text-muted" };
            return (
              <Link key={o.id} href={`/objednavky/${o.id}`} className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 transition hover:bg-cream ${i ? "border-t border-line" : ""}`}>
                <span className="font-mono text-[14px] font-semibold text-ink">{o.number}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${s.cls}`}>{s.label}</span>
                {o.hasBackorder && <span className="rounded-full bg-[#fdf6e7] px-2.5 py-0.5 text-[11px] font-medium text-[#8a5a00]">čiastočne na objednávku</span>}
                <span className="text-[13px] text-muted-2">{new Date(o.createdAt).toLocaleDateString("sk")} · {o._count.items} pol.</span>
                <span className="ml-auto text-[14.5px] font-semibold tabular-nums text-ink">{eur(Number(o.total))}</span>
                <svg className="text-muted-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
