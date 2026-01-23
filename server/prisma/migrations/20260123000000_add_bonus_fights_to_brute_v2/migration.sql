-- Repair migration for Bonus Fights on Brute (v2)
-- Reason: previous migration 20260116000000_add_bonus_fights_to_brute failed in prod because
-- columns bonusFightsCount and bonusFightsDate already exist (likely added manually or by another process).
-- This migration is idempotent and will only add columns if they don't exist.

-- Add bonusFightsCount column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Brute' 
    AND column_name = 'bonusFightsCount'
  ) THEN
    ALTER TABLE "Brute" ADD COLUMN "bonusFightsCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add bonusFightsDate column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Brute' 
    AND column_name = 'bonusFightsDate'
  ) THEN
    ALTER TABLE "Brute" ADD COLUMN "bonusFightsDate" DATE;
  END IF;
END $$;
