import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyEditForm } from "./company-edit-form";
import { LocationsManager } from "./locations-manager";
import { AddUserForm } from "./add-user-form";

export const dynamic = "force-dynamic";

function eur(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }
const ROLE: Record<string, string> = { CUSTOMER_ADMIN: "Správca firmy", CUSTOMER_USER: "Používateľ", STAFF: "Staff", ADMIN: "Admin" };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();

  const [company, tiers, recentOrders] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      select: {
        id: true, name: true, ico: true, dic: true, icDph: true, address: true, city: true,
        splatDays: true, active: true, createdAt: true,
        priceTier: { select: { code: true } },
        users: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true } },
        locations: { orderBy: [{ isDefault: "desc" }, { label: "asc" }], select: { id: true, label: true, street: true, city: true, zip: true, isDefault: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.priceTier.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true, discountPct: true } }),
    prisma.order.findMany({ where: { companyId: id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, number: true, status: true, total: true, createdAt: true } }),
  ]);
  if (!company) notFound();

  const tierList = tiers.map((t) => ({ code: t.code, name: t.name, discountPct: Number(t.discountPct) }));
  const editable = {
    id: company.id, name: company.name, ico: company.ico, dic: company.dic, icDph: company.icDph,
    address: company.address, city: company.city, priceTierCode: company.priceTier?.code ?? tiers[0]?.code ?? "",
    splatDays: company.splatDays, active: company.active,
  };

  return (
    <div className="flex max-w-[1120px] flex-col gap-6">
      <Link href="/staff/zakaznici" className="inline-flex w-fit items-center gap-2 text-[14px] font-medium text-muted transition hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>Späť na zákazníkov
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[clamp(22px,3vw,30px)] font-semibold text-ink">{company.name}</h1>
        {company.active
          ? <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[12px] font-semibold text-[#14633f]">Aktívna</span>
          : <span className="rounded-full bg-[#fdecea] px-2.5 py-1 text-[12px] font-semibold text-[#9a3025]">Neaktívna</span>}
        <span className="text-[13px] text-muted-2">IČO {company.ico} · {company._count.orders} objednávok · zákazník od {new Date(company.createdAt).toLocaleDateString("sk")}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <CompanyEditForm company={editable} tiers={tierList} />
          <LocationsManager companyId={company.id} locations={company.locations} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-[22px]">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Používatelia ({company.users.length})</h3>
            {company.users.length === 0 ? <p className="text-[13.5px] text-muted-2">Žiadni používatelia.</p> : company.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b border-line pb-2.5 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-ink">{u.name ?? u.email}</div>
                  <div className="truncate text-[12.5px] text-muted-2">{u.email}</div>
                </div>
                <span className="ml-2 whitespace-nowrap text-[12px] text-muted-2">{ROLE[u.role] ?? u.role}{!u.active && " · neakt."}</span>
              </div>
            ))}
            <AddUserForm companyId={company.id} />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-[22px]">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-2">Posledné objednávky</h3>
            {recentOrders.length === 0 ? <p className="text-[13.5px] text-muted-2">Žiadne objednávky.</p> : recentOrders.map((o) => (
              <Link key={o.id} href={`/staff/objednavky/${o.id}`} prefetch={false} className="flex items-center justify-between border-b border-line pb-2.5 text-[13.5px] last:border-0 last:pb-0 hover:text-brand">
                <span className="font-mono font-medium text-ink">{o.number}</span>
                <span className="text-muted-2">{new Date(o.createdAt).toLocaleDateString("sk")}</span>
                <span className="font-semibold tabular-nums text-ink">{eur(Number(o.total))}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
