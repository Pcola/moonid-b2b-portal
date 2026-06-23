import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffShell } from "@/components/staff/staff-shell";

export const metadata = { robots: { index: false, follow: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [newOrders, newRequests] = await Promise.all([
    prisma.order.count({ where: { status: "PRIJATA" } }),
    prisma.accessRequest.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <StaffShell name={user.name ?? user.email} email={user.email} role={user.role} newOrders={newOrders} newRequests={newRequests}>
      {children}
    </StaffShell>
  );
}
