-- Create SurvivalRegistration table for weekly Survival tournament (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'SurvivalRegistration'
  ) THEN
    CREATE TABLE "SurvivalRegistration" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "userId" UUID NOT NULL,
      "bruteId" UUID NOT NULL,
      "eventDate" DATE NOT NULL,
      "createdAt" TIMESTAMP(6) NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Unique constraint (userId, eventDate)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'SurvivalRegistration_userId_eventDate_key'
      AND table_name = 'SurvivalRegistration'
  ) THEN
    ALTER TABLE "SurvivalRegistration"
      ADD CONSTRAINT "SurvivalRegistration_userId_eventDate_key"
      UNIQUE ("userId", "eventDate");
  END IF;
END $$;

-- Foreign key to User (ON DELETE CASCADE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'SurvivalRegistration_userId_fkey'
      AND table_name = 'SurvivalRegistration'
  ) THEN
    ALTER TABLE "SurvivalRegistration"
      ADD CONSTRAINT "SurvivalRegistration_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

-- Foreign key to Brute (ON DELETE CASCADE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'SurvivalRegistration_bruteId_fkey'
      AND table_name = 'SurvivalRegistration'
  ) THEN
    ALTER TABLE "SurvivalRegistration"
      ADD CONSTRAINT "SurvivalRegistration_bruteId_fkey"
      FOREIGN KEY ("bruteId") REFERENCES "Brute"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

-- Index on eventDate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'SurvivalRegistration'
      AND indexname = 'SurvivalRegistration_eventDate_idx'
  ) THEN
    CREATE INDEX "SurvivalRegistration_eventDate_idx"
      ON "SurvivalRegistration"("eventDate");
  END IF;
END $$;

-- Index on bruteId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'SurvivalRegistration'
      AND indexname = 'SurvivalRegistration_bruteId_idx'
  ) THEN
    CREATE INDEX "SurvivalRegistration_bruteId_idx"
      ON "SurvivalRegistration"("bruteId");
  END IF;
END $$;

