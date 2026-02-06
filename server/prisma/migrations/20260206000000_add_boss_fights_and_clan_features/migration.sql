-- Add lastBossFightDate column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Brute' 
    AND column_name = 'lastBossFightDate'
  ) THEN
    ALTER TABLE "Brute" ADD COLUMN "lastBossFightDate" DATE;
  END IF;
END $$;

-- Add bossFightsToday column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Brute' 
    AND column_name = 'bossFightsToday'
  ) THEN
    ALTER TABLE "Brute" ADD COLUMN "bossFightsToday" INTEGER NOT NULL DEFAULT 2;
  END IF;
END $$;

-- Create ClanTournamentFormat enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClanTournamentFormat') THEN
    CREATE TYPE "ClanTournamentFormat" AS ENUM ('ELIMINATION', 'LEAGUE');
  END IF;
END $$;

-- Create ClanTournamentStatus enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClanTournamentStatus') THEN
    CREATE TYPE "ClanTournamentStatus" AS ENUM ('PENDING', 'ONGOING', 'FINISHED');
  END IF;
END $$;

-- Create ClanMissionType enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClanMissionType') THEN
    CREATE TYPE "ClanMissionType" AS ENUM (
      'DAILY_BOSS_FIGHTS',
      'DAILY_CLAN_WAR_WIN',
      'DAILY_BOSS_DAMAGE',
      'WEEKLY_BOSS_KILL',
      'WEEKLY_TOURNAMENTS_PLAYED',
      'WEEKLY_DUELS_WON'
    );
  END IF;
END $$;

-- Create ClanMissionCadence enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClanMissionCadence') THEN
    CREATE TYPE "ClanMissionCadence" AS ENUM ('DAILY', 'WEEKLY');
  END IF;
END $$;

-- Create ClanTournament table (idempotent)
CREATE TABLE IF NOT EXISTS "ClanTournament" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "date" DATE NOT NULL,
    "format" "ClanTournamentFormat" NOT NULL,
    "status" "ClanTournamentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rounds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClanTournament_pkey" PRIMARY KEY ("id")
);

-- Create index on ClanTournament if not exists
CREATE INDEX IF NOT EXISTS "ClanTournament_date_format_idx" ON "ClanTournament"("date", "format");

-- Create ClanTournamentClan table (idempotent)
CREATE TABLE IF NOT EXISTS "ClanTournamentClan" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "clanId" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "seed" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "finalPosition" INTEGER,

    CONSTRAINT "ClanTournamentClan_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on ClanTournamentClan if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClanTournamentClan_tournamentId_clanId_key'
  ) THEN
    ALTER TABLE "ClanTournamentClan" ADD CONSTRAINT "ClanTournamentClan_tournamentId_clanId_key" UNIQUE ("tournamentId", "clanId");
  END IF;
END $$;

-- Create indexes on ClanTournamentClan if not exists
CREATE INDEX IF NOT EXISTS "ClanTournamentClan_clanId_idx" ON "ClanTournamentClan"("clanId");
CREATE INDEX IF NOT EXISTS "ClanTournamentClan_tournamentId_idx" ON "ClanTournamentClan"("tournamentId");

-- Create ClanTournamentWar table (idempotent)
CREATE TABLE IF NOT EXISTS "ClanTournamentWar" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tournamentId" UUID NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "attackerClanId" UUID NOT NULL,
    "defenderClanId" UUID NOT NULL,
    "winnerClanId" UUID,
    "attackerWins" INTEGER NOT NULL DEFAULT 0,
    "defenderWins" INTEGER NOT NULL DEFAULT 0,
    "fightIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ClanTournamentWar_pkey" PRIMARY KEY ("id")
);

-- Create indexes on ClanTournamentWar if not exists
CREATE INDEX IF NOT EXISTS "ClanTournamentWar_tournamentId_round_idx" ON "ClanTournamentWar"("tournamentId", "round");
CREATE INDEX IF NOT EXISTS "ClanTournamentWar_attackerClanId_idx" ON "ClanTournamentWar"("attackerClanId");
CREATE INDEX IF NOT EXISTS "ClanTournamentWar_defenderClanId_idx" ON "ClanTournamentWar"("defenderClanId");
CREATE INDEX IF NOT EXISTS "ClanTournamentWar_winnerClanId_idx" ON "ClanTournamentWar"("winnerClanId");

-- Create ClanMission table (idempotent)
CREATE TABLE IF NOT EXISTS "ClanMission" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "clanId" UUID NOT NULL,
    "type" "ClanMissionType" NOT NULL,
    "cadence" "ClanMissionCadence" NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(6),
    "rewardGold" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClanMission_pkey" PRIMARY KEY ("id")
);

-- Create index on ClanMission if not exists
CREATE INDEX IF NOT EXISTS "ClanMission_clanId_cadence_startDate_endDate_idx" ON "ClanMission"("clanId", "cadence", "startDate", "endDate");

-- Add foreign key constraints if tables exist and constraints don't exist
DO $$
BEGIN
  -- ClanTournamentClan foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClanTournamentClan')
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ClanTournamentClan_clanId_fkey'
    ) THEN
    ALTER TABLE "ClanTournamentClan" ADD CONSTRAINT "ClanTournamentClan_clanId_fkey" 
      FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClanTournamentClan')
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ClanTournamentClan_tournamentId_fkey'
    ) THEN
    ALTER TABLE "ClanTournamentClan" ADD CONSTRAINT "ClanTournamentClan_tournamentId_fkey" 
      FOREIGN KEY ("tournamentId") REFERENCES "ClanTournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  -- ClanTournamentWar foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClanTournamentWar')
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ClanTournamentWar_tournamentId_fkey'
    ) THEN
    ALTER TABLE "ClanTournamentWar" ADD CONSTRAINT "ClanTournamentWar_tournamentId_fkey" 
      FOREIGN KEY ("tournamentId") REFERENCES "ClanTournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClanTournamentWar')
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ClanTournamentWar_attackerClanId_fkey'
    ) THEN
    ALTER TABLE "ClanTournamentWar" ADD CONSTRAINT "ClanTournamentWar_attackerClanId_fkey" 
      FOREIGN KEY ("attackerClanId") REFERENCES "Clan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClanTournamentWar')
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ClanTournamentWar_defenderClanId_fkey'
    ) THEN
    ALTER TABLE "ClanTournamentWar" ADD CONSTRAINT "ClanTournamentWar_defenderClanId_fkey" 
      FOREIGN KEY ("defenderClanId") REFERENCES "Clan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClanTournamentWar')
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ClanTournamentWar_winnerClanId_fkey'
    ) THEN
    ALTER TABLE "ClanTournamentWar" ADD CONSTRAINT "ClanTournamentWar_winnerClanId_fkey" 
      FOREIGN KEY ("winnerClanId") REFERENCES "Clan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- ClanMission foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClanMission')
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'ClanMission_clanId_fkey'
    ) THEN
    ALTER TABLE "ClanMission" ADD CONSTRAINT "ClanMission_clanId_fkey" 
      FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
