-- Add claimed fields to daily/weekly objectives
-- Reason: `completedAt` represents completion time, not claim time. Using it as claimed marker prevented rewards.

ALTER TABLE "DailyObjective"
  ADD COLUMN IF NOT EXISTS "claimed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP;

ALTER TABLE "WeeklyObjective"
  ADD COLUMN IF NOT EXISTS "claimed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP;

