-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pohodaCancelRequested" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PohodaSyncJob" ADD COLUMN     "nextAttemptAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PohodaSyncJob_status_nextAttemptAt_idx" ON "PohodaSyncJob"("status", "nextAttemptAt");


-- partial unique: max 1 aktívny job (QUEUED/CLAIMED) na (orderId, kind) — proti duplicite pri dvojkliku
CREATE UNIQUE INDEX "PohodaSyncJob_active_uniq" ON "PohodaSyncJob"("orderId","kind") WHERE "status" IN ('QUEUED','CLAIMED');
