import { getGameDay } from '@labrute/core';
import type { PrismaClient } from '@labrute/prisma';
import dayjs from 'dayjs';

export interface BattlePassMissionRow {
  id: string;
  type: string;
  target: number;
  xpReward: number;
  difficulty: string;
}

export interface BattlePassRewardRow {
  id: string;
  level: number;
  rewardType: string;
  valueInt: number | null;
  valueString: string | null;
}

export interface CurrentSeasonWithRelations {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  rewards: BattlePassRewardRow[];
  missions: BattlePassMissionRow[];
}

/**
 * Obtiene la temporada de pase de batalla actual (startDate <= hoy <= endDate).
 */
export const getCurrentSeason = async (
  prisma: PrismaClient,
): Promise<CurrentSeasonWithRelations | null> => {
  const today = getGameDay().toDate();
  const row = await prisma.battlePassSeason.findFirst({
    where: {
      startDate: { lte: today },
      endDate: { gte: today },
    },
    include: {
      rewards: { orderBy: { level: 'asc' } },
      missions: true,
    },
  });
  return row as CurrentSeasonWithRelations | null;
};
