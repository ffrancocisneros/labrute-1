-- Hotfix (idempotent): ensure Brute.lastFight is TIMESTAMPTZ(6).
-- Some environments ended up with lastFight as TEXT containing ISO strings (e.g. 2026-03-31T00:00:00+00:00),
-- which Prisma cannot decode as DateTime.

DO $$
DECLARE
  t text;
BEGIN
  SELECT c.data_type
  INTO t
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'Brute'
    AND c.column_name = 'lastFight';

  IF t IS NULL THEN
    RAISE NOTICE 'Column public."Brute"."lastFight" not found, skipping';
    RETURN;
  END IF;

  IF t = 'timestamp with time zone' THEN
    -- already correct
    RETURN;
  END IF;

  IF t = 'date' THEN
    ALTER TABLE "Brute"
    ALTER COLUMN "lastFight" TYPE TIMESTAMPTZ(6)
    USING (
      CASE
        WHEN "lastFight" IS NULL THEN NULL
        ELSE ("lastFight"::timestamp AT TIME ZONE 'UTC')
      END
    );
    RETURN;
  END IF;

  -- Covers text / character varying / timestamp without time zone / etc.
  -- Null/empty-string safe.
  ALTER TABLE "Brute"
  ALTER COLUMN "lastFight" TYPE TIMESTAMPTZ(6)
  USING (
    CASE
      WHEN "lastFight" IS NULL THEN NULL
      WHEN btrim("lastFight"::text) = '' THEN NULL
      ELSE ("lastFight"::timestamptz)
    END
  );
END $$;

