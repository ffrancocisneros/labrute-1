-- CreateEnum
CREATE TYPE "BattlePassRewardType" AS ENUM ('GOLD', 'TITLE', 'COSMETIC', 'BONUS_FIGHTS', 'TEMPORARY_SKILL');

-- CreateEnum
CREATE TYPE "BattlePassMissionType" AS ENUM ('WIN_FIGHTS', 'PARTICIPATE_TOURNAMENTS', 'WIN_TOURNAMENTS', 'DEAL_DAMAGE', 'WIN_STREAK', 'ASCEND');

-- CreateEnum
CREATE TYPE "BattlePassMissionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "bonusFightsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "bonusFightsDate" DATE;

-- CreateTable
CREATE TABLE "BattlePassSeason" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,

    CONSTRAINT "BattlePassSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePassReward" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seasonId" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "rewardType" "BattlePassRewardType" NOT NULL,
    "valueInt" INTEGER,
    "valueString" VARCHAR(255),

    CONSTRAINT "BattlePassReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePassMission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seasonId" UUID NOT NULL,
    "type" "BattlePassMissionType" NOT NULL,
    "target" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "difficulty" "BattlePassMissionDifficulty" NOT NULL,

    CONSTRAINT "BattlePassMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBattlePassProgress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "claimedLevels" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "UserBattlePassProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBattlePassMissionProgress" (
    "userId" UUID NOT NULL,
    "missionId" UUID NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMPTZ,

    CONSTRAINT "UserBattlePassMissionProgress_pkey" PRIMARY KEY ("userId","missionId")
);

-- CreateTable
CREATE TABLE "BruteTemporaryEffect" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bruteId" UUID NOT NULL,
    "skillName" "SkillName" NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "BruteTemporaryEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticPreset" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "body" VARCHAR(11) NOT NULL,
    "colors" VARCHAR(32) NOT NULL,

    CONSTRAINT "CosmeticPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUnlockedCosmetic" (
    "userId" UUID NOT NULL,
    "cosmeticPresetId" INTEGER NOT NULL,

    CONSTRAINT "UserUnlockedCosmetic_pkey" PRIMARY KEY ("userId","cosmeticPresetId")
);

-- CreateIndex
CREATE INDEX "BattlePassSeason_startDate_endDate_idx" ON "BattlePassSeason"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "BattlePassReward_seasonId_level_idx" ON "BattlePassReward"("seasonId", "level");

-- CreateIndex
CREATE INDEX "BattlePassMission_seasonId_idx" ON "BattlePassMission"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBattlePassProgress_userId_seasonId_key" ON "UserBattlePassProgress"("userId", "seasonId");

-- CreateIndex
CREATE INDEX "UserBattlePassProgress_userId_idx" ON "UserBattlePassProgress"("userId");

-- CreateIndex
CREATE INDEX "UserBattlePassProgress_seasonId_idx" ON "UserBattlePassProgress"("seasonId");

-- CreateIndex
CREATE INDEX "UserBattlePassMissionProgress_userId_idx" ON "UserBattlePassMissionProgress"("userId");

-- CreateIndex
CREATE INDEX "UserBattlePassMissionProgress_missionId_idx" ON "UserBattlePassMissionProgress"("missionId");

-- CreateIndex
CREATE INDEX "BruteTemporaryEffect_bruteId_idx" ON "BruteTemporaryEffect"("bruteId");

-- CreateIndex
CREATE INDEX "BruteTemporaryEffect_expiresAt_idx" ON "BruteTemporaryEffect"("expiresAt");

-- CreateIndex
CREATE INDEX "UserUnlockedCosmetic_userId_idx" ON "UserUnlockedCosmetic"("userId");

-- AddForeignKey
ALTER TABLE "BattlePassReward" ADD CONSTRAINT "BattlePassReward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "BattlePassSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePassMission" ADD CONSTRAINT "BattlePassMission_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "BattlePassSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePassProgress" ADD CONSTRAINT "UserBattlePassProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePassProgress" ADD CONSTRAINT "UserBattlePassProgress_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "BattlePassSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePassMissionProgress" ADD CONSTRAINT "UserBattlePassMissionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBattlePassMissionProgress" ADD CONSTRAINT "UserBattlePassMissionProgress_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "BattlePassMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BruteTemporaryEffect" ADD CONSTRAINT "BruteTemporaryEffect_bruteId_fkey" FOREIGN KEY ("bruteId") REFERENCES "Brute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUnlockedCosmetic" ADD CONSTRAINT "UserUnlockedCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUnlockedCosmetic" ADD CONSTRAINT "UserUnlockedCosmetic_cosmeticPresetId_fkey" FOREIGN KEY ("cosmeticPresetId") REFERENCES "CosmeticPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
