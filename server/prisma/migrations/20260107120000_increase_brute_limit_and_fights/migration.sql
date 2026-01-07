-- Update existing users to have at least 10 brute slots
UPDATE "User" SET "bruteLimit" = 10 WHERE "bruteLimit" < 10;

-- AlterTable: Change default for User.bruteLimit from 3 to 10
ALTER TABLE "User" ALTER COLUMN "bruteLimit" SET DEFAULT 10;

-- AlterTable: Change default for Brute.fightsLeft from 6 to 12
ALTER TABLE "Brute" ALTER COLUMN "fightsLeft" SET DEFAULT 12;

