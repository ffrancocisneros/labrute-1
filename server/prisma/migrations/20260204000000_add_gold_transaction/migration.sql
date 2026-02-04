-- Add GoldTransaction table for tracking gold income and expenses
-- This table will track all gold transactions with source information

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "GoldTransaction" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  "source" VARCHAR(50) NOT NULL,
  "sourceData" TEXT,
  "bruteId" UUID,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GoldTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'GoldTransaction_userId_fkey'
  ) THEN
    ALTER TABLE "GoldTransaction" ADD CONSTRAINT "GoldTransaction_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'GoldTransaction_bruteId_fkey'
  ) THEN
    ALTER TABLE "GoldTransaction" ADD CONSTRAINT "GoldTransaction_bruteId_fkey" 
    FOREIGN KEY ("bruteId") REFERENCES "Brute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "GoldTransaction_userId_createdAt_idx" ON "GoldTransaction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "GoldTransaction_bruteId_idx" ON "GoldTransaction"("bruteId");
