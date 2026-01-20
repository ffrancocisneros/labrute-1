-- CreateEnum
CREATE TYPE "public"."MissionType" AS ENUM ('WIN_FIGHTS', 'WIN_FIGHTS_STREAK', 'WIN_TOURNAMENT', 'DEAL_DAMAGE', 'PARTICIPATE_CLAN_WAR', 'REACH_LEVEL', 'ASCEND', 'COMPLETE_FIGHTS', 'GAIN_XP', 'FOLLOW_BRUTES', 'JOIN_CLAN', 'PARTICIPATE_CLAN_WARS', 'PARTICIPATE_EVENT', 'REACH_EVENT_FINAL', 'WIN_EVENT', 'CREATE_BRUTES', 'TRY_DIFFERENT_SKILLS');

-- CreateEnum
CREATE TYPE "public"."MissionCategory" AS ENUM ('COMBAT', 'PROGRESSION', 'SOCIAL', 'EVENTS', 'SPECIAL');

-- CreateEnum
CREATE TYPE "public"."MissionRewardType" AS ENUM ('GOLD', 'TITLE');

-- CreateEnum
CREATE TYPE "public"."MissionAchievementType" AS ENUM ('COMPLETE_COMBAT_MISSIONS', 'COMPLETE_PROGRESSION_MISSIONS', 'COMPLETE_SOCIAL_MISSIONS', 'COMPLETE_EVENTS_MISSIONS', 'COMPLETE_SPECIAL_MISSIONS', 'COMPLETE_DAILY_MISSIONS', 'COMPLETE_WEEKLY_MISSIONS', 'COMPLETE_ALL_MISSIONS');

-- CreateTable
CREATE TABLE "public"."Mission" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "category" "public"."MissionCategory" NOT NULL,
    "type" "public"."MissionType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "rewardType" "public"."MissionRewardType" NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MissionAchievement" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "type" "public"."MissionAchievementType" NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "rewardType" "public"."MissionRewardType" NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mission_userId_completed_claimed_idx" ON "public"."Mission"("userId", "completed", "claimed");

-- CreateIndex
CREATE INDEX "Mission_userId_category_idx" ON "public"."Mission"("userId", "category");

-- CreateIndex
CREATE INDEX "Mission_category_order_idx" ON "public"."Mission"("category", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MissionAchievement_userId_type_key" ON "public"."MissionAchievement"("userId", "type");

-- CreateIndex
CREATE INDEX "MissionAchievement_userId_completed_claimed_idx" ON "public"."MissionAchievement"("userId", "completed", "claimed");

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionAchievement" ADD CONSTRAINT "MissionAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
