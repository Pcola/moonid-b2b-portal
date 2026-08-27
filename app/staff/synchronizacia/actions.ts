"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { auditRequestContext, writeAuditRequired } from "@/lib/audit";

const ID = z.string().min(1).max(100);

/** Vráti zlyhanú synchronizačnú úlohu späť do fronty (FAILED → QUEUED). Len ADMIN —
 *  je to zápis do fronty voči Pohode, teda tá istá právomoc ako ostatné systémové zásahy.
 *  `updateMany` s podmienkou `status: "FAILED"` je zámerné: ak úlohu medzitým prevzal agent,
 *  neprepíšeme mu ju — count === 0 vráti zrozumiteľnú hlášku namiesto tichej kolízie.
 *  `attempts` sa nenuluje (je to história pokusov); backoff riadi `nextAttemptAt`, ten čistíme,
 *  aby si agent úlohu vzal pri najbližšom cykle. */
export async function retrySyncJob(id: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireAdmin();
  const parsed = ID.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Neplatný vstup." };

  const auditCtx = await auditRequestContext();
  const result = await prisma.$transaction(async (tx) => {
    const job = await tx.pohodaSyncJob.findUnique({
      where: { id: parsed.data },
      select: { id: true, kind: true, status: true, attempts: true, orderId: true },
    });
    if (!job) return { ok: false, error: "Úloha neexistuje." } as const;
    if (job.status !== "FAILED") return { ok: false, error: "Opakovať sa dá iba úloha v stave FAILED." } as const;

    const res = await tx.pohodaSyncJob.updateMany({
      where: { id: parsed.data, status: "FAILED" },
      data: { status: "QUEUED", nextAttemptAt: null, claimedBy: null, claimedAt: null },
    });
    if (res.count === 0) return { ok: false, error: "Úlohu medzitým prevzal agent. Obnovte stránku." } as const;

    await writeAuditRequired(tx, {
      userId: staff.id,
      action: "SYNC_JOB_RETRY",
      entity: "PohodaSyncJob",
      entityId: job.id,
      meta: { kind: job.kind, orderId: job.orderId, attempts: job.attempts },
    }, auditCtx);
    return { ok: true } as const;
  });
  if (!result.ok) return result;

  revalidatePath("/staff/synchronizacia");
  return { ok: true };
}
