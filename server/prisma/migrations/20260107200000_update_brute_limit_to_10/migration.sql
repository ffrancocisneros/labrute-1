-- Update all existing users to have bruteLimit of 10
UPDATE "User" SET "bruteLimit" = 10 WHERE "bruteLimit" < 10;

