-- CreateTable
CREATE TABLE "RepeatDraftItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "RepeatDraftItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepeatDraftItem_userId_idx" ON "RepeatDraftItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RepeatDraftItem_userId_productId_key" ON "RepeatDraftItem"("userId", "productId");

-- AddForeignKey
ALTER TABLE "RepeatDraftItem" ADD CONSTRAINT "RepeatDraftItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepeatDraftItem" ADD CONSTRAINT "RepeatDraftItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Default-deny RLS regime (CI gate tests/rls-enabled.test.ts): app sa pripája ako postgres (BYPASSRLS),
-- anon/authenticated sú default-denied (žiadne policies). Každá nová tabuľka MUSÍ mať RLS zapnuté.
ALTER TABLE "RepeatDraftItem" ENABLE ROW LEVEL SECURITY;
