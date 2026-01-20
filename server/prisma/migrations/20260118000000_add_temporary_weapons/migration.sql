-- AlterEnum
ALTER TYPE "BattlePassRewardType" ADD VALUE 'TEMPORARY_WEAPON';

-- CreateTable
CREATE TABLE "BruteTemporaryWeapon" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bruteId" UUID NOT NULL,
    "weaponName" "WeaponName" NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "BruteTemporaryWeapon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BruteTemporaryWeapon_bruteId_idx" ON "BruteTemporaryWeapon"("bruteId");

-- CreateIndex
CREATE INDEX "BruteTemporaryWeapon_expiresAt_idx" ON "BruteTemporaryWeapon"("expiresAt");

-- AddForeignKey
ALTER TABLE "BruteTemporaryWeapon" ADD CONSTRAINT "BruteTemporaryWeapon_bruteId_fkey" FOREIGN KEY ("bruteId") REFERENCES "Brute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
