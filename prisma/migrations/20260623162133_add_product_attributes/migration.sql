-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "material" TEXT,
ADD COLUMN     "packSize" TEXT,
ADD COLUMN     "scent" TEXT;

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "Product"("brand");

-- CreateIndex
CREATE INDEX "Product_systemCode_idx" ON "Product"("systemCode");

-- CreateIndex
CREATE INDEX "Product_scent_idx" ON "Product"("scent");

-- CreateIndex
CREATE INDEX "Product_color_idx" ON "Product"("color");

-- CreateIndex
CREATE INDEX "Product_packSize_idx" ON "Product"("packSize");

-- CreateIndex
CREATE INDEX "Product_attributes_idx" ON "Product" USING GIN ("attributes");

