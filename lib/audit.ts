import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/observability";

export type AuditInput = {
  userId?: string | null;
  companyId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
};

export type AuditRequestContext = { ip: string | null; userAgent: string | null };

/** Request metadata sa načíta pred otvorením DB transakcie. */
export async function auditRequestContext(): Promise<AuditRequestContext> {
  const h = await headers();
  return {
    ip: (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null,
    userAgent: (h.get("user-agent") ?? "").slice(0, 400) || null,
  };
}

function auditData(a: AuditInput, ctx: AuditRequestContext): Prisma.AuditLogUncheckedCreateInput {
  return {
    userId: a.userId ?? null,
    companyId: a.companyId ?? null,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId ?? null,
    meta: a.meta ? (a.meta as Prisma.InputJsonObject) : undefined,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  };
}

/**
 * Povinný audit pre kritickú doménovú mutáciu. Chybu NEPOTLAČÍ: volajúci ho vloží do
 * rovnakej transakcie ako business zmenu, takže bez auditu sa zmena rollbackne.
 */
export async function writeAuditRequired(
  tx: Prisma.TransactionClient,
  a: AuditInput,
  ctx: AuditRequestContext,
): Promise<void> {
  await tx.auditLog.create({ data: auditData(a, ctx) });
}

/**
 * Zapíše auditný záznam vrátane ip + userAgent z aktuálneho requestu.
 * Best-effort: NIKDY nezhodí volajúcu akciu (audit zlyhanie len zaloguje).
 * AuditLog je na DB úrovni append-only (migrácia 20260820150000_security_objects).
 */
export async function writeAudit(a: AuditInput): Promise<void> {
  try {
    const ctx = await auditRequestContext();
    await prisma.auditLog.create({ data: auditData(a, ctx) });
  } catch (e) {
    // Audit je bezpečnostne dôležitý — tiché zlyhanie musí byť viditeľné v Sentry.
    reportError("audit.write", e, { action: a.action, entity: a.entity, entityId: a.entityId ?? undefined });
  }
}
