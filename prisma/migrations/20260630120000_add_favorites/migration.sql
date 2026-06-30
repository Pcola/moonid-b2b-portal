-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_companyId_idx" ON "Favorite"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_companyId_productId_key" ON "Favorite"("companyId", "productId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (default-deny) — nová tabuľka musí mať RLS zapnuté (CI gate: tests/rls-enabled.test.ts).
-- Prisma sa pripája rolou postgres (BYPASSRLS) → app funguje; anon/authenticated default-deny.
ALTER TABLE "Favorite" ENABLE ROW LEVEL SECURITY;
