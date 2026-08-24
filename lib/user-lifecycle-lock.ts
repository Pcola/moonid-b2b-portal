import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const USER_LIFECYCLE_LOCK = "moonid:user-identity-lifecycle:v1";

/**
 * Jeden transakčný zámok pre interné aj zákaznícke identity. Zabraňuje, aby onboarding
 * zákazníka súbežne obišiel kontrolu internej roly alebo posledného admina.
 */
export async function withUserLifecycleLock<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ locked: number }>>`
      SELECT 1 AS "locked"
      FROM (SELECT pg_advisory_xact_lock(hashtextextended(${USER_LIFECYCLE_LOCK}, 0))) AS lock_call
    `;
    return fn(tx);
  }, { maxWait: 5_000, timeout: 20_000 });
}
