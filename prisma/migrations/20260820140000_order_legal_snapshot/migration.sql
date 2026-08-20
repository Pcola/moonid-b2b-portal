-- Immutable commercial/legal evidence for new orders. Columns stay nullable so historical
-- records are not backfilled with facts that were not captured at their submission time.
ALTER TABLE "Order"
  ADD COLUMN "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
  ADD COLUMN "sellerSnapshot" JSONB,
  ADD COLUMN "buyerSnapshot" JSONB,
  ADD COLUMN "deliveryAddressSnapshot" JSONB,
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "termsSha256" TEXT,
  ADD COLUMN "termsUrl" TEXT,
  ADD COLUMN "termsSnapshot" TEXT,
  ADD COLUMN "termsAcknowledgedAt" TIMESTAMP(3);

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_currency_iso4217_chk" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "Order_terms_sha256_chk" CHECK ("termsSha256" IS NULL OR "termsSha256" ~ '^[0-9a-f]{64}$');
