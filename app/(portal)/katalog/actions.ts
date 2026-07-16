"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const ID = z.string().min(1).max(100);

/** Cenový dopyt na produkt „na vyžiadanie" priamo z portálu. Zapíše sa do Inquiry
 *  (rovnaká fronta ako verejné dopyty → /staff/dopyty), takže lead nezmizne aj keď e-mail
 *  (Resend) nefunguje. Predvyplní meno/firmu/e-mail z prihláseného účtu + SKU produktu. */
export async function requestQuote(productId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!ID.safeParse(productId).success) return { ok: false, error: "Neplatný vstup." };

  const p = await prisma.product.findFirst({
    where: { id: productId, isPublished: true },
    select: { sku: true, name: true, nameDisplay: true },
  });
  if (!p) return { ok: false, error: "Produkt nie je dostupný." };
  const productName = p.nameDisplay || p.name;

  const inq = await prisma.inquiry.create({
    data: {
      name: user.name ?? user.email,
      company: user.company?.name ?? "—",
      email: user.email,
      phone: null,
      type: "Cenový dopyt (portál)",
      segment: null,
      message: `Žiadosť o cenovú ponuku na produkt „${productName}" (SKU ${p.sku}).`,
    },
    select: { id: true },
  });

  await writeAudit({ userId: user.id, companyId: user.companyId ?? undefined, action: "QUOTE_REQUEST", entity: "Inquiry", entityId: inq.id, meta: { sku: p.sku, productName } });
  return { ok: true };
}
