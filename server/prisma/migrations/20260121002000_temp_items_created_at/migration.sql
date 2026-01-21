-- Add createdAt to temporary items to enforce 1 purchase/day (UTC)

ALTER TABLE "BruteTemporaryEffect"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE "BruteTemporaryWeapon"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS "BruteTemporaryEffect_createdAt_idx" ON "BruteTemporaryEffect"("createdAt");
CREATE INDEX IF NOT EXISTS "BruteTemporaryWeapon_createdAt_idx" ON "BruteTemporaryWeapon"("createdAt");

