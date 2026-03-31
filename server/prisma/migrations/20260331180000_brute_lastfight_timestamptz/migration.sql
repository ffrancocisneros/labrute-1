-- Fix: Brute.lastFight must include time to respect GAME_DAY_OFFSET_HOURS (AR reset at 18:00).
-- Previously it was DATE, which truncates time and breaks getFightsLeft() around the game-day boundary.

ALTER TABLE "Brute"
ALTER COLUMN "lastFight" TYPE TIMESTAMPTZ(6)
USING (
  CASE
    WHEN "lastFight" IS NULL THEN NULL
    ELSE ("lastFight"::timestamp AT TIME ZONE 'UTC')
  END
);

