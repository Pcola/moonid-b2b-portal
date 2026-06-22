-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER_USER', 'CUSTOMER_ADMIN', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "ShelfStatus" AS ENUM ('FEATURED', 'CATALOG', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CurationOverride" AS ENUM ('NONE', 'FORCE_FEATURED', 'FORCE_HIDE');

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('CONSUMABLE', 'DISPENSER', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('STUB', 'DRAFT', 'READY');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('POHODA', 'COMPUTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PRIJATA', 'POTVRDENA', 'PRIPRAVUJE', 'NA_CESTE', 'DORUCENA', 'STORNO');

-- CreateEnum
CREATE TYPE "PohodaSyncStatus" AS ENUM ('LOKALNA', 'CAKA_NA_OBJ', 'OBJ_VYTVORENA', 'CAKA_NA_FA', 'FA_VYTVORENA', 'CHYBA');

-- CreateEnum
CREATE TYPE "Fulfillment" AS ENUM ('SKLADOM', 'NA_OBJEDNAVKU');

-- CreateEnum
CREATE TYPE "StatusSource" AS ENUM ('PORTAL', 'POHODA_SYNC');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Arrangement" AS ENUM ('RENTAL', 'PLACED_FREE', 'SOLD');

-- CreateEnum
CREATE TYPE "RefillSource" AS ENUM ('DERIVED', 'MANUAL', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "SyncJobKind" AS ENUM ('CREATE_OBJ', 'PULL_FA', 'CANCEL_OBJ');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('QUEUED', 'CLAIMED', 'PUSHED', 'FAILED');

-- CreateTable
CREATE TABLE "PriceTier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL,
    "pohodaCenyIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "ico" TEXT NOT NULL,
    "dic" TEXT,
    "icDph" TEXT,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "priceTierId" TEXT NOT NULL,
    "splatDays" INTEGER NOT NULL DEFAULT 14,
    "pohodaCenyIds" TEXT,
    "pohodaRefAd" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "street" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER_USER',
    "companyId" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "pohodaGroupCode" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameDisplay" TEXT,
    "categoryId" TEXT,
    "brand" TEXT,
    "systemCode" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'ks',
    "mj2Koef" DECIMAL(12,3),
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 23,
    "basePrice" DECIMAL(12,4),
    "costPrice" DECIMAL(12,4),
    "stockCache" DECIMAL(12,3),
    "reserved" DECIMAL(12,3),
    "stockSyncedAt" TIMESTAMP(3),
    "isStocked" BOOLEAN NOT NULL DEFAULT false,
    "leadDays" INTEGER NOT NULL DEFAULT 5,
    "productKind" "ProductKind" NOT NULL DEFAULT 'CONSUMABLE',
    "isSubsidized" BOOLEAN NOT NULL DEFAULT false,
    "shelfStatus" "ShelfStatus" NOT NULL DEFAULT 'CATALOG',
    "featuredReason" TEXT,
    "curationOverride" "CurationOverride" NOT NULL DEFAULT 'NONE',
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'STUB',
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceTierCode" TEXT NOT NULL,
    "unitPriceNet" DECIMAL(12,4) NOT NULL,
    "source" "PriceSource" NOT NULL DEFAULT 'POHODA',
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMedia" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "alt" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "deliveryLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "deliveryLocationId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PRIJATA',
    "hasBackorder" BOOLEAN NOT NULL DEFAULT false,
    "priceTierCode" TEXT NOT NULL,
    "note" TEXT,
    "subtotal" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "vat" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "requestedDeliveryDate" TIMESTAMP(3),
    "promisedDeliveryDate" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "pohodaSync" "PohodaSyncStatus" NOT NULL DEFAULT 'LOKALNA',
    "pohodaObjNumber" TEXT,
    "pohodaFaNumber" TEXT,
    "pohodaPushedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "unitPriceSnapshot" DECIMAL(12,4) NOT NULL,
    "costSnapshot" DECIMAL(12,4),
    "qty" DECIMAL(12,3) NOT NULL,
    "lineTotal" DECIMAL(12,4) NOT NULL,
    "fulfillment" "Fulfillment" NOT NULL DEFAULT 'SKLADOM',
    "expectedAt" TIMESTAMP(3),

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changedById" TEXT,
    "source" "StatusSource" NOT NULL DEFAULT 'PORTAL',
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "pohodaNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,4) NOT NULL,
    "vat" DECIMAL(12,4) NOT NULL,
    "total" DECIMAL(12,4) NOT NULL,
    "pdfStoragePath" TEXT,
    "sourceDbYear" INTEGER,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispenserModel" (
    "id" TEXT NOT NULL,
    "dispenserSku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "systemCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispenserModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispenserRefill" (
    "id" TEXT NOT NULL,
    "dispenserModelId" TEXT NOT NULL,
    "refillSku" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "source" "RefillSource" NOT NULL DEFAULT 'DERIVED',
    "confidence" DECIMAL(5,4),

    CONSTRAINT "DispenserRefill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDispenser" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dispenserModelId" TEXT NOT NULL,
    "deliveryLocationId" TEXT,
    "location" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "arrangement" "Arrangement" NOT NULL DEFAULT 'RENTAL',
    "placedAt" TIMESTAMP(3),
    "avgRefillDays" INTEGER,
    "lastRefillAt" TIMESTAMP(3),
    "nextRefillDue" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyDispenser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncCursor" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "skz" TIMESTAMP(3),
    "ad" TIMESTAMP(3),
    "prices" TIMESTAMP(3),
    "fa" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastInboundAt" TIMESTAMP(3),
    "lastStockSyncAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "agentVersion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PohodaSyncJob" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "SyncJobKind" NOT NULL,
    "payload" JSONB,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PohodaSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocDedup" (
    "id" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "docNumber" TEXT NOT NULL,
    "docDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocDedup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceTier_code_key" ON "PriceTier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Company_ico_key" ON "Company"("ico");

-- CreateIndex
CREATE INDEX "Company_priceTierId_idx" ON "Company"("priceTierId");

-- CreateIndex
CREATE INDEX "DeliveryLocation_companyId_idx" ON "DeliveryLocation"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_shelfStatus_idx" ON "Product"("shelfStatus");

-- CreateIndex
CREATE INDEX "Product_productKind_idx" ON "Product"("productKind");

-- CreateIndex
CREATE INDEX "ProductPrice_priceTierCode_idx" ON "ProductPrice"("priceTierCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_productId_priceTierCode_key" ON "ProductPrice"("productId", "priceTierCode");

-- CreateIndex
CREATE INDEX "ProductMedia_productId_idx" ON "ProductMedia"("productId");

-- CreateIndex
CREATE INDEX "Cart_companyId_idx" ON "Cart"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_companyId_idx" ON "Order"("companyId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_pohodaSync_idx" ON "Order"("pohodaSync");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_idx" ON "OrderStatusEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_pohodaNumber_key" ON "Invoice"("pohodaNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DispenserModel_dispenserSku_key" ON "DispenserModel"("dispenserSku");

-- CreateIndex
CREATE UNIQUE INDEX "DispenserRefill_dispenserModelId_refillSku_key" ON "DispenserRefill"("dispenserModelId", "refillSku");

-- CreateIndex
CREATE INDEX "CompanyDispenser_companyId_idx" ON "CompanyDispenser"("companyId");

-- CreateIndex
CREATE INDEX "PohodaSyncJob_status_idx" ON "PohodaSyncJob"("status");

-- CreateIndex
CREATE INDEX "PohodaSyncJob_orderId_idx" ON "PohodaSyncJob"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "DocDedup_docType_docNumber_docDate_key" ON "DocDedup"("docType", "docNumber", "docDate");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "PriceTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLocation" ADD CONSTRAINT "DeliveryLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryLocationId_fkey" FOREIGN KEY ("deliveryLocationId") REFERENCES "DeliveryLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenserRefill" ADD CONSTRAINT "DispenserRefill_dispenserModelId_fkey" FOREIGN KEY ("dispenserModelId") REFERENCES "DispenserModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDispenser" ADD CONSTRAINT "CompanyDispenser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDispenser" ADD CONSTRAINT "CompanyDispenser_dispenserModelId_fkey" FOREIGN KEY ("dispenserModelId") REFERENCES "DispenserModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyDispenser" ADD CONSTRAINT "CompanyDispenser_deliveryLocationId_fkey" FOREIGN KEY ("deliveryLocationId") REFERENCES "DeliveryLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PohodaSyncJob" ADD CONSTRAINT "PohodaSyncJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
