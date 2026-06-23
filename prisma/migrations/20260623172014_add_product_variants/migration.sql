-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isDefaultVariant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variantAxis" TEXT,
ADD COLUMN     "variantGroupId" TEXT,
ADD COLUMN     "variantLabel" TEXT,
ADD COLUMN     "variantSort" INTEGER;

-- CreateTable
CREATE TABLE "ProductGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "categoryId" TEXT,
    "primaryAxis" TEXT,
    "descriptionLong" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductGroup_slug_key" ON "ProductGroup"("slug");

-- CreateIndex
CREATE INDEX "ProductGroup_categoryId_idx" ON "ProductGroup"("categoryId");

-- CreateIndex
CREATE INDEX "Product_variantGroupId_idx" ON "Product"("variantGroupId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_variantGroupId_fkey" FOREIGN KEY ("variantGroupId") REFERENCES "ProductGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

