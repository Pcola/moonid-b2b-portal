// CI gate (SECURITY_AUDIT M-3b): každá public tabuľka musí mať zapnuté RLS.
// Beží v `npm test` proti (CI: efemérnej) DB po `prisma migrate deploy`. Ak niekto pridá
// novú tabuľku bez RLS, tento test padne — pridaj do jej migrácie
// `ALTER TABLE "X" ENABLE ROW LEVEL SECURITY;`. (_prisma_migrations je interná tabuľka Prisma.)
import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("RLS gate", () => {
  it("žiadna public tabuľka (okrem _prisma_migrations) nemá RLS vypnuté", async () => {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND rowsecurity = false
        AND tablename <> '_prisma_migrations'
      ORDER BY tablename`;
    const offenders = rows.map((r) => r.tablename);
    expect(
      offenders,
      `Tabuľky bez RLS — doplň 'ALTER TABLE "<t>" ENABLE ROW LEVEL SECURITY;' do migrácie: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
