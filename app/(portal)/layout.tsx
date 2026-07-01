import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCartCount } from "@/lib/cart";
import { PortalShell } from "@/components/portal/portal-shell";
import { ToastProvider } from "@/components/portal/toast";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Staff/admin nepatrí do zákazníckeho portálu (nemá firmu) → administrácia.
  if (user.role === "STAFF" || user.role === "ADMIN") redirect("/staff");
  const cartCount = user.companyId ? await getCartCount(user.companyId) : 0;
  return (
    <PortalShell
      companyName={user.company?.name ?? "Moonid"}
      email={user.email}
      tierCode={user.company?.priceTier?.code ?? null}
      cartCount={cartCount}
    >
      <ToastProvider>{children}</ToastProvider>
    </PortalShell>
  );
}
