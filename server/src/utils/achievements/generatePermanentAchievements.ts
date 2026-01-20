import { AchievementLevel, AchievementRewardType, AchievementType, PrismaClient } from '@labrute/prisma';

export interface AchievementConfig {
  type: AchievementType;
  level: AchievementLevel;
  target: number;
  rewardType: AchievementRewardType;
  rewardValue: number;
}

// Configuración de logros permanentes con múltiples niveles
export const PERMANENT_ACHIEVEMENT_CONFIGS: AchievementConfig[] = [
  // WIN_FIGHTS_TOTAL - Ganar peleas totales
  { type: AchievementType.WIN_FIGHTS_TOTAL, level: AchievementLevel.BRONZE, target: 100, rewardType: AchievementRewardType.GOLD, rewardValue: 500 },
  { type: AchievementType.WIN_FIGHTS_TOTAL, level: AchievementLevel.SILVER, target: 500, rewardType: AchievementRewardType.GOLD, rewardValue: 2500 },
  { type: AchievementType.WIN_FIGHTS_TOTAL, level: AchievementLevel.GOLD, target: 1000, rewardType: AchievementRewardType.GOLD, rewardValue: 5000 },
  { type: AchievementType.WIN_FIGHTS_TOTAL, level: AchievementLevel.PLATINUM, target: 5000, rewardType: AchievementRewardType.GOLD, rewardValue: 25000 },

  // WIN_FIGHTS_SINGLE_BRUTE - Ganar peleas con un solo bruto
  { type: AchievementType.WIN_FIGHTS_SINGLE_BRUTE, level: AchievementLevel.BRONZE, target: 50, rewardType: AchievementRewardType.GOLD, rewardValue: 300 },
  { type: AchievementType.WIN_FIGHTS_SINGLE_BRUTE, level: AchievementLevel.SILVER, target: 200, rewardType: AchievementRewardType.GOLD, rewardValue: 1500 },
  { type: AchievementType.WIN_FIGHTS_SINGLE_BRUTE, level: AchievementLevel.GOLD, target: 500, rewardType: AchievementRewardType.GOLD, rewardValue: 4000 },
  { type: AchievementType.WIN_FIGHTS_SINGLE_BRUTE, level: AchievementLevel.PLATINUM, target: 1000, rewardType: AchievementRewardType.TITLE, rewardValue: 4 },

  // WIN_TOURNAMENTS_TOTAL - Ganar torneos totales
  { type: AchievementType.WIN_TOURNAMENTS_TOTAL, level: AchievementLevel.BRONZE, target: 10, rewardType: AchievementRewardType.GOLD, rewardValue: 1000 },
  { type: AchievementType.WIN_TOURNAMENTS_TOTAL, level: AchievementLevel.SILVER, target: 50, rewardType: AchievementRewardType.GOLD, rewardValue: 5000 },
  { type: AchievementType.WIN_TOURNAMENTS_TOTAL, level: AchievementLevel.GOLD, target: 100, rewardType: AchievementRewardType.GOLD, rewardValue: 10000 },
  { type: AchievementType.WIN_TOURNAMENTS_TOTAL, level: AchievementLevel.PLATINUM, target: 500, rewardType: AchievementRewardType.TITLE, rewardValue: 5 },

  // REACH_LEVEL - Llegar a un nivel específico
  { type: AchievementType.REACH_LEVEL, level: AchievementLevel.BRONZE, target: 30, rewardType: AchievementRewardType.GOLD, rewardValue: 500 },
  { type: AchievementType.REACH_LEVEL, level: AchievementLevel.SILVER, target: 40, rewardType: AchievementRewardType.GOLD, rewardValue: 1500 },
  { type: AchievementType.REACH_LEVEL, level: AchievementLevel.GOLD, target: 50, rewardType: AchievementRewardType.GOLD, rewardValue: 3000 },
  { type: AchievementType.REACH_LEVEL, level: AchievementLevel.PLATINUM, target: 60, rewardType: AchievementRewardType.TITLE, rewardValue: 3 },

  // COMPLETE_FIGHTS_TOTAL - Completar peleas totales
  { type: AchievementType.COMPLETE_FIGHTS_TOTAL, level: AchievementLevel.BRONZE, target: 500, rewardType: AchievementRewardType.GOLD, rewardValue: 1000 },
  { type: AchievementType.COMPLETE_FIGHTS_TOTAL, level: AchievementLevel.SILVER, target: 2000, rewardType: AchievementRewardType.GOLD, rewardValue: 5000 },
  { type: AchievementType.COMPLETE_FIGHTS_TOTAL, level: AchievementLevel.GOLD, target: 5000, rewardType: AchievementRewardType.GOLD, rewardValue: 15000 },
  { type: AchievementType.COMPLETE_FIGHTS_TOTAL, level: AchievementLevel.PLATINUM, target: 10000, rewardType: AchievementRewardType.TITLE, rewardValue: 9 },

  // GAIN_GOLD_TOTAL - Acumular oro total
  { type: AchievementType.GAIN_GOLD_TOTAL, level: AchievementLevel.BRONZE, target: 10000, rewardType: AchievementRewardType.GOLD, rewardValue: 500 },
  { type: AchievementType.GAIN_GOLD_TOTAL, level: AchievementLevel.SILVER, target: 100000, rewardType: AchievementRewardType.GOLD, rewardValue: 5000 },
  { type: AchievementType.GAIN_GOLD_TOTAL, level: AchievementLevel.GOLD, target: 500000, rewardType: AchievementRewardType.GOLD, rewardValue: 25000 },
  { type: AchievementType.GAIN_GOLD_TOTAL, level: AchievementLevel.PLATINUM, target: 1000000, rewardType: AchievementRewardType.TITLE, rewardValue: 10 },

  // ASCEND_TOTAL - Ascender total
  { type: AchievementType.ASCEND_TOTAL, level: AchievementLevel.BRONZE, target: 1, rewardType: AchievementRewardType.GOLD, rewardValue: 2000 },
  { type: AchievementType.ASCEND_TOTAL, level: AchievementLevel.SILVER, target: 3, rewardType: AchievementRewardType.GOLD, rewardValue: 6000 },
  { type: AchievementType.ASCEND_TOTAL, level: AchievementLevel.GOLD, target: 5, rewardType: AchievementRewardType.GOLD, rewardValue: 10000 },
  { type: AchievementType.ASCEND_TOTAL, level: AchievementLevel.PLATINUM, target: 10, rewardType: AchievementRewardType.TITLE, rewardValue: 11 },

  // CLAN_WARS_WON - Ganar guerras de clan
  { type: AchievementType.CLAN_WARS_WON, level: AchievementLevel.BRONZE, target: 5, rewardType: AchievementRewardType.GOLD, rewardValue: 1000 },
  { type: AchievementType.CLAN_WARS_WON, level: AchievementLevel.SILVER, target: 20, rewardType: AchievementRewardType.GOLD, rewardValue: 5000 },
  { type: AchievementType.CLAN_WARS_WON, level: AchievementLevel.GOLD, target: 50, rewardType: AchievementRewardType.GOLD, rewardValue: 15000 },
  { type: AchievementType.CLAN_WARS_WON, level: AchievementLevel.PLATINUM, target: 100, rewardType: AchievementRewardType.TITLE, rewardValue: 12 },

  // EVENTS_PARTICIPATED - Participar en eventos
  { type: AchievementType.EVENTS_PARTICIPATED, level: AchievementLevel.BRONZE, target: 5, rewardType: AchievementRewardType.GOLD, rewardValue: 500 },
  { type: AchievementType.EVENTS_PARTICIPATED, level: AchievementLevel.SILVER, target: 10, rewardType: AchievementRewardType.GOLD, rewardValue: 2000 },
  { type: AchievementType.EVENTS_PARTICIPATED, level: AchievementLevel.GOLD, target: 25, rewardType: AchievementRewardType.GOLD, rewardValue: 5000 },
  { type: AchievementType.EVENTS_PARTICIPATED, level: AchievementLevel.PLATINUM, target: 50, rewardType: AchievementRewardType.TITLE, rewardValue: 13 },

  // EVENTS_WON - Ganar eventos
  { type: AchievementType.EVENTS_WON, level: AchievementLevel.BRONZE, target: 1, rewardType: AchievementRewardType.GOLD, rewardValue: 5000 },
  { type: AchievementType.EVENTS_WON, level: AchievementLevel.SILVER, target: 3, rewardType: AchievementRewardType.GOLD, rewardValue: 15000 },
  { type: AchievementType.EVENTS_WON, level: AchievementLevel.GOLD, target: 5, rewardType: AchievementRewardType.GOLD, rewardValue: 30000 },
  { type: AchievementType.EVENTS_WON, level: AchievementLevel.PLATINUM, target: 10, rewardType: AchievementRewardType.TITLE, rewardValue: 14 },

  // WIN_STREAK - Racha de victorias (máxima racha individual del bruto)
  { type: AchievementType.WIN_STREAK, level: AchievementLevel.BRONZE, target: 5, rewardType: AchievementRewardType.GOLD, rewardValue: 500 },
  { type: AchievementType.WIN_STREAK, level: AchievementLevel.SILVER, target: 10, rewardType: AchievementRewardType.GOLD, rewardValue: 2000 },
  { type: AchievementType.WIN_STREAK, level: AchievementLevel.GOLD, target: 25, rewardType: AchievementRewardType.GOLD, rewardValue: 5000 },
  { type: AchievementType.WIN_STREAK, level: AchievementLevel.PLATINUM, target: 50, rewardType: AchievementRewardType.TITLE, rewardValue: 6 },

  // DAMAGE_DEALT_TOTAL - Daño total causado (cuenta todos los brutes)
  { type: AchievementType.DAMAGE_DEALT_TOTAL, level: AchievementLevel.BRONZE, target: 10000, rewardType: AchievementRewardType.GOLD, rewardValue: 500 },
  { type: AchievementType.DAMAGE_DEALT_TOTAL, level: AchievementLevel.SILVER, target: 100000, rewardType: AchievementRewardType.GOLD, rewardValue: 2500 },
  { type: AchievementType.DAMAGE_DEALT_TOTAL, level: AchievementLevel.GOLD, target: 1000000, rewardType: AchievementRewardType.GOLD, rewardValue: 10000 },
  { type: AchievementType.DAMAGE_DEALT_TOTAL, level: AchievementLevel.PLATINUM, target: 10000000, rewardType: AchievementRewardType.TITLE, rewardValue: 7 },

  // DAYS_PLAYED_CONSECUTIVE - Días consecutivos jugando (mínimo 1 pelea)
  { type: AchievementType.DAYS_PLAYED_CONSECUTIVE, level: AchievementLevel.BRONZE, target: 7, rewardType: AchievementRewardType.GOLD, rewardValue: 500 },
  { type: AchievementType.DAYS_PLAYED_CONSECUTIVE, level: AchievementLevel.SILVER, target: 30, rewardType: AchievementRewardType.GOLD, rewardValue: 2000 },
  { type: AchievementType.DAYS_PLAYED_CONSECUTIVE, level: AchievementLevel.GOLD, target: 100, rewardType: AchievementRewardType.GOLD, rewardValue: 5000 },
  { type: AchievementType.DAYS_PLAYED_CONSECUTIVE, level: AchievementLevel.PLATINUM, target: 365, rewardType: AchievementRewardType.TITLE, rewardValue: 8 },
];

/**
 * Genera todos los logros permanentes para un usuario
 */
export const generatePermanentAchievements = async (
  prisma: PrismaClient,
  userId: string,
): Promise<void> => {
  // Verificar qué logros ya tiene el usuario
  const existingAchievements = await prisma.permanentAchievement.findMany({
    where: { userId },
    select: { type: true, level: true },
  });

  const existingKeys = new Set(
    existingAchievements.map((a) => `${a.type}_${a.level}`),
  );

  // Crear solo los logros que no existen
  const achievementsToCreate = PERMANENT_ACHIEVEMENT_CONFIGS
    .filter((config) => !existingKeys.has(`${config.type}_${config.level}`))
    .map((config) => ({
      userId,
      type: config.type,
      level: config.level,
      target: config.target,
      rewardType: config.rewardType,
      rewardValue: config.rewardValue,
    }));

  if (achievementsToCreate.length > 0) {
    await prisma.permanentAchievement.createMany({
      data: achievementsToCreate,
    });
  }
};
