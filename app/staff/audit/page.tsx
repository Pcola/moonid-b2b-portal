import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditFilters } from "./audit-filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Audit log", robots: { index: false, follow: false } };

const PAGE = 50;

function dt(d: Date) {
  return d.toLocaleDateString("sk") + " " + d.toLocaleTimeString("sk", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; q?: string; page?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const action = (sp.action ?? "").slice(0, 60);
  const q = (sp.q ?? "").trim().slice(0, 120);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (q) {
    where.OR = [
      { entityId: { contains: q, mode: "insensitive" } },
      { ip: { contains: q } },
      { companyId: { contains: q } },
      { entity: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [rows, total, actionsAgg] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      select: {
        id: true, action: true, entity: true, entityId: true, ip: true, meta: true, companyId: true, createdAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { action: true }, orderBy: { action: "asc" } }),
  ]);

  const actions = actionsAgg.map((a) => a.action);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (action) u.set("action", action);
    if (q) u.set("q", q);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="flex max-w-[1160px] flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-normal tracking-[-0.01em] text-ink">Audit log</h1>
        <p className="mt-1 text-[14px] text-muted">Append-only záznam bezpečnostných a prevádzkových udalostí — prihlásenia, zmeny práv, objednávky, GDPR prístupy. Zápis je na úrovni DB nemazateľný.</p>
      </div>

      <AuditFilters actions={actions} active={{ action, q }} />

      <div className="text-[13px] text-muted-2">{total} {total === 1 ? "záznam" : total >= 2 && total <= 4 ? "záznamy" : "záznamov"}{(action || q) ? " (filtrované)" : ""}</div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center text-muted">Žiadne záznamy pre tento filter.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-cream/60 text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-4 py-2.5 font-semibold">Čas</th>
                <th className="px-4 py-2.5 font-semibold">Akcia</th>
                <th className="px-4 py-2.5 font-semibold">Entita</th>
                <th className="px-4 py-2.5 font-semibold">Kto</th>
                <th className="px-4 py-2.5 font-semibold">IP</th>
                <th className="px-4 py-2.5 font-semibold">Detaily</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const metaStr = r.meta != null ? JSON.stringify(r.meta) : "";
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-3">{dt(r.createdAt)}</td>
                    <td className="px-4 py-2.5"><span className="rounded bg-mintbg px-2 py-0.5 font-mono text-[11.5px] font-semibold text-brand-2">{r.action}</span></td>
                    <td className="px-4 py-2.5 text-muted-3">{r.entity}{r.entityId && <span className="ml-1 font-mono text-[11px] text-muted-2">{r.entityId.slice(0, 10)}</span>}</td>
                    <td className="px-4 py-2.5 text-ink">{r.user?.email ?? <span className="text-muted-2">—</span>}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11.5px] text-muted-2">{r.ip ?? "—"}</td>
                    <td className="max-w-[280px] px-4 py-2.5">
                      {metaStr ? <code className="line-clamp-2 block break-all text-[11.5px] text-muted-3" title={metaStr}>{metaStr}</code> : <span className="text-muted-2">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {page > 1
            ? <Link href={`/staff/audit${qs(page - 1)}`} className="rounded-[10px] border border-line bg-white px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand/40">‹ Novšie</Link>
            : <span className="rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-semibold text-muted-2 opacity-40">‹ Novšie</span>}
          <span className="text-[13.5px] text-muted">Strana <span className="font-semibold text-ink">{page}</span> z {pages}</span>
          {page < pages
            ? <Link href={`/staff/audit${qs(page + 1)}`} className="rounded-[10px] border border-line bg-white px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand/40">Staršie ›</Link>
            : <span className="rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-semibold text-muted-2 opacity-40">Staršie ›</span>}
        </div>
      )}
    </div>
  );
}
