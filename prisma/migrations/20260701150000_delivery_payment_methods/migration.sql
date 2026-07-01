-- Doprava & platba: editovateľné metódy + snapshot na objednávke + poplatky (netto).

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryMethodCode" TEXT,
ADD COLUMN     "deliveryMethodLabel" TEXT,
ADD COLUMN     "paymentMethodCode" TEXT,
ADD COLUMN     "paymentMethodLabel" TEXT,
ADD COLUMN     "paymentSurcharge" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "shippingFee" DECIMAL(12,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DeliveryMethod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "requiresAddress" BOOLEAN NOT NULL DEFAULT true,
    "flatFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "freeThreshold" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "surcharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryMethod_code_key" ON "DeliveryMethod"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_code_key" ON "PaymentMethod"("code");

-- RLS default-deny (rovnaký režim ako ostatné tabuľky: app beží ako postgres/BYPASSRLS,
-- anon/authenticated default-denied; stráži to CI gate tests/rls-enabled.test.ts).
ALTER TABLE "DeliveryMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;

-- Seed: 3 spôsoby dopravy + 3 platby. Hodnoty sú PLACEHOLDER — plne editovateľné v /staff/doprava-platba.
INSERT INTO "DeliveryMethod" ("id","code","label","description","enabled","sortOrder","requiresAddress","flatFee","freeThreshold","createdAt","updatedAt") VALUES
  (gen_random_uuid()::text,'rozvoz','Náš rozvoz','Doručíme naším rozvozom, termín potvrdíme telefonicky alebo e-mailom.',true,1,true,4.90,50.00,now(),now()),
  (gen_random_uuid()::text,'odber','Osobný odber','Vyzdvihnutie na našej prevádzke. Adresu odberného miesta upravte v nastaveniach.',true,2,false,0,NULL,now(),now()),
  (gen_random_uuid()::text,'kurier','Externý kuriér','Doručenie prepravnou službou.',true,3,true,6.90,100.00,now(),now());

INSERT INTO "PaymentMethod" ("id","code","label","description","enabled","sortOrder","surcharge","createdAt","updatedAt") VALUES
  (gen_random_uuid()::text,'faktura','Na faktúru','Platba faktúrou so splatnosťou podľa dohody. Bez platby vopred.',true,1,0,now(),now()),
  (gen_random_uuid()::text,'dobierka','Dobierka','Platba v hotovosti alebo kartou pri prevzatí tovaru.',true,2,1.00,now(),now()),
  (gen_random_uuid()::text,'vopred','Platba vopred prevodom','Zálohová faktúra — objednávku expedujeme po pripísaní úhrady.',true,3,0,now(),now());
