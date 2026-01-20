-- AlterTable
ALTER TABLE "User" ADD COLUMN     "unlockedTitleIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "equippedTitleId" INTEGER;
