-- CreateEnum
CREATE TYPE "public"."AchievementType" AS ENUM ('WIN_FIGHTS_TOTAL', 'WIN_FIGHTS_SINGLE_BRUTE', 'WIN_TOURNAMENTS_TOTAL', 'WIN_TOURNAMENTS_CONSECUTIVE', 'REACH_LEVEL', 'REACH_LEVEL_MULTIPLE', 'COMPLETE_FIGHTS_TOTAL', 'COMPLETE_FIGHTS_SINGLE_BRUTE', 'GAIN_GOLD_TOTAL', 'GAIN_GOLD_MONTHLY', 'ASCEND_TOTAL', 'ASCEND_SINGLE_BRUTE', 'RESET_TOTAL', 'RESET_SINGLE_BRUTE', 'CLAN_WARS_WON', 'CLAN_BOSS_CHALLENGES', 'CLAN_POINTS_CONTRIBUTED', 'EVENTS_PARTICIPATED', 'EVENTS_FINAL_REACHED', 'EVENTS_WON', 'AUTO_FIGHTS_COMPLETED', 'DAMAGE_DEALT_TOTAL', 'WIN_STREAK', 'TOP_RANKING', 'BRUTES_IN_TOP_100');

-- CreateEnum
CREATE TYPE "public"."AchievementLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "public"."AchievementRewardType" AS ENUM ('GOLD', 'TITLE', 'COSMETIC');

-- CreateTable
CREATE TABLE "public"."PermanentAchievement" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "type" "public"."AchievementType" NOT NULL,
    "level" "public"."AchievementLevel" NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "rewardType" "public"."AchievementRewardType" NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermanentAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermanentAchievement_id_key" ON "public"."PermanentAchievement"("id");

-- CreateIndex
CREATE INDEX "PermanentAchievement_userId_completed_claimed_idx" ON "public"."PermanentAchievement"("userId", "completed", "claimed");

-- CreateIndex
CREATE INDEX "PermanentAchievement_type_level_idx" ON "public"."PermanentAchievement"("type", "level");

-- CreateIndex
CREATE UNIQUE INDEX "PermanentAchievement_userId_type_level_key" ON "public"."PermanentAchievement"("userId", "type", "level");

-- AddForeignKey
ALTER TABLE "public"."PermanentAchievement" ADD CONSTRAINT "PermanentAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
