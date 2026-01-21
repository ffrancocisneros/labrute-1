-- Performance tracking fields for fight-related progress updates
-- Reason: Avoid O(N fights) scans on each fight for win streak and unique skills missions/achievements.

ALTER TABLE "Brute"
  ADD COLUMN IF NOT EXISTS "winStreakCurrent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "winStreakMax" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "UserUsedSkill" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "skill" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserUsedSkill_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserUsedSkill_userId_fkey'
  ) THEN
    ALTER TABLE "UserUsedSkill"
      ADD CONSTRAINT "UserUsedSkill_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "UserUsedSkill_userId_skill_key" ON "UserUsedSkill"("userId","skill");
CREATE INDEX IF NOT EXISTS "UserUsedSkill_userId_idx" ON "UserUsedSkill"("userId");

