-- Reprezentativne demo data pre moonid-b2b-staging.
-- Idempotentne: opakovane spustenie aktualizuje iba zaznamy v TEST/STG namespace.
-- Bezpecnost: skript odmietne databazu bez staging runtime roly.

BEGIN;

SELECT pg_advisory_xact_lock(hashtext('moonid-staging-demo-seed-v1'));

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moonid_app_staging') THEN
    RAISE EXCEPTION 'STAGING ONLY: rola moonid_app_staging v tejto databaze neexistuje.';
  END IF;
END
$guard$;

WITH data(id, code, name, discount_pct) AS (
  VALUES
    ('stg_tier_a',  'A',  'Štandard',   8.00::numeric),
    ('stg_tier_b1', 'B1', 'Partner',   12.00::numeric),
    ('stg_tier_b2', 'B2', 'Hotel',     18.00::numeric),
    ('stg_tier_b3', 'B3', 'Gastro VIP',22.00::numeric)
)
INSERT INTO "PriceTier" ("id", "code", "name", "discountPct", "updatedAt")
SELECT id, code, name, discount_pct, now() FROM data
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "discountPct" = EXCLUDED."discountPct",
  "updatedAt" = now();

WITH data(id, name, slug, sort_order) AS (
  VALUES
    ('stg_cat_paper',       'Hygienický papier',       'hygienicky-papier',       0),
    ('stg_cat_soap',        'Mydlá a peny',            'mydla-a-peny',            1),
    ('stg_cat_disinfection','Dezinfekcia',             'dezinfekcia',             2),
    ('stg_cat_cleaning',    'Čistiace prostriedky',    'cistiace-prostriedky',    3),
    ('stg_cat_dispensers',  'Dávkovače a zásobníky',   'davkovace-a-zasobniky',   4),
    ('stg_cat_housekeeping','Upratovanie',             'upratovanie',             5),
    ('stg_cat_bags',        'Vrecia a obaly',          'vrecia-a-obaly',          6),
    ('stg_cat_accessories', 'Príslušenstvo',           'prislusenstvo',           7),
    ('stg_cat_office',      'Kancelárske potreby',     'kancelarske-potreby',     8),
    ('stg_cat_hotel',       'Hotelová kozmetika',      'hotelova-kozmetika',      9),
    ('stg_cat_gastro',      'Gastro program',          'gastro-program',         10)
)
INSERT INTO "Category" ("id", "name", "slug", "sortOrder")
SELECT id, name, slug, sort_order FROM data
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "sortOrder" = EXCLUDED."sortOrder";

WITH data(
  id, sku, name, name_display, category_slug, brand, subcategory, pack_size,
  unit, base_price, stock_qty, is_stocked, lead_days, product_kind,
  is_subsidized, shelf_status, slug, short_description, attributes
) AS (
  VALUES
    ('stg_prod_pap_001','TEST-PAP-001','Papierové utierky ZZ 2-vrstvové, biele','[TEST] Papierové utierky ZZ 2-vrstvové','hygienicky-papier','TestLine','Papierové utierky','20 bal.','kart',31.9000,42.000,true,1,'CONSUMABLE',false,'FEATURED','test-papierove-utierky-zz-2v','Skladané papierové utierky na testovanie katalógu a objednávky.',jsonb_build_object('vrstvy',2,'farba','biela','format','ZZ')),
    ('stg_prod_pap_002','TEST-PAP-002','Toaletný papier Jumbo 2-vrstvový','[TEST] Toaletný papier Jumbo 2-vrstvový','hygienicky-papier','TestLine','Toaletný papier','12 kot.','kart',28.5000,18.000,true,1,'CONSUMABLE',false,'FEATURED','test-toaletny-papier-jumbo-2v','Jumbo kotúče pre frekventované prevádzky.',jsonb_build_object('vrstvy',2,'navin_m',180,'farba','biela')),
    ('stg_prod_pap_003','TEST-PAP-003','Toaletný papier skladaný V-fold','[TEST] Toaletný papier skladaný V-fold','hygienicky-papier','TestLine','Toaletný papier','36 bal.','kart',39.8000,0.000,false,5,'CONSUMABLE',false,'CATALOG','test-toaletny-papier-v-fold','Skladaný systém s dávkovaním po jednom útržku.',jsonb_build_object('system','V-fold','vrstvy',2)),
    ('stg_prod_myd_001','TEST-MYD-001','Penové mydlo 1 l bez parfumácie','[TEST] Penové mydlo 1 l','mydla-a-peny','PureWork','Penové mydlá','6 x 1 l','kart',34.2000,25.000,true,1,'CONSUMABLE',false,'FEATURED','test-penove-mydlo-1l','Jemné penové mydlo na bežné umývanie rúk.',jsonb_build_object('objem_ml',1000,'parfumacia','bez parfumácie')),
    ('stg_prod_myd_002','TEST-MYD-002','Tekuté mydlo 5 l citrus','[TEST] Tekuté mydlo 5 l citrus','mydla-a-peny','PureWork','Tekuté mydlá','5 l','ks',8.9000,33.000,true,1,'CONSUMABLE',false,'CATALOG','test-tekute-mydlo-5l-citrus','Náhradná náplň do dolievacích dávkovačov.',jsonb_build_object('objem_ml',5000,'vona','citrus')),
    ('stg_prod_dez_001','TEST-DEZ-001','Dezinfekčný gél na ruky 500 ml','[TEST] Dezinfekčný gél na ruky 500 ml','dezinfekcia','SafePro','Dezinfekcia rúk','12 x 500 ml','kart',42.6000,12.000,true,2,'CONSUMABLE',false,'CATALOG','test-dezinfekcny-gel-500ml','Alkoholový gél určený na hygienickú dezinfekciu rúk.',jsonb_build_object('objem_ml',500,'typ','gél')),
    ('stg_prod_dez_002','TEST-DEZ-002','Dezinfekcia povrchov 5 l','[TEST] Dezinfekcia povrchov 5 l','dezinfekcia','SafePro','Dezinfekcia povrchov','5 l','ks',19.7000,7.000,true,2,'CONSUMABLE',false,'CATALOG','test-dezinfekcia-povrchov-5l','Koncentrovaný prípravok na testovanie B2B cenotvorby.',jsonb_build_object('objem_ml',5000,'pouzitie','povrchy')),
    ('stg_prod_cis_001','TEST-CIS-001','Čistič kúpeľní 750 ml','[TEST] Čistič kúpeľní 750 ml','cistiace-prostriedky','CleanLab','Sanitárna chémia','6 x 750 ml','kart',17.4000,21.000,true,1,'CONSUMABLE',false,'FEATURED','test-cistic-kupelni-750ml','Pripravený prostriedok na sanitárne povrchy.',jsonb_build_object('objem_ml',750,'ph','kyslé')),
    ('stg_prod_cis_002','TEST-CIS-002','Podlahový čistič 5 l neutrálny','[TEST] Podlahový čistič 5 l','cistiace-prostriedky','CleanLab','Podlahová chémia','5 l','ks',12.3000,15.000,true,1,'CONSUMABLE',false,'CATALOG','test-podlahovy-cistic-5l','Neutrálny čistiaci prostriedok na umývateľné podlahy.',jsonb_build_object('objem_ml',5000,'ph','neutrálne')),
    ('stg_prod_dav_001','TEST-DAV-001','Dávkovač papierových utierok H2','[TEST] Dávkovač papierových utierok H2','davkovace-a-zasobniky','FacilityLab','Dávkovače utierok','1 ks','ks',NULL,6.000,true,2,'DISPENSER',true,'FEATURED','test-davkovac-utierok-h2','Dotovaný dávkovač; cena je zobrazená na vyžiadanie.',jsonb_build_object('system','H2','farba','biela')),
    ('stg_prod_dav_002','TEST-DAV-002','Dávkovač penového mydla S4','[TEST] Dávkovač penového mydla S4','davkovace-a-zasobniky','FacilityLab','Dávkovače mydla','1 ks','ks',36.5000,4.000,true,3,'DISPENSER',false,'CATALOG','test-davkovac-mydla-s4','Uzamykateľný dávkovač penového mydla.',jsonb_build_object('system','S4','farba','čierna')),
    ('stg_prod_upr_001','TEST-UPR-001','Mikrovláknová utierka 40 × 40 cm','[TEST] Mikrovláknová utierka 40 × 40 cm','upratovanie','CleanLab','Utierky','5 ks','bal',6.8000,55.000,true,1,'CONSUMABLE',false,'CATALOG','test-mikrovlaknova-utierka-5ks','Farebné rozlíšenie pre hygienický systém upratovania.',jsonb_build_object('rozmer_cm','40x40','pocet_ks',5)),
    ('stg_prod_upr_002','TEST-UPR-002','Upratovací vozík s lisom','[TEST] Upratovací vozík s lisom','upratovanie','FacilityLab','Upratovacie vozíky','1 ks','ks',189.0000,2.000,true,4,'EQUIPMENT',false,'CATALOG','test-upratovaci-vozik-s-lisom','Dvojvedrový vozík na testovanie objemného vybavenia.',jsonb_build_object('objem_l','2x25','typ','dvojvedrový')),
    ('stg_prod_vre_001','TEST-VRE-001','Vrecia na odpad 120 l pevné','[TEST] Vrecia na odpad 120 l','vrecia-a-obaly','EcoBag','Vrecia na odpad','25 ks','rol',7.2000,64.000,true,1,'CONSUMABLE',false,'CATALOG','test-vrecia-na-odpad-120l','Pevné čierne vrecia na prevádzkový odpad.',jsonb_build_object('objem_l',120,'pocet_ks',25,'farba','čierna')),
    ('stg_prod_kan_001','TEST-KAN-001','Kopírovací papier A4 80 g','[TEST] Kopírovací papier A4 80 g','kancelarske-potreby','OfficeLab','Kopírovací papier','5 × 500 hár.','kart',24.9000,31.000,true,1,'CONSUMABLE',false,'CATALOG','test-kopirovaci-papier-a4-80g','Kancelársky papier na testovanie zmiešaného košíka.',jsonb_build_object('format','A4','gramaz',80,'harok',2500)),
    ('stg_prod_hot_001','TEST-HOT-001','Hotelový sprchový gél 30 ml','[TEST] Hotelový sprchový gél 30 ml','hotelova-kozmetika','HotelLab','Hotelové amenity','50 ks','kart',22.5000,8.000,true,3,'CONSUMABLE',false,'FEATURED','test-hotelovy-sprchovy-gel-30ml','Jednorazová hotelová kozmetika v testovacom balení.',jsonb_build_object('objem_ml',30,'pocet_ks',50)),
    ('stg_prod_gas_001','TEST-GAS-001','Prostriedok do umývačky riadu 12 kg','[TEST] Prostriedok do umývačky 12 kg','gastro-program','GastroLab','Strojové umývanie','12 kg','ks',38.9000,5.000,true,3,'CONSUMABLE',false,'CATALOG','test-prostriedok-do-umyvacky-12kg','Alkalický prostriedok pre profesionálne umývačky.',jsonb_build_object('hmotnost_kg',12,'pouzitie','profesionálna umývačka')),
    ('stg_prod_pri_001','TEST-PRI-001','Nitrilové rukavice veľkosť M','[TEST] Nitrilové rukavice M','prislusenstvo','SafePro','Ochranná hygiena','100 ks','bal',8.6000,27.000,true,1,'CONSUMABLE',false,'CATALOG','test-nitrilove-rukavice-m','Nepúdrované rukavice na testovanie variantov a filtrov.',jsonb_build_object('velkost','M','pocet_ks',100,'farba','modrá'))
)
INSERT INTO "Product" (
  "id", "sku", "origin", "name", "nameDisplay", "categoryId", "brand", "subcategory",
  "packSize", "unit", "vatRate", "basePrice", "stockCache", "reserved", "stockSyncedAt",
  "isStocked", "leadDays", "productKind", "isSubsidized", "shelfStatus", "curationOverride",
  "contentStatus", "slug", "descriptionShort", "attributes", "isPublished", "updatedAt"
)
SELECT
  d.id, d.sku, 'MANUAL'::"ProductOrigin", d.name, d.name_display, c.id, d.brand, d.subcategory,
  d.pack_size, d.unit, 23.00, d.base_price, d.stock_qty, 0.000, now(),
  d.is_stocked, d.lead_days, d.product_kind::"ProductKind", d.is_subsidized,
  d.shelf_status::"ShelfStatus", 'NONE'::"CurationOverride", 'READY'::"ContentStatus",
  d.slug, d.short_description, d.attributes, true, now()
FROM data d
JOIN "Category" c ON c."slug" = d.category_slug
ON CONFLICT ("sku") DO UPDATE SET
  "origin" = EXCLUDED."origin",
  "name" = EXCLUDED."name",
  "nameDisplay" = EXCLUDED."nameDisplay",
  "categoryId" = EXCLUDED."categoryId",
  "brand" = EXCLUDED."brand",
  "subcategory" = EXCLUDED."subcategory",
  "packSize" = EXCLUDED."packSize",
  "unit" = EXCLUDED."unit",
  "vatRate" = EXCLUDED."vatRate",
  "basePrice" = EXCLUDED."basePrice",
  "stockCache" = EXCLUDED."stockCache",
  "reserved" = EXCLUDED."reserved",
  "stockSyncedAt" = EXCLUDED."stockSyncedAt",
  "isStocked" = EXCLUDED."isStocked",
  "leadDays" = EXCLUDED."leadDays",
  "productKind" = EXCLUDED."productKind",
  "isSubsidized" = EXCLUDED."isSubsidized",
  "shelfStatus" = EXCLUDED."shelfStatus",
  "curationOverride" = EXCLUDED."curationOverride",
  "contentStatus" = EXCLUDED."contentStatus",
  "slug" = EXCLUDED."slug",
  "descriptionShort" = EXCLUDED."descriptionShort",
  "attributes" = EXCLUDED."attributes",
  "isPublished" = true,
  "updatedAt" = now();

WITH tier(code, multiplier) AS (
  VALUES ('A',0.92::numeric),('B1',0.88::numeric),('B2',0.82::numeric),('B3',0.78::numeric)
), priced AS (
  SELECT p."id" AS product_id, p."basePrice" AS base_price
  FROM "Product" p
  WHERE p."sku" LIKE 'TEST-%' AND p."basePrice" IS NOT NULL AND p."isSubsidized" = false
)
INSERT INTO "ProductPrice" ("id", "productId", "priceTierCode", "unitPriceNet", "source", "syncedAt")
SELECT
  'stg_price_' || md5(priced.product_id || ':' || tier.code),
  priced.product_id,
  tier.code,
  round(priced.base_price * tier.multiplier, 4),
  'MANUAL'::"PriceSource",
  now()
FROM priced CROSS JOIN tier
ON CONFLICT ("productId", "priceTierCode") DO UPDATE SET
  "unitPriceNet" = EXCLUDED."unitPriceNet",
  "source" = EXCLUDED."source",
  "syncedAt" = EXCLUDED."syncedAt";

INSERT INTO "Company" (
  "id", "ico", "dic", "icDph", "name", "city", "address", "zip",
  "priceTierId", "splatDays", "active", "updatedAt"
)
SELECT
  'stg_company_hotel_aurora', '00000000', '2000000000', 'SK2000000000',
  '[TEST] Hotel Aurora s.r.o.', 'Nové Zámky', 'Testovacia 12', '940 01',
  pt."id", 14, true, now()
FROM "PriceTier" pt WHERE pt."code" = 'B2'
ON CONFLICT ("ico") DO UPDATE SET
  "name" = EXCLUDED."name",
  "city" = EXCLUDED."city",
  "address" = EXCLUDED."address",
  "zip" = EXCLUDED."zip",
  "priceTierId" = EXCLUDED."priceTierId",
  "splatDays" = EXCLUDED."splatDays",
  "active" = true,
  "updatedAt" = now();

WITH company AS (SELECT "id" FROM "Company" WHERE "ico" = '00000000')
INSERT INTO "DeliveryLocation" ("id", "companyId", "label", "street", "city", "zip", "isDefault", "updatedAt")
SELECT 'stg_location_hotel', company."id", 'Hlavná budova', 'Testovacia 12', 'Nové Zámky', '940 01', true, now() FROM company
UNION ALL
SELECT 'stg_location_wellness', company."id", 'Wellness centrum', 'Kúpeľná 8', 'Podhájska', '941 48', false, now() FROM company
ON CONFLICT ("id") DO UPDATE SET
  "companyId" = EXCLUDED."companyId",
  "label" = EXCLUDED."label",
  "street" = EXCLUDED."street",
  "city" = EXCLUDED."city",
  "zip" = EXCLUDED."zip",
  "isDefault" = EXCLUDED."isDefault",
  "updatedAt" = now();

INSERT INTO "AccessRequest" (
  "id", "ico", "companyName", "contactName", "email", "phone", "note", "status", "updatedAt"
)
VALUES
  ('stg_access_pending','11111111','[TEST] Bistro Dunaj s.r.o.','Jana Testovacia','jana@bistro-dunaj.example','+421900111222','Gastro prevádzka, záujem o hygienu a umývanie riadu.','PENDING'::"RequestStatus",now()),
  ('stg_access_rejected','22222222','[TEST] Neplatná firma s.r.o.','Peter Test','peter@neplatna-firma.example',NULL,'Test zamietnutej žiadosti.','REJECTED'::"RequestStatus",now())
ON CONFLICT ("id") DO UPDATE SET
  "companyName" = EXCLUDED."companyName",
  "contactName" = EXCLUDED."contactName",
  "email" = EXCLUDED."email",
  "phone" = EXCLUDED."phone",
  "note" = EXCLUDED."note",
  "status" = EXCLUDED."status",
  "updatedAt" = now();

INSERT INTO "Inquiry" ("id", "name", "company", "email", "phone", "location", "type", "segment", "message", "emailSent", "handledAt")
VALUES
  ('stg_inquiry_new','Marta Testovacia','[TEST] Penzión Park','marta@penzion-park.example','+421900333444','Nitra','cenova-ponuka','hotel','Prosím o testovaciu ponuku papierového programu a hotelovej kozmetiky.',false,NULL),
  ('stg_inquiry_handled','Ivan Test','[TEST] Office Center','ivan@office-center.example',NULL,'Nové Zámky','konzultacia','office','Test už vybaveného dopytu.',true,now())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "company" = EXCLUDED."company",
  "email" = EXCLUDED."email",
  "phone" = EXCLUDED."phone",
  "location" = EXCLUDED."location",
  "type" = EXCLUDED."type",
  "segment" = EXCLUDED."segment",
  "message" = EXCLUDED."message",
  "emailSent" = EXCLUDED."emailSent",
  "handledAt" = EXCLUDED."handledAt";

WITH company AS (SELECT "id" FROM "Company" WHERE "ico" = '00000000')
INSERT INTO "Invoice" (
  "id", "pohodaNumber", "companyId", "status", "issuedAt", "dueAt", "paidAt",
  "subtotal", "vat", "total", "sourceDbYear", "syncedAt", "updatedAt"
)
SELECT 'stg_invoice_paid','TEST-FA-2026-0001',company."id",'PAID'::"InvoiceStatus",current_date - 45,current_date - 31,current_date - 35,100.0000,23.0000,123.0000,2026,now(),now() FROM company
UNION ALL
SELECT 'stg_invoice_overdue','TEST-FA-2026-0002',company."id",'OVERDUE'::"InvoiceStatus",current_date - 30,current_date - 16,NULL,250.0000,57.5000,307.5000,2026,now(),now() FROM company
ON CONFLICT ("pohodaNumber") DO UPDATE SET
  "companyId" = EXCLUDED."companyId",
  "status" = EXCLUDED."status",
  "issuedAt" = EXCLUDED."issuedAt",
  "dueAt" = EXCLUDED."dueAt",
  "paidAt" = EXCLUDED."paidAt",
  "subtotal" = EXCLUDED."subtotal",
  "vat" = EXCLUDED."vat",
  "total" = EXCLUDED."total",
  "sourceDbYear" = EXCLUDED."sourceDbYear",
  "syncedAt" = EXCLUDED."syncedAt",
  "updatedAt" = now();

INSERT INTO "DispenserModel" ("id", "dispenserSku", "name", "systemCode", "updatedAt")
VALUES
  ('stg_dispenser_h2','TEST-DAV-001','[TEST] Dávkovač papierových utierok H2','H2',now()),
  ('stg_dispenser_s4','TEST-DAV-002','[TEST] Dávkovač penového mydla S4','S4',now())
ON CONFLICT ("dispenserSku") DO UPDATE SET
  "name" = EXCLUDED."name",
  "systemCode" = EXCLUDED."systemCode",
  "updatedAt" = now();

WITH refills(dispenser_sku, refill_sku, rank) AS (
  VALUES ('TEST-DAV-001','TEST-PAP-001',0),('TEST-DAV-002','TEST-MYD-001',0)
)
INSERT INTO "DispenserRefill" ("id", "dispenserModelId", "refillSku", "rank", "source", "confidence")
SELECT
  'stg_refill_' || md5(dm."id" || ':' || refills.refill_sku),
  dm."id", refills.refill_sku, refills.rank, 'CONFIRMED'::"RefillSource", 1.0000
FROM refills JOIN "DispenserModel" dm ON dm."dispenserSku" = refills.dispenser_sku
ON CONFLICT ("dispenserModelId", "refillSku") DO UPDATE SET
  "rank" = EXCLUDED."rank",
  "source" = EXCLUDED."source",
  "confidence" = EXCLUDED."confidence";

WITH company AS (SELECT "id" FROM "Company" WHERE "ico" = '00000000'),
models AS (SELECT "id", "dispenserSku" FROM "DispenserModel" WHERE "dispenserSku" LIKE 'TEST-%')
INSERT INTO "CompanyDispenser" (
  "id", "companyId", "dispenserModelId", "deliveryLocationId", "location", "qty",
  "arrangement", "placedAt", "avgRefillDays", "lastRefillAt", "nextRefillDue", "active", "updatedAt"
)
SELECT 'stg_placement_h2', company."id", models."id", 'stg_location_hotel', 'Recepcia a spoločné toalety', 4,
       'PLACED_FREE'::"Arrangement", current_date - 120, 30, current_date - 12, current_date + 18, true, now()
FROM company CROSS JOIN models WHERE models."dispenserSku" = 'TEST-DAV-001'
UNION ALL
SELECT 'stg_placement_s4', company."id", models."id", 'stg_location_wellness', 'Wellness šatne', 2,
       'RENTAL'::"Arrangement", current_date - 90, 21, current_date - 7, current_date + 14, true, now()
FROM company CROSS JOIN models WHERE models."dispenserSku" = 'TEST-DAV-002'
ON CONFLICT ("id") DO UPDATE SET
  "companyId" = EXCLUDED."companyId",
  "dispenserModelId" = EXCLUDED."dispenserModelId",
  "deliveryLocationId" = EXCLUDED."deliveryLocationId",
  "location" = EXCLUDED."location",
  "qty" = EXCLUDED."qty",
  "arrangement" = EXCLUDED."arrangement",
  "placedAt" = EXCLUDED."placedAt",
  "avgRefillDays" = EXCLUDED."avgRefillDays",
  "lastRefillAt" = EXCLUDED."lastRefillAt",
  "nextRefillDue" = EXCLUDED."nextRefillDue",
  "active" = EXCLUDED."active",
  "updatedAt" = now();

COMMIT;
