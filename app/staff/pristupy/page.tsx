import Link from "next/link";
import type { Prisma, Role } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviteInternalUserForm, TeamAccessManager } from "./team-access-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Tím a prístupy", robots: { index: false, follow: false } };

const PAGE_SIZE = 30;

type Params = { q?: string; role?: string; status?: string; page?: string };

function queryString(input: { q: string; role: string; status: string; page?: number }): string {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.role) params.set("role", input.role);
  if (input.status) params.set("status", input.status);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export default async function TeamAccessPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 120);
  const role = params.role === "ADMIN" || params.role === "STAFF" ? params.role : "";
  const status = params.status === "active" || params.status === "inactive" ? params.status : "";
  const parsedPage = /^\d+$/.test(params.page ?? "") ? Number(params.page) : 1;
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const where: Prisma.UserWhereInput = {
    companyId: null,
    role: role ? (role as Role) : { in: ["STAFF", "ADMIN"] },
    ...(status === "active" ? { active: true } : status === "inactive" ? { active: false } : {}),
    ...(q ? {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [filteredTotal, activeAdmins, activeStaff, activeInternal, activeMfa, waitingForFirstLogin, inactiveInternal] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: "ADMIN", active: true, companyId: null } }),
    prisma.user.count({ where: { role: "STAFF", active: true, companyId: null } }),
    prisma.user.count({ where: { role: { in: ["STAFF", "ADMIN"] }, active: true, companyId: null } }),
    prisma.user.count({ where: { role: { in: ["STAFF", "ADMIN"] }, active: true, mfaEnabled: true, companyId: null } }),
    prisma.user.count({ where: { role: { in: ["STAFF", "ADMIN"] }, active: true, lastLoginAt: null, companyId: null } }),
    prisma.user.count({ where: { role: { in: ["STAFF", "ADMIN"] }, active: false, companyId: null } }),
  ]);

  const pages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const users = await prisma.user.findMany({
    where,
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }, { email: "asc" }],
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      mfaEnabled: true,
      companyId: true,
      authSyncPending: true,
      authDesiredActive: true,
      authManagedBan: true,
      authSyncedAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  const mfaCoverage = activeInternal === 0 ? 100 : Math.round((activeMfa / activeInternal) * 100);

  return (
    <div className="flex max-w-[1180px] flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[760px]">
          <h2 className="text-[22px] font-normal tracking-[-0.01em] text-ink">Tím a prístupy</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            Interné účty Moonid. Administrátor má všetky oprávnenia staffu a navyše správu prístupov,
            audit log a globálne obchodné nastavenia. Každý interný účet musí pri vstupe používať MFA.
          </p>
        </div>
        <Link href="/staff/audit" className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:border-brand/40">
          Otvoriť audit zmien
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Aktívni administrátori</div>
          <div className="mt-2 text-[28px] font-semibold tabular-nums text-ink">{activeAdmins}</div>
          <div className="mt-1 text-[12.5px] text-muted">Chránené pravidlom posledného admina</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Aktívny staff</div>
          <div className="mt-2 text-[28px] font-semibold tabular-nums text-ink">{activeStaff}</div>
          <div className="mt-1 text-[12.5px] text-muted">Bez admin-only nastavení</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">MFA evidované</div>
          <div className="mt-2 text-[28px] font-semibold tabular-nums text-ink">{mfaCoverage} %</div>
          <div className="mt-1 text-[12.5px] text-muted">{activeMfa} z {activeInternal} aktívnych účtov</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-2">Lifecycle</div>
          <div className="mt-2 flex items-baseline gap-2 text-ink">
            <span className="text-[28px] font-semibold tabular-nums">{waitingForFirstLogin}</span>
            <span className="text-[12.5px] text-muted">čaká</span>
            <span className="ml-1 text-[28px] font-semibold tabular-nums">{inactiveInternal}</span>
            <span className="text-[12.5px] text-muted">neaktívnych</span>
          </div>
        </div>
      </div>

      <InviteInternalUserForm />

      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <form method="get" className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto] md:items-end">
          <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted-3">
            Hľadať
            <input name="q" defaultValue={q} maxLength={120} placeholder="Meno alebo e-mail" className="min-h-11 rounded-[10px] border border-field bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand" />
          </label>
          <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted-3">
            Rola
            <select name="role" defaultValue={role} className="min-h-11 rounded-[10px] border border-field bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand">
              <option value="">Všetky roly</option>
              <option value="ADMIN">Administrátor</option>
              <option value="STAFF">Staff</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted-3">
            Stav
            <select name="status" defaultValue={status} className="min-h-11 rounded-[10px] border border-field bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand">
              <option value="">Všetky stavy</option>
              <option value="active">Aktívne</option>
              <option value="inactive">Neaktívne</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="min-h-11 rounded-[10px] bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-2">Filtrovať</button>
            {(q || role || status) && <Link href="/staff/pristupy" className="inline-flex min-h-11 items-center rounded-[10px] border border-line px-3 py-2 text-[13.5px] font-semibold text-muted transition hover:text-ink">Zrušiť</Link>}
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between gap-3 text-[13px] text-muted-2">
        <span>{filteredTotal} {filteredTotal === 1 ? "konto" : filteredTotal >= 2 && filteredTotal <= 4 ? "kontá" : "kont"}{(q || role || status) ? " vo filtri" : ""}</span>
        <span>Strana {page} z {pages}</span>
      </div>

      <TeamAccessManager
        currentUserId={admin.id}
        users={users.map((user) => ({
          ...user,
          role: user.role as "STAFF" | "ADMIN",
          authSyncedAt: user.authSyncedAt?.toISOString() ?? null,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
        }))}
      />

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {page > 1
            ? <Link href={`/staff/pristupy${queryString({ q, role, status, page: page - 1 })}`} className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-white px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand/40">‹ Predchádzajúca</Link>
            : <span className="inline-flex min-h-11 items-center rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-semibold text-muted-2 opacity-40">‹ Predchádzajúca</span>}
          {page < pages
            ? <Link href={`/staff/pristupy${queryString({ q, role, status, page: page + 1 })}`} className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-white px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-brand/40">Ďalšia ›</Link>
            : <span className="inline-flex min-h-11 items-center rounded-[10px] border border-line px-4 py-2 text-[13.5px] font-semibold text-muted-2 opacity-40">Ďalšia ›</span>}
        </div>
      )}

      <div className="rounded-xl border border-warning-line bg-[#fffaf0] px-4 py-3 text-[12.5px] leading-relaxed text-warning-ink-2">
        <strong>Bezpečnostná poznámka:</strong> účet sa nikdy nemaže. Deaktivácia ho okamžite zablokuje v portáli a zároveň zablokuje nové prihlásenia v Supabase Auth. Už vydaný token sa na každom serverovom requeste znovu kontroluje proti aktívnemu stavu a priama Data API vrstva je default-deny.
      </div>
    </div>
  );
}
