-- Covering indexy na foreign keys (Supabase perf advisor: unindexed_foreign_keys).
-- Zrýchľuje joiny + FK cascade delete pri raste. Tabuľky už existujú → RLS netreba meniť.

-- CreateIndex
CREATE INDEX "Cart_createdById_idx" ON "Cart"("createdById");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE INDEX "CompanyDispenser_dispenserModelId_idx" ON "CompanyDispenser"("dispenserModelId");

-- CreateIndex
CREATE INDEX "CompanyDispenser_deliveryLocationId_idx" ON "CompanyDispenser"("deliveryLocationId");

-- CreateIndex
CREATE INDEX "Favorite_productId_idx" ON "Favorite"("productId");

-- CreateIndex
CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");

-- CreateIndex
CREATE INDEX "Order_deliveryLocationId_idx" ON "Order"("deliveryLocationId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_changedById_idx" ON "OrderStatusEvent"("changedById");

-- CreateIndex
CREATE INDEX "RepeatDraftItem_productId_idx" ON "RepeatDraftItem"("productId");
