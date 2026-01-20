-- CreateEnum
CREATE TYPE "ShopItemType" AS ENUM ('COSMETIC', 'BONUS_FIGHTS', 'TEMPORARY_WEAPON', 'TEMPORARY_SKILL');

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

-- CreateIndex
CREATE INDEX "ShopItem_type_available_idx" ON "ShopItem"("type", "available");

-- CreateIndex
CREATE INDEX "ShopItem_order_idx" ON "ShopItem"("order");
