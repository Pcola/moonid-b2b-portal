import "server-only";
import { prisma } from "@/lib/prisma";

export type ReadinessIssue = { code: string; message: string };
export type SystemReadiness = {
  ok: boolean;
  issues: ReadinessIssue[];
  lastHeartbeatAt: Date | null;
  lastStockSyncAt: Date | null;
  failedJobs: number;
  stalledJobs: number;
};

const hours = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export async function getSystemReadiness(now = new Date()): Promise<SystemReadiness> {
  const heartbeatMaxHours = hours("SYNC_HEARTBEAT_MAX_HOURS", 12);
  const stockMaxHours = hours("STOCK_SYNC_MAX_HOURS", 48);
  const jobMaxHours = hours("SYNC_JOB_MAX_HOURS", 2);
  const stalledBefore = new Date(now.getTime() - jobMaxHours * 3_600_000);

  const [sync, failedJobs, stalledJobs] = await Promise.all([
    prisma.syncState.findUnique({ where: { id: "singleton" }, select: { lastHeartbeatAt: true, lastStockSyncAt: true } }),
    prisma.pohodaSyncJob.count({ where: { status: "FAILED" } }),
    prisma.pohodaSyncJob.count({
      where: {
        OR: [
          { status: "QUEUED", createdAt: { lt: stalledBefore } },
          { status: "CLAIMED", claimedAt: { lt: stalledBefore } },
        ],
      },
    }),
  ]);

  const issues: ReadinessIssue[] = [];
  const ageHours = (value: Date | null | undefined) => value ? (now.getTime() - value.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;
  if (ageHours(sync?.lastHeartbeatAt) > heartbeatMaxHours) issues.push({ code: "pohoda_heartbeat_stale", message: `Pohoda agent sa neozval viac než ${heartbeatMaxHours} h.` });
  if (ageHours(sync?.lastStockSyncAt) > stockMaxHours) issues.push({ code: "stock_sync_stale", message: `Skladové dáta sú staršie než ${stockMaxHours} h.` });
  if (failedJobs > 0) issues.push({ code: "sync_jobs_failed", message: `${failedJobs} synchronizačných úloh je v stave FAILED.` });
  if (stalledJobs > 0) issues.push({ code: "sync_jobs_stalled", message: `${stalledJobs} synchronizačných úloh čaká dlhšie než ${jobMaxHours} h.` });

  return {
    ok: issues.length === 0,
    issues,
    lastHeartbeatAt: sync?.lastHeartbeatAt ?? null,
    lastStockSyncAt: sync?.lastStockSyncAt ?? null,
    failedJobs,
    stalledJobs,
  };
}
