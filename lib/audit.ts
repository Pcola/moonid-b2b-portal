import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/observability";

type AuditInput = {
  userId?: string | null;
  companyId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * Zapíše auditný záznam vrátane ip + userAgent z aktuálneho requestu.
 * Best-effort: NIKDY nezhodí volajúcu akciu (audit zlyhanie len zaloguje).
 * AuditLog je na DB úrovni append-only (trigger, database/audit-append-only.sql).
 */
export async function writeAudit(a: AuditInput): Promise<void> {
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
    const userAgent = (h.get("user-agent") ?? "").slice(0, 400) || null;
    await prisma.auditLog.create({
      data: {
        userId: a.userId ?? null,
        companyId: a.companyId ?? null,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId ?? null,
        meta: a.meta ? (a.meta as object) : undefined,
        ip,
        userAgent,
      },
    });
  } catch (e) {
    // Audit je bezpečnostne dôležitý — tiché zlyhanie musí byť viditeľné v Sentry.
    reportError("audit.write", e, { action: a.action, entity: a.entity, entityId: a.entityId ?? undefined });
  }
}
