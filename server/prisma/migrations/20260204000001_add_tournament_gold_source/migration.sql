-- Add source field to TournamentGold to track tournament type
-- This allows creating individual GoldTransaction records before aggregation

-- Add source column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'TournamentGold' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE "TournamentGold" ADD COLUMN "source" VARCHAR(50);
  END IF;
END $$;
