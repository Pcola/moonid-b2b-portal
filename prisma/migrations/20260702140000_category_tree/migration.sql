-- Strom kategórií: Category.parentId (self-relation) + Product.subcategoryId (2. úroveň)
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" TEXT;
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "subcategoryId" TEXT;
-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
-- CreateIndex
CREATE INDEX "Product_subcategoryId_idx" ON "Product"("subcategoryId");
-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
