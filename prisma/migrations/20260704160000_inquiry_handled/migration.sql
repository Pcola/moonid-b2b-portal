-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN "handledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Inquiry_handledAt_idx" ON "Inquiry"("handledAt");
