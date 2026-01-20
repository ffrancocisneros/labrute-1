-- CreateEnum
CREATE TYPE "public"."ObjectiveType" AS ENUM ('WIN_FIGHTS', 'WIN_TOURNAMENT', 'LEVEL_UP', 'COMPLETE_FIGHTS', 'USE_SKILLS', 'GAIN_XP', 'REACH_LEVEL', 'COMPLETE_ACHIEVEMENTS');

-- CreateEnum
CREATE TYPE "public"."ObjectiveRewardType" AS ENUM ('GOLD', 'TITLE');

-- CreateTable
CREATE TABLE "public"."DailyObjective" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "type" "public"."ObjectiveType" NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "rewardType" "public"."ObjectiveRewardType" NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WeeklyObjective" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "type" "public"."ObjectiveType" NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "rewardType" "public"."ObjectiveRewardType" NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "weekStart" DATE NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyObjective_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyObjective_id_key" ON "public"."DailyObjective"("id");

-- CreateIndex
CREATE INDEX "DailyObjective_userId_date_idx" ON "public"."DailyObjective"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyObjective_date_idx" ON "public"."DailyObjective"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyObjective_userId_type_date_key" ON "public"."DailyObjective"("userId", "type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyObjective_id_key" ON "public"."WeeklyObjective"("id");

-- CreateIndex
CREATE INDEX "WeeklyObjective_userId_weekStart_idx" ON "public"."WeeklyObjective"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyObjective_weekStart_idx" ON "public"."WeeklyObjective"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyObjective_userId_type_weekStart_key" ON "public"."WeeklyObjective"("userId", "type", "weekStart");

-- AddForeignKey
ALTER TABLE "public"."DailyObjective" ADD CONSTRAINT "DailyObjective_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyObjective" ADD CONSTRAINT "WeeklyObjective_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
