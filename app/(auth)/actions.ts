"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** App-layer brzda proti brute-force na login (doplnok k vstavaným limitom Supabase Auth).
 *  Limituje pokusy o prihlásenie na IP; po prekročení vráti ok:false. Volá sa z login
 *  formulára PRED signIn. Limit je NAT-veľkorysý (kancelária za jednou IP nemá problém). */
export async function loginGate(): Promise<{ ok: boolean }> {
  const ip = clientIp(await headers());
  const rl = await rateLimit(`login:${ip}`, { limit: 30, windowSec: 600 });
  return { ok: rl.ok };
}

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
