import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Faktúry — Moonid portál", robots: { index: false, follow: false } };

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Čaká na úhradu", cls: "bg-[#fdf6e7] text-[#8a5a00]" },
  PAID: { label: "Uhradená", cls: "bg-[#ecfdf3] text-[#14633f]" },
  OVERDUE: { label: "Po splatnosti", cls: "bg-[#fdeceb] text-[#9a3025]" },
  CANCELLED: { label: "Stornovaná", cls: "bg-[#f3f0ee] text-[#86827a]" },
};

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`text-[28px] font-normal leading-none ${accent ?? "text-ink"}`}>{value}</span>
    </div>
  );
}

export default async function FakturyPage() {
  const user = await requireUser();
  if (!user.companyId) {
    return <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted">Faktúry sú dostupné pre firemné kontá.</div>;
  }
  const year = new Date().getFullYear();
  const invoices = await prisma.invoice.findMany({
    where: { companyId: user.companyId },
    orderBy: { issuedAt: "desc" },
    select: { id: true, pohodaNumber: true, status: true, issuedAt: true, dueAt: true, total: true, pdfStoragePath: true, order: { select: { number: true } } },
  });

  const num = (d: typeof invoices) => d.reduce((s, i) => s + Number(i.total), 0);
  const overdue = num(invoices.filter((i) => i.status === "OVERDUE"));
  const pending = num(invoices.filter((i) => i.status === "PENDING"));
  const paidYear = num(invoices.filter((i) => i.status === "PAID" && i.issuedAt.getFullYear() === year));

  return (
    <div className="flex max-w-[1080px] flex-col gap-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <SummaryCard label="Po splatnosti" value={eur(overdue)} accent={overdue > 0 ? "text-[#9a3025]" : "text-ink"} />
        <SummaryCard label="Čaká na úhradu" value={eur(pending)} />
        <SummaryCard label={`Uhradené (${year})`} value={eur(paidYear)} />
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mintbg text-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l3 3v15l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 9h6M9 13h4" /></svg>
          </div>
          <p className="text-[15px] font-medium text-ink">Zatiaľ žiadne faktúry</p>
          <p className="mt-1 text-[13.5px] text-muted">Faktúry sa zobrazia po vystavení a synchronizácii z účtovného systému.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b border-line bg-cream/60 px-[22px] py-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted-2">
            <span>Faktúra</span><span>Objednávka</span><span>Splatnosť</span><span>Stav</span><span className="text-right">Suma</span>
          </div>
          {invoices.map((f) => {
            const s = STATUS[f.status] ?? { label: f.status, cls: "bg-cream text-muted" };
            return (
              <div key={f.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-line px-[22px] py-4 last:border-0">
                <span className="font-mono text-[13.5px] font-semibold text-ink">{f.pohodaNumber}</span>
                <span className="text-[13.5px] text-muted-2">{f.order?.number ?? "—"}</span>
                <span className="text-[13.5px] text-muted-2">{new Date(f.dueAt).toLocaleDateString("sk")}</span>
                <span className={`justify-self-start rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${s.cls}`}>{s.label}</span>
                <span className="flex items-center justify-end gap-3">
                  <span className="text-[14.5px] font-semibold tabular-nums text-ink">{eur(Number(f.total))}</span>
                  {f.pdfStoragePath && (
                    <a href={f.pdfStoragePath} title="Stiahnuť PDF" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-brand transition hover:border-mint-2">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
                    </a>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
