-- Odstrani iba demo data vytvorene scripts/staging/seed-demo-data.sql.
-- Core kategorie a cenove urovne zamerne ponechava.

BEGIN;

SELECT pg_advisory_xact_lock(hashtext('moonid-staging-demo-seed-v1'));

DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moonid_app_staging') THEN
    RAISE EXCEPTION 'STAGING ONLY: rola moonid_app_staging v tejto databaze neexistuje.';
  END IF;
END
$guard$;

DELETE FROM "CompanyDispenser" WHERE "id" LIKE 'stg_placement_%';
DELETE FROM "DispenserRefill" WHERE "id" LIKE 'stg_refill_%';
DELETE FROM "DispenserModel" WHERE "dispenserSku" LIKE 'TEST-%';
DELETE FROM "Invoice" WHERE "pohodaNumber" LIKE 'TEST-FA-%';
DELETE FROM "Inquiry" WHERE "id" LIKE 'stg_inquiry_%';
DELETE FROM "AccessRequest" WHERE "id" LIKE 'stg_access_%';
DELETE FROM "DeliveryLocation" WHERE "id" LIKE 'stg_location_%';
DELETE FROM "Company" WHERE "ico" = '00000000';
DELETE FROM "ProductPrice" WHERE "productId" IN (SELECT "id" FROM "Product" WHERE "sku" LIKE 'TEST-%');
DELETE FROM "Product" WHERE "sku" LIKE 'TEST-%';

COMMIT;
