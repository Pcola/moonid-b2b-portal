-- 1 košík na firmu: zavedenie @@unique([companyId]) na Cart.
-- Duplicitné košíky vznikali súbehom (getOrCreateCart = findFirst+create bez unique) — presne
-- trieda bugu, ktorú tento constraint rieši (dva taby/dvojklik → 2 košíky → tichá strata položiek).
-- Pred unikátnym indexom preto zlúčime prípadné duplikáty do jedného „keeper" košíka na firmu.

-- 1) Zlúč položky všetkých duplikátov do keeper košíka (najnovšie updatovaný na firmu).
--    Agregujeme qty per (keeper, produkt) → pri konflikte sa množstvá spočítajú, inak sa vloží nová položka.
WITH keeper AS (
  SELECT DISTINCT ON ("companyId") "companyId", "id" AS keep_id
  FROM "Cart" ORDER BY "companyId", "updatedAt" DESC, "id"
),
dup_items AS (
  SELECT k.keep_id, ci."productId", SUM(ci."qty") AS qty
  FROM "Cart" c
  JOIN keeper k ON k."companyId" = c."companyId" AND c."id" <> k.keep_id
  JOIN "CartItem" ci ON ci."cartId" = c."id"
  GROUP BY k.keep_id, ci."productId"
)
INSERT INTO "CartItem" ("id", "cartId", "productId", "qty")
SELECT gen_random_uuid()::text, di.keep_id, di."productId", di.qty
FROM dup_items di
ON CONFLICT ("cartId", "productId") DO UPDATE SET "qty" = "CartItem"."qty" + EXCLUDED."qty";

-- 2) Zmaž duplicitné košíky (ich pôvodné položky cascade-delete; obsah je už v keeperi).
WITH keeper AS (
  SELECT DISTINCT ON ("companyId") "companyId", "id" AS keep_id
  FROM "Cart" ORDER BY "companyId", "updatedAt" DESC, "id"
)
DELETE FROM "Cart" c
USING keeper k
WHERE k."companyId" = c."companyId" AND c."id" <> k.keep_id;

-- 3) Zaveď unikátnosť: 1 košík na firmu (nahrádza pôvodný ne-unikátny index).
DROP INDEX IF EXISTS "Cart_companyId_idx";
CREATE UNIQUE INDEX "Cart_companyId_key" ON "Cart"("companyId");
