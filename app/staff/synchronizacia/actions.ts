"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

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

  const job = await prisma.pohodaSyncJob.findUnique({
    where: { id: parsed.data },
    select: { id: true, kind: true, status: true, attempts: true, orderId: true },
  });
  if (!job) return { ok: false, error: "Úloha neexistuje." };
  if (job.status !== "FAILED") return { ok: false, error: "Opakovať sa dá iba úloha v stave FAILED." };

  const res = await prisma.pohodaSyncJob.updateMany({
    where: { id: parsed.data, status: "FAILED" },
    data: { status: "QUEUED", nextAttemptAt: null, claimedBy: null, claimedAt: null },
  });
  if (res.count === 0) return { ok: false, error: "Úlohu medzitým prevzal agent. Obnovte stránku." };

  await writeAudit({
    userId: staff.id,
    action: "SYNC_JOB_RETRY",
    entity: "PohodaSyncJob",
    entityId: job.id,
    meta: { kind: job.kind, orderId: job.orderId, attempts: job.attempts },
  });
  revalidatePath("/staff/synchronizacia");
  return { ok: true };
}
