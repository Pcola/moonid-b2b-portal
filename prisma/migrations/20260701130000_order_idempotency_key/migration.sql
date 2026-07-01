-- Idempotencia odoslania objednávky (double-submit / retry / súbeh): unikátny kľúč na Order.
-- 2. submit s rovnakým kľúčom koliduje na unique indexe → aplikácia vráti pôvodnú objednávku,
-- takže nikdy nevzniknú dve identické objednávky (hlavne pri jednoklikovom „Opakovať").
-- Nullable → existujúce objednávky aj košíková cesta (createOrder, delete-first guard) ostávajú
-- nedotknuté; Postgres unique index povoľuje viac NULL hodnôt.
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
