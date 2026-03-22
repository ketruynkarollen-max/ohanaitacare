-- ============================================================
-- MIGRAÇÃO: Ingredientes, Fichas Técnicas e Sessões de Caixa
-- Cole este script no Neon Console → SQL Editor e execute.
-- ============================================================

-- 1. Ingredientes (despensa de insumos)
CREATE TABLE IF NOT EXISTS "Ingredient" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "unit"      TEXT NOT NULL DEFAULT 'un',
  "unitCost"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "category"  TEXT NOT NULL DEFAULT 'OTHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- 2. Itens de receita (ficha técnica: produto × ingrediente × quantidade)
CREATE TABLE IF NOT EXISTS "RecipeItem" (
  "id"           TEXT NOT NULL,
  "productId"    TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "quantity"     DOUBLE PRECISION NOT NULL,
  CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecipeItem_productId_ingredientId_key" UNIQUE ("productId", "ingredientId"),
  CONSTRAINT "RecipeItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  CONSTRAINT "RecipeItem_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE
);

-- 3. Sessões de caixa (abertura e fechamento)
CREATE TABLE IF NOT EXISTS "CashSession" (
  "id"             TEXT NOT NULL,
  "date"           TIMESTAMP(3) NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'OPEN',
  "openedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"       TIMESTAMP(3),
  "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalCash"      DOUBLE PRECISION,
  "totalPix"       DOUBLE PRECISION,
  "totalCard"      DOUBLE PRECISION,
  "totalOther"     DOUBLE PRECISION,
  "totalOrders"    DOUBLE PRECISION,
  "expectedCash"   DOUBLE PRECISION,
  "closingBalance" DOUBLE PRECISION,
  "difference"     DOUBLE PRECISION,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CashSession_date_idx" ON "CashSession"("date");

-- ============================================================
-- Verificação: deve retornar as 3 tabelas criadas
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('Ingredient', 'RecipeItem', 'CashSession')
ORDER BY table_name;
