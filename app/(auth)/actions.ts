"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { rateLimit, peekCount, clientIp } from "@/lib/rate-limit";

// per-účet (e-mail) lockout: po N zlyhaniach v okne sa účet dočasne uzamkne (self-healing).
// Bráni cielenému credential-stuffingu, ktorý per-IP limit obíde rotáciou IP.
const LOCK_THRESHOLD = 10;
const LOCK_WINDOW = 900; // 15 min

/** App-layer brzda pred prihlásením: per-IP limit + per-účet lockout (peek, neinkrementuje).
 *  Volá sa PRED signIn. `locked` = konkrétny účet je dočasne uzamknutý pre priveľa zlyhaní. */
export async function loginGate(email?: string): Promise<{ ok: boolean; locked?: boolean }> {
  const ip = clientIp(await headers());
  const rl = await rateLimit(`login:${ip}`, { limit: 30, windowSec: 600 });
  if (!rl.ok) return { ok: false };
  const em = String(email ?? "").trim().toLowerCase().slice(0, 160);
  if (em) {
    const fails = await peekCount(`login-fail:${em}`, LOCK_WINDOW);
    if (fails >= LOCK_THRESHOLD) return { ok: false, locked: true };
  }
  return { ok: true };
}

/** Brzda proti zneužitiu resetu hesla (spam do schránky / enumerácia e-mailov). Limituje
 *  per-IP (distribuovane) aj per-email (cielene). Volá sa PRED resetPasswordForEmail; pri
 *  prekročení sa reset neodošle, ale UI ukáže rovnakú hlášku (žiadny info-leak). */
export async function resetGate(email: string): Promise<{ ok: boolean }> {
  const ip = clientIp(await headers());
  const em = String(email ?? "").trim().toLowerCase().slice(0, 160);
  const byIp = await rateLimit(`reset-ip:${ip}`, { limit: 10, windowSec: 3600 });     // 10/h/IP
  const byEmail = em ? await rateLimit(`reset-email:${em}`, { limit: 3, windowSec: 3600 }) : { ok: true }; // 3/h/email
  return { ok: byIp.ok && byEmail.ok };
}

/** Po úspešnom (klientskom) prihlásení — zapíše lastLoginAt + audit LOGIN_SUCCESS.
 *  Vynuluje aj počítadlo zlyhaní účtu (úspech zmaže rozbehnutý lockout). */
export async function recordLoginSuccess(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
  await prisma.rateLimit.deleteMany({ where: { key: `login-fail:${user.email.toLowerCase()}` } }).catch(() => {});
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "LOGIN_SUCCESS", entity: "Auth", entityId: user.id });
}

/** Neúspešné prihlásenie — inkrementuje per-účet počítadlo (podklad lockoutu) + audit.
 *  IP-guard bráni zaplaveniu (forge-DoS na cudzí účet z jednej IP); audit len prvých pár
 *  zlyhaní v okne (bráni zaplneniu append-only logu — SECURITY_AUDIT audit-spam). */
export async function recordLoginFailure(email: unknown): Promise<void> {
  const ip = clientIp(await headers());
  const ipGuard = await rateLimit(`login-fail-ip:${ip}`, { limit: 30, windowSec: 600 });
  if (!ipGuard.ok) return; // z jednej IP nezapočítavaj záplavu zlyhaní
  const e = z.string().email().max(160).safeParse(email);
  const em = e.success ? e.data.toLowerCase() : null;
  const fc = em ? await rateLimit(`login-fail:${em}`, { limit: LOCK_THRESHOLD, windowSec: LOCK_WINDOW }) : { count: 0 };
  if (fc.count <= 15) {
    await writeAudit({ action: "LOGIN_FAILURE", entity: "Auth", meta: { email: em ?? "(neplatný)", count: fc.count } });
  }
}

/** Odhlásenie — audit LOGOUT. */
export async function recordLogout(): Promise<void> {
  const user = await getCurrentUser();
  await writeAudit({ userId: user?.id ?? null, companyId: user?.companyId ?? null, action: "LOGOUT", entity: "Auth", entityId: user?.id ?? null });
}
