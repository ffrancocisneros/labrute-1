-- AlterEnum
ALTER TYPE "public"."AchievementType" ADD VALUE 'DAYS_PLAYED_CONSECUTIVE';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "lastFightDate" DATE,
ADD COLUMN "consecutiveDaysPlayed" INTEGER NOT NULL DEFAULT 0;
