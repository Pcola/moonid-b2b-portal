import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberManager } from "../nastavenia/member-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Používatelia — Moonid portál", robots: { index: false, follow: false } };

export default async function PouzivateliaPage() {
  const user = await requireUser();
  // len správca firmy spravuje používateľov
  if (user.role !== "CUSTOMER_ADMIN" || !user.companyId) redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, canOrderDirectly: true, approverId: true },
  });

  return (
    <div className="flex max-w-[820px] flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-normal tracking-[-0.01em] text-ink">Používatelia firmy</h1>
        <p className="mt-1 text-[14.5px] text-muted">Pozvite kolegov, nastavte im právo objednávať priamo alebo cez schválenie a určte schvaľovateľa. Deaktivovaný člen sa nemôže prihlásiť.</p>
      </div>
      <MemberManager isAdmin members={users} currentUserId={user.id} />
    </div>
  );
}
