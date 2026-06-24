"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

/** Po úspešnom (klientskom) prihlásení — zapíše lastLoginAt + audit LOGIN_SUCCESS. */
export async function recordLoginSuccess(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "LOGIN_SUCCESS", entity: "Auth", entityId: user.id });
}

/** Neúspešné prihlásenie — audit LOGIN_FAILURE (bez session). Pre detekciu brute-force. */
export async function recordLoginFailure(email: unknown): Promise<void> {
  const e = z.string().email().max(160).safeParse(email);
  await writeAudit({ action: "LOGIN_FAILURE", entity: "Auth", meta: { email: e.success ? e.data : "(neplatný)" } });
}

/** Odhlásenie — audit LOGOUT. */
export async function recordLogout(): Promise<void> {
  const user = await getCurrentUser();
  await writeAudit({ userId: user?.id ?? null, companyId: user?.companyId ?? null, action: "LOGOUT", entity: "Auth", entityId: user?.id ?? null });
}
