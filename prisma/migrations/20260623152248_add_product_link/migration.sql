-- CreateEnum
CREATE TYPE "ProductOrigin" AS ENUM ('POHODA', 'FEED', 'MANUAL');

-- CreateEnum
CREATE TYPE "LinkMethod" AS ENUM ('PREMAPPED', 'SUGGESTED_CONFIRMED', 'MANUAL', 'NEW_CARD_REQUESTED');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('ACTIVE', 'PENDING_CARD', 'BROKEN');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "pohodaSkuSnapshot" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "origin" "ProductOrigin" NOT NULL DEFAULT 'POHODA';

-- CreateTable
CREATE TABLE "ProductLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pohodaSku" TEXT NOT NULL,
    "pohodaCardId" INTEGER,
    "linkMethod" "LinkMethod" NOT NULL,
    "linkStatus" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "confidence" DECIMAL(5,4),
    "sourceId" TEXT,
    "matchedBy" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductLink_productId_key" ON "ProductLink"("productId");

-- CreateIndex
CREATE INDEX "ProductLink_pohodaSku_idx" ON "ProductLink"("pohodaSku");

-- CreateIndex
CREATE INDEX "ProductLink_linkStatus_idx" ON "ProductLink"("linkStatus");

-- CreateIndex
CREATE INDEX "ProductLink_pohodaCardId_idx" ON "ProductLink"("pohodaCardId");

-- CreateIndex
CREATE INDEX "Product_origin_idx" ON "Product"("origin");

-- AddForeignKey
ALTER TABLE "ProductLink" ADD CONSTRAINT "ProductLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

