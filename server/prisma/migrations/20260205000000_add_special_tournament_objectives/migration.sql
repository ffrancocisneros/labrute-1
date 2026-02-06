-- AlterEnum
ALTER TYPE "public"."ObjectiveType" ADD VALUE IF NOT EXISTS 'WIN_SPECIAL_TOURNAMENT';

-- AlterEnum
ALTER TYPE "public"."ObjectiveType" ADD VALUE IF NOT EXISTS 'COMPLETE_SPECIAL_FIGHTS';

-- AlterEnum (TournamentType.SPECIAL for special tournaments)
ALTER TYPE "public"."TournamentType" ADD VALUE IF NOT EXISTS 'SPECIAL';
