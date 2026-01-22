-- CreateIndex
CREATE INDEX IF NOT EXISTS "BruteTemporaryEffect_bruteId_expiresAt_idx" ON "BruteTemporaryEffect"("bruteId", "expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BruteTemporaryWeapon_bruteId_expiresAt_idx" ON "BruteTemporaryWeapon"("bruteId", "expiresAt");
