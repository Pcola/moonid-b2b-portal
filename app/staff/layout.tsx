import { after } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maybeRunRetention } from "@/lib/retention";
import { StaffShell } from "@/components/staff/staff-shell";
import { getSystemReadiness } from "@/lib/readiness";

export const metadata = { robots: { index: false, follow: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  after(() => maybeRunRetention()); // retenčný purge (1× denne, best-effort) — po odoslaní odpovede
  const [newOrders, newRequests, newInquiries, readiness] = await Promise.all([
    prisma.order.count({ where: { status: "PRIJATA" } }),
    prisma.accessRequest.count({ where: { status: "PENDING" } }),
    prisma.inquiry.count({ where: { handledAt: null } }),
    getSystemReadiness(),
  ]);
  return (
    <StaffShell name={user.name ?? user.email} email={user.email} role={user.role} newOrders={newOrders} newRequests={newRequests} newInquiries={newInquiries}>
      {!readiness.ok && (
        <div role="alert" className="mb-5 rounded-xl border border-[#e6b8ae] bg-[#fff3f0] px-4 py-3 text-[13.5px] text-[#872f24]">
          <div className="font-semibold">Prevádzkový incident — integrácia Pohoda nie je pripravená</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{readiness.issues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul>
        </div>
      )}
      {children}
    </StaffShell>
  );
}
