-- Zdieľaný firemný košík nemal ownership/locking a kolegovia si mohli navzájom meniť položky.
-- Existujúci košík ostane svojmu createdBy používateľovi; ostatní si vytvoria vlastný.
DROP INDEX "Cart_companyId_key";
CREATE UNIQUE INDEX "Cart_createdById_key" ON "Cart"("createdById");
CREATE INDEX "Cart_companyId_idx" ON "Cart"("companyId");
