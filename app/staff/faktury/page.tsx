import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
const STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  PENDING: { label: "Čaká", fg: "#9A6B0E", bg: "#FBF1DC" },
  PAID: { label: "Uhradená", fg: "#1E5249", bg: "#EAF1EE" },
  OVERDUE: { label: "Po splatnosti", fg: "#A23B2A", bg: "#F7E4E0" },
  CANCELLED: { label: "Stornovaná", fg: "#86827A", bg: "#F1F3F2" },
};

export default async function StaffInvoices() {
  await requireStaff();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const invoices = await prisma.invoice.findMany({
    orderBy: { issuedAt: "desc" }, take: 100,
    select: { id: true, pohodaNumber: true, status: true, issuedAt: true, dueAt: true, total: true, company: { select: { name: true } } },
  });

  const sum = (arr: typeof invoices) => arr.reduce((s, i) => s + Number(i.total), 0);
  const issuedMonth = sum(invoices.filter((i) => i.issuedAt >= monthStart));
  const pending = sum(invoices.filter((i) => i.status === "PENDING"));
  const overdue = sum(invoices.filter((i) => i.status === "OVERDUE"));

  return (
    <div className="flex max-w-[1240px] flex-col gap-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5"><span className="text-[13px] text-muted">Vystavené (tento mes.)</span><span className="text-[28px] font-normal text-ink">{eur(issuedMonth)}</span></div>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5"><span className="text-[13px] text-muted">Čaká na úhradu</span><span className="text-[28px] font-normal text-[#9A6B0E]">{eur(pending)}</span></div>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5"><span className="text-[13px] text-muted">Po splatnosti</span><span className="text-[28px] font-normal text-[#A23B2A]">{eur(overdue)}</span></div>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mintbg text-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l3 3v15l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 9h6M9 13h4" /></svg>
          </div>
          <p className="text-[15px] font-medium text-ink">Zatiaľ žiadne faktúry</p>
          <p className="mt-1 text-[13.5px] text-muted">Faktúry sa zobrazia po napojení synchronizácie s Pohodou (ďalšia fáza).</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[auto_1.4fr_1fr_1fr_auto_auto] gap-4 border-b border-line bg-cream/60 px-[22px] py-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted-2">
            <span>Faktúra</span><span>Zákazník</span><span>Dátum</span><span>Splatnosť</span><span>Stav</span><span className="text-right">Suma</span>
          </div>
          {invoices.map((f) => {
            const s = STATUS[f.status] ?? { label: f.status, fg: "#86827A", bg: "#F1F3F2" };
            return (
              <div key={f.id} className="grid grid-cols-[auto_1.4fr_1fr_1fr_auto_auto] items-center gap-4 border-b border-line px-[22px] py-4 last:border-0">
                <span className="font-mono text-[13.5px] font-semibold text-ink">{f.pohodaNumber}</span>
                <span className="truncate text-[14px] text-ink">{f.company.name}</span>
                <span className="text-[13.5px] text-muted">{new Date(f.issuedAt).toLocaleDateString("sk")}</span>
                <span className="text-[13.5px] text-muted">{new Date(f.dueAt).toLocaleDateString("sk")}</span>
                <span className="justify-self-start rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: s.fg, background: s.bg }}>{s.label}</span>
                <span className="text-right text-[15px] font-semibold tabular-nums text-ink">{eur(Number(f.total))}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
