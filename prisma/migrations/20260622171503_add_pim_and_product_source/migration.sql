-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('HUMED_FEED', 'MANUAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('CODE', 'NAME', 'MANUAL');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "descriptionLong" TEXT,
ADD COLUMN     "descriptionShort" TEXT,
ADD COLUMN     "ean" TEXT,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenInPohodaAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "ProductSource" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "externalId" TEXT,
    "externalSku" TEXT,
    "title" TEXT,
    "imageUrl" TEXT,
    "ean" TEXT,
    "descriptionLong" TEXT,
    "brand" TEXT,
    "purchasePrice" DECIMAL(12,4),
    "sourceUrl" TEXT,
    "raw" JSONB,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "matchScore" DOUBLE PRECISION,
    "matchMethod" "MatchMethod",
    "matchedBy" TEXT,
    "matchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSource_productId_idx" ON "ProductSource"("productId");

-- CreateIndex
CREATE INDEX "ProductSource_matchStatus_idx" ON "ProductSource"("matchStatus");

-- CreateIndex
CREATE INDEX "ProductSource_externalSku_idx" ON "ProductSource"("externalSku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSource_sourceType_externalId_key" ON "ProductSource"("sourceType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_isPublished_idx" ON "Product"("isPublished");

-- AddForeignKey
ALTER TABLE "ProductSource" ADD CONSTRAINT "ProductSource_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

