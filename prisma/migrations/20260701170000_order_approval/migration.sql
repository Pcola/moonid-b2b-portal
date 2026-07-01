-- Schvaľovanie objednávok: nový stav CAKA_SCHVALENIE + práva usera (objednať priamo / approver).

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CAKA_SCHVALENIE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approverId" TEXT,
ADD COLUMN     "canOrderDirectly" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "User_approverId_idx" ON "User"("approverId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
