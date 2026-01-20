-- Repair migration for Shop System (v2)
-- Reason: previous migration 20260119000000_add_shop_system failed in prod due to gen_random_uuid()/pgcrypto.
-- This migration uses uuid_generate_v4() (uuid-ossp) and is idempotent.

-- Ensure uuid generator exists (many tables already rely on uuid_generate_v4()).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShopItemType') THEN
    CREATE TYPE "ShopItemType" AS ENUM ('COSMETIC', 'BONUS_FIGHTS', 'TEMPORARY_WEAPON', 'TEMPORARY_SKILL');
  END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "ShopItem" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "type" "ShopItemType" NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "price" INTEGER NOT NULL,
  "valueInt" INTEGER,
  "valueString" VARCHAR(255),
  "available" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "ShopItem_type_available_idx" ON "ShopItem"("type", "available");
CREATE INDEX IF NOT EXISTS "ShopItem_order_idx" ON "ShopItem"("order");

