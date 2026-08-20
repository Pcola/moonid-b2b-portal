import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GdprSection } from "./gdpr-section";
import { AddressManager } from "./address-manager";
import { AccountCard } from "./account-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nastavenia — Moonid portál", robots: { index: false, follow: false } };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-[180px] flex-none text-[13px] text-muted-2">{label}</span>
      <span className="text-[14.5px] text-ink">{value || "—"}</span>
    </div>
  );
}

export default async function NastaveniaPage() {
  const user = await requireUser();
  const isAdmin = user.role === "CUSTOMER_ADMIN";
  const company = user.companyId
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { name: true, ico: true, dic: true, icDph: true, city: true, address: true, zip: true, splatDays: true, priceTier: { select: { code: true, name: true } } },
      })
    : null;
  // správu adries načítavame LEN pre správcu firmy — bežný člen ju nevidí (členov spravuje /pouzivatelia)
  const locations = isAdmin && user.companyId
    ? await prisma.deliveryLocation.findMany({ where: { companyId: user.companyId }, orderBy: [{ isDefault: "desc" }, { label: "asc" }], select: { id: true, label: true, street: true, zip: true, city: true, isDefault: true } })
    : [];
  const approver = !isAdmin && !user.canOrderDirectly && user.approverId
    ? await prisma.user.findUnique({ where: { id: user.approverId }, select: { name: true, email: true } })
    : null;

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      {/* osobné konto (meno + zmena hesla) — pre každého používateľa */}
      <AccountCard name={user.name} email={user.email} />

      {isAdmin ? (
        <>
          {/* firemné údaje (len správca firmy) */}
          <section className="rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-6 py-4"><h2 className="text-[18px] font-normal text-ink">Firemné údaje</h2></div>
            <div className="px-6 py-2">
              <Row label="Názov firmy" value={company?.name} />
              <Row label="IČO" value={company?.ico} />
              <Row label="DIČ" value={company?.dic} />
              <Row label="IČ DPH" value={company?.icDph} />
              <Row label="Cenová úroveň" value={company?.priceTier ? `${company.priceTier.code} — ${company.priceTier.name}` : "—"} />
              <Row label="Splatnosť faktúr" value={company ? `${company.splatDays} dní` : "—"} />
            </div>
            <div className="border-t border-line px-6 py-3.5 text-[12.5px] text-muted-2">
              Názov, IČO alebo DIČ treba zmeniť? Napíšte nám na <a href="mailto:obchod@moonid.sk" className="font-medium text-brand hover:text-brand-2">obchod@moonid.sk</a>.
            </div>
          </section>

          {company && <AddressManager isAdmin={isAdmin} billing={{ street: company.address ?? null, zip: company.zip ?? null, city: company.city ?? null }} locations={locations} />}
        </>
      ) : (
        /* bežný člen — vidí len svoje zaradenie, nie roster/financie/adresy */
        <section className="rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-6 py-4"><h2 className="text-[18px] font-normal text-ink">Vaše zaradenie</h2></div>
          <div className="px-6 py-2">
            <Row label="Firma" value={company?.name} />
            <Row label="Rola" value="Používateľ" />
            <Row label="Objednávanie" value={user.canOrderDirectly ? "Objednávate priamo" : (approver ? `Vaše objednávky schvaľuje ${approver.name ?? approver.email}` : "Vaše objednávky vyžadujú schválenie")} />
          </div>
          <div className="border-t border-line px-6 py-3.5 text-[12.5px] text-muted-2">
            Zmenu údajov firmy alebo vašich práv rieši správca vašej firmy.
          </div>
        </section>
      )}

      <GdprSection isCompanyAdmin={isAdmin} />
    </div>
  );
}
