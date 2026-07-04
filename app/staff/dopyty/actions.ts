"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const ID = z.string().min(1).max(100);

/** Označí kontaktný dopyt ako vybavený, alebo ho vráti späť medzi nové. Len STAFF. */
export async function setInquiryHandled(id: string, handled: boolean): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(id).success) return { ok: false, error: "Neplatný vstup." };
  const inq = await prisma.inquiry.findUnique({ where: { id }, select: { id: true } });
  if (!inq) return { ok: false, error: "Dopyt neexistuje." };
  await prisma.inquiry.update({ where: { id }, data: { handledAt: handled ? new Date() : null } });
  await writeAudit({ userId: staff.id, action: handled ? "INQUIRY_HANDLED" : "INQUIRY_REOPEN", entity: "Inquiry", entityId: id });
  revalidatePath("/staff/dopyty");
  return { ok: true };
}
