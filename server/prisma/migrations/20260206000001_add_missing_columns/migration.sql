-- Add specialRule column to Tournament table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Tournament' 
    AND column_name = 'specialRule'
  ) THEN
    ALTER TABLE "Tournament" ADD COLUMN "specialRule" VARCHAR(50);
  END IF;
END $$;

-- Add bossRotationDate column to Clan table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Clan' 
    AND column_name = 'bossRotationDate'
  ) THEN
    ALTER TABLE "Clan" ADD COLUMN "bossRotationDate" DATE;
  END IF;
END $$;
