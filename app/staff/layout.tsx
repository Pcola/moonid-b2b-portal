import { after } from "next/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maybeRunRetention } from "@/lib/retention";
import { StaffShell } from "@/components/staff/staff-shell";

export const metadata = { robots: { index: false, follow: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  after(() => maybeRunRetention()); // retenčný purge (1× denne, best-effort) — po odoslaní odpovede
  const [newOrders, newRequests, newInquiries] = await Promise.all([
    prisma.order.count({ where: { status: "PRIJATA" } }),
    prisma.accessRequest.count({ where: { status: "PENDING" } }),
    prisma.inquiry.count({ where: { handledAt: null } }),
  ]);
  return (
    <StaffShell name={user.name ?? user.email} email={user.email} role={user.role} newOrders={newOrders} newRequests={newRequests} newInquiries={newInquiries}>
      {children}
    </StaffShell>
  );
}
