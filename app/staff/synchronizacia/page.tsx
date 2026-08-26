import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { canManageSyncJobs } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSystemReadiness } from "@/lib/readiness";
import { SyncJobsList, type SyncJobItem } from "./sync-jobs-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Synchronizácia", robots: { index: false, follow: false } };

const PAGE = 50;
const STATUSES = ["FAILED", "QUEUED", "CLAIMED", "PUSHED"] as const;
type JobStatus = (typeof STATUSES)[number];
const TAB_LABEL: Record<JobStatus, string> = {
  FAILED: "Zlyhané",
  QUEUED: "Vo fronte",
  CLAIMED: "Prevzaté",
  PUSHED: "Odoslané",
};

function dt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("sk") + " " + d.toLocaleTimeString("sk", { hour: "2-digit", minute: "2-digit" });
}

export default async function SyncJobsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const staff = await requireStaff();
  // Čítanie je prevádzková vec (staff potrebuje vedieť, či objednávka dorazila do Pohody);
  // zápis do fronty je ADMIN — server si to vynucuje sám v retrySyncJob (requireAdmin).
  const canRetry = canManageSyncJobs(staff.role);
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as JobStatus) : null;

  const where: Prisma.PohodaSyncJobWhereInput = status ? { status } : {};
  const [rows, total, byStatus, readiness] = await Promise.all([
    prisma.pohodaSyncJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE,
      select: {
        id: true, kind: true, status: true, attempts: true, lastError: true,
        nextAttemptAt: true, claimedBy: true, createdAt: true, updatedAt: true, orderId: true,
        order: { select: { number: true, status: true } },
      },
    }),
    prisma.pohodaSyncJob.count({ where }),
    prisma.pohodaSyncJob.groupBy({ by: ["status"], _count: { status: true } }),
    getSystemReadiness(),
  ]);

  const counts = new Map(byStatus.map((r) => [r.status as string, r._count.status]));
  const items: SyncJobItem[] = rows.map((r) => ({
    id: r.id, kind: r.kind, status: r.status, attempts: r.attempts, lastError: r.lastError,
    nextAttemptAt: r.nextAttemptAt?.toISOString() ?? null, claimedBy: r.claimedBy,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    orderId: r.orderId, orderNumber: r.order.number, orderStatus: r.order.status,
  }));

  const tab = "rounded-[10px] px-3.5 py-2 text-[13.5px] font-semibold transition";

  return (
    <div className="flex max-w-[1000px] flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-normal tracking-[-0.01em] text-ink">Synchronizácia s Pohodou</h2>
        <p className="mt-1 text-[14px] text-muted">Fronta úloh, ktorými portál posiela objednávky do Pohody a sťahuje faktúry. Zlyhaná úloha znamená, že doklad v Pohode nevznikol — treba ju vyriešiť ručne alebo vrátiť do fronty.</p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5"><span className="text-[13px] text-muted">Zlyhané úlohy</span><span className="text-[28px] font-normal text-[#A23B2A]">{readiness.failedJobs}</span></div>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5"><span className="text-[13px] text-muted">Zaseknuté úlohy</span><span className="text-[28px] font-normal text-[#9A6B0E]">{readiness.stalledJobs}</span></div>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5"><span className="text-[13px] text-muted">Posledný signál agenta</span><span className="text-[15px] font-medium text-ink">{dt(readiness.lastHeartbeatAt)}</span></div>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5"><span className="text-[13px] text-muted">Posledný sklad</span><span className="text-[15px] font-medium text-ink">{dt(readiness.lastStockSyncAt)}</span></div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/staff/synchronizacia" className={`${tab} ${!status ? "bg-brand text-white" : "border border-line text-muted hover:text-ink"}`}>Všetky</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/staff/synchronizacia?status=${s}`} className={`${tab} ${status === s ? "bg-brand text-white" : "border border-line text-muted hover:text-ink"}`}>
            {TAB_LABEL[s]}<span className={`ml-1.5 ${status === s ? "text-mint" : "text-brand"}`}>{counts.get(s) ?? 0}</span>
          </Link>
        ))}
      </div>

      <SyncJobsList items={items} canRetry={canRetry} />

      {total > rows.length && <p className="text-center text-[12.5px] text-muted-2">Zobrazených najnovších {rows.length} z {total} úloh.</p>}
    </div>
  );
}
