import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { canManageCommerceSettings } from "@/lib/permissions";
import { MethodsEditor } from "./methods-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Doprava a platba — Moonid", robots: { index: false, follow: false } };

export default async function DopravaPlatbaPage() {
  const user = await requireStaff();
  const [delivery, payment] = await Promise.all([
    prisma.deliveryMethod.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.paymentMethod.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const editable = canManageCommerceSettings(user.role);
  return (
    <div className="flex max-w-[1080px] flex-col gap-5">
      {!editable && (
        <div role="status" className="rounded-xl border border-line bg-white px-4 py-3 text-[13.5px] text-muted">
          Máte prístup iba na čítanie. Dopravu, platby a súvisiace poplatky môže meniť len administrátor.
        </div>
      )}
      <MethodsEditor
      editable={editable}
      delivery={delivery.map((d) => ({
        code: d.code, label: d.label, description: d.description, enabled: d.enabled,
        requiresAddress: d.requiresAddress, flatFee: Number(d.flatFee),
        freeThreshold: d.freeThreshold != null ? Number(d.freeThreshold) : null,
      }))}
      payment={payment.map((p) => ({ code: p.code, label: p.label, description: p.description, enabled: p.enabled, surcharge: Number(p.surcharge) }))}
      />
    </div>
  );
}
