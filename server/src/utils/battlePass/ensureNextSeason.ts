import { getGameDay } from '@labrute/core';
import {
  BattlePassMissionDifficulty,
  BattlePassMissionType,
  BattlePassRewardType,
  type PrismaClient,
} from '@labrute/prisma';
import dayjs from 'dayjs';
import { getCurrentSeason } from './getCurrentSeason.js';

/**
 * Distribución variada de recompensas para los 40 niveles
 */
const getRewardDistribution = (): Array<{
  level: number;
  type: BattlePassRewardType;
  valueInt?: number;
  valueString?: string;
}> => [
  // Niveles 1-10: Oro y recompensas básicas
  { level: 1, type: BattlePassRewardType.GOLD, valueInt: 25 },
  { level: 2, type: BattlePassRewardType.TEMPORARY_WEAPON, valueString: 'sword' },
  { level: 3, type: BattlePassRewardType.GOLD, valueInt: 50 },
  { level: 4, type: BattlePassRewardType.BONUS_FIGHTS, valueInt: 5 },
  { level: 5, type: BattlePassRewardType.GOLD, valueInt: 75 },
  { level: 6, type: BattlePassRewardType.TEMPORARY_SKILL, valueString: 'herculeanStrength' },
  { level: 7, type: BattlePassRewardType.GOLD, valueInt: 50 },
  { level: 8, type: BattlePassRewardType.TEMPORARY_WEAPON, valueString: 'axe' },
  { level: 9, type: BattlePassRewardType.GOLD, valueInt: 100 },
  { level: 10, type: BattlePassRewardType.COSMETIC, valueInt: 1 }, // Nivel especial

  // Niveles 11-20: Mezcla de recompensas
  { level: 11, type: BattlePassRewardType.GOLD, valueInt: 75 },
  { level: 12, type: BattlePassRewardType.TEMPORARY_SKILL, valueString: 'felineAgility' },
  { level: 13, type: BattlePassRewardType.GOLD, valueInt: 100 },
  { level: 14, type: BattlePassRewardType.BONUS_FIGHTS, valueInt: 5 },
  { level: 15, type: BattlePassRewardType.GOLD, valueInt: 125 },
  { level: 16, type: BattlePassRewardType.TEMPORARY_WEAPON, valueString: 'broadsword' },
  { level: 17, type: BattlePassRewardType.GOLD, valueInt: 100 },
  { level: 18, type: BattlePassRewardType.TEMPORARY_SKILL, valueString: 'lightningBolt' },
  { level: 19, type: BattlePassRewardType.GOLD, valueInt: 150 },
  { level: 20, type: BattlePassRewardType.COSMETIC, valueInt: 2 }, // Nivel especial

  // Niveles 21-30: Recompensas mejoradas
  { level: 21, type: BattlePassRewardType.GOLD, valueInt: 125 },
  { level: 22, type: BattlePassRewardType.TEMPORARY_WEAPON, valueString: 'trident' },
  { level: 23, type: BattlePassRewardType.GOLD, valueInt: 150 },
  { level: 24, type: BattlePassRewardType.TEMPORARY_SKILL, valueString: 'vitality' },
  { level: 25, type: BattlePassRewardType.GOLD, valueInt: 175 },
  { level: 26, type: BattlePassRewardType.BONUS_FIGHTS, valueInt: 5 },
  { level: 27, type: BattlePassRewardType.GOLD, valueInt: 150 },
  { level: 28, type: BattlePassRewardType.TEMPORARY_WEAPON, valueString: 'whip' },
  { level: 29, type: BattlePassRewardType.GOLD, valueInt: 200 },
  { level: 30, type: BattlePassRewardType.COSMETIC, valueInt: 3 }, // Nivel especial

  // Niveles 31-40: Recompensas premium
  { level: 31, type: BattlePassRewardType.GOLD, valueInt: 175 },
  { level: 32, type: BattlePassRewardType.TEMPORARY_SKILL, valueString: 'immortality' },
  { level: 33, type: BattlePassRewardType.GOLD, valueInt: 200 },
  { level: 34, type: BattlePassRewardType.TEMPORARY_WEAPON, valueString: 'scimitar' },
  { level: 35, type: BattlePassRewardType.GOLD, valueInt: 225 },
  { level: 36, type: BattlePassRewardType.BONUS_FIGHTS, valueInt: 5 },
  { level: 37, type: BattlePassRewardType.GOLD, valueInt: 200 },
  { level: 38, type: BattlePassRewardType.TEMPORARY_SKILL, valueString: 'weaponsMaster' },
  { level: 39, type: BattlePassRewardType.GOLD, valueInt: 250 },
  { level: 40, type: BattlePassRewardType.COSMETIC, valueInt: 4 }, // Nivel máximo especial
];

/**
 * Si no existe ninguna temporada, crea la Temporada 1 (empieza hoy, 30 días).
 * Recompensas y misiones de ejemplo; se pueden editar en BD.
 */
export const ensureFirstBattlePassSeason = async (prisma: PrismaClient): Promise<void> => {
  const n = await prisma.battlePassSeason.count();
  if (n > 0) return;

  const start = getGameDay().toDate();
  const end = dayjs.utc(start).add(30, 'day').toDate();
  const s = await prisma.battlePassSeason.create({
    data: {
      name: 'Temporada 1',
      startDate: start,
      endDate: end,
    },
  });

  const rewardDistribution = getRewardDistribution();

  for (const reward of rewardDistribution) {
    await prisma.battlePassReward.create({
      data: {
        seasonId: s.id,
        level: reward.level,
        rewardType: reward.type,
        valueInt: reward.valueInt ?? null,
        valueString: reward.valueString ?? null,
      },
    });
  }

  const missions: Array<{ type: BattlePassMissionType; target: number; xp: number; diff: BattlePassMissionDifficulty }> = [
    // Ganar peleas
    { type: BattlePassMissionType.WIN_FIGHTS, target: 20, xp: 10, diff: BattlePassMissionDifficulty.EASY },
    { type: BattlePassMissionType.WIN_FIGHTS, target: 50, xp: 25, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.WIN_FIGHTS, target: 100, xp: 50, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.WIN_FIGHTS, target: 300, xp: 100, diff: BattlePassMissionDifficulty.HARD },
    { type: BattlePassMissionType.WIN_FIGHTS, target: 500, xp: 150, diff: BattlePassMissionDifficulty.HARD },
    { type: BattlePassMissionType.WIN_FIGHTS, target: 1000, xp: 250, diff: BattlePassMissionDifficulty.HARD },
    { type: BattlePassMissionType.WIN_FIGHTS, target: 2000, xp: 500, diff: BattlePassMissionDifficulty.HARD },
    // Participar en torneos
    { type: BattlePassMissionType.PARTICIPATE_TOURNAMENTS, target: 5, xp: 10, diff: BattlePassMissionDifficulty.EASY },
    { type: BattlePassMissionType.PARTICIPATE_TOURNAMENTS, target: 10, xp: 25, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.PARTICIPATE_TOURNAMENTS, target: 20, xp: 50, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.PARTICIPATE_TOURNAMENTS, target: 30, xp: 100, diff: BattlePassMissionDifficulty.HARD },
    // Ganar torneos
    { type: BattlePassMissionType.WIN_TOURNAMENTS, target: 1, xp: 25, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.WIN_TOURNAMENTS, target: 3, xp: 50, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.WIN_TOURNAMENTS, target: 5, xp: 100, diff: BattlePassMissionDifficulty.HARD },
    { type: BattlePassMissionType.WIN_TOURNAMENTS, target: 10, xp: 200, diff: BattlePassMissionDifficulty.HARD },
    // Causar daño
    { type: BattlePassMissionType.DEAL_DAMAGE, target: 500, xp: 10, diff: BattlePassMissionDifficulty.EASY },
    { type: BattlePassMissionType.DEAL_DAMAGE, target: 2000, xp: 25, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.DEAL_DAMAGE, target: 5000, xp: 50, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.DEAL_DAMAGE, target: 10000, xp: 100, diff: BattlePassMissionDifficulty.HARD },
    // Racha de victorias
    { type: BattlePassMissionType.WIN_STREAK, target: 5, xp: 25, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.WIN_STREAK, target: 10, xp: 50, diff: BattlePassMissionDifficulty.MEDIUM },
    { type: BattlePassMissionType.WIN_STREAK, target: 20, xp: 100, diff: BattlePassMissionDifficulty.HARD },
    { type: BattlePassMissionType.WIN_STREAK, target: 50, xp: 200, diff: BattlePassMissionDifficulty.HARD },
  ];
  for (const m of missions) {
    await prisma.battlePassMission.create({
      data: {
        seasonId: s.id,
        type: m.type,
        target: m.target,
        xpReward: m.xp,
        difficulty: m.diff,
      },
    });
  }
};

/**
 * Si la temporada actual termina en ≤1 día y aún no existe la siguiente,
 * crea la próxima temporada copiando la estructura de recompensas y misiones.
 */
export const ensureNextBattlePassSeason = async (prisma: PrismaClient): Promise<void> => {
  await ensureFirstBattlePassSeason(prisma);

  const current = await getCurrentSeason(prisma);
  if (!current) return;

  const today = getGameDay();
  const endDate = dayjs.utc(current.endDate).startOf('day');
  const daysUntilEnd = endDate.diff(today, 'day');
  if (daysUntilEnd > 1) return;

  const nextStart = endDate.add(1, 'day').toDate();
  const nextEnd = dayjs(nextStart).add(30, 'day').toDate(); // 30 días de duración

  const existing = await prisma.battlePassSeason.findFirst({
    where: { startDate: { gte: nextStart } },
  });
  if (existing) return;

  const nextName = `Temporada ${(await prisma.battlePassSeason.count()) + 1}`;
  const next = await prisma.battlePassSeason.create({
    data: {
      name: nextName,
      startDate: nextStart,
      endDate: nextEnd,
    },
  });

  // Copiar recompensas
  for (const r of current.rewards) {
    await prisma.battlePassReward.create({
      data: {
        seasonId: next.id,
        level: r.level,
        rewardType: r.rewardType as BattlePassRewardType,
        valueInt: r.valueInt,
        valueString: r.valueString,
      },
    });
  }

  // Copiar misiones
  for (const m of current.missions) {
    await prisma.battlePassMission.create({
      data: {
        seasonId: next.id,
        type: m.type as BattlePassMissionType,
        target: m.target,
        xpReward: m.xpReward,
        difficulty: m.difficulty as BattlePassMissionDifficulty,
      },
    });
  }
};

/**
 * Actualiza las recompensas de la temporada actual si tiene las recompensas antiguas (50 de oro en todos los niveles).
 * También elimina cualquier recompensa duplicada.
 * Esta función SIEMPRE limpia duplicados si los detecta, sin importar el tipo de recompensa.
 */
export const updateCurrentSeasonRewards = async (prisma: PrismaClient): Promise<void> => {
  const current = await getCurrentSeason(prisma);
  if (!current) return;

  const rewards = current.rewards;
  
  // Verificar si tiene las recompensas antiguas (todos los niveles con 50 de oro)
  const allGold50 = rewards.length === 40
    && rewards.every((r) => r.rewardType === 'GOLD' && r.valueInt === 50);

  // Verificar si hay duplicados (más de 40 recompensas o múltiples recompensas por nivel)
  const rewardsByLevel = new Map<number, number>();
  for (const r of rewards) {
    rewardsByLevel.set(r.level, (rewardsByLevel.get(r.level) || 0) + 1);
  }
  const hasDuplicates = rewards.length > 40 || Array.from(rewardsByLevel.values()).some((count) => count > 1);

  // Si no tiene las recompensas antiguas y no hay duplicados, no hacer nada
  if (!allGold50 && !hasDuplicates) return;

  // Eliminar TODAS las recompensas de la temporada actual
  await prisma.battlePassReward.deleteMany({
    where: { seasonId: current.id },
  });

  // Crear las nuevas recompensas (una por nivel)
  const rewardDistribution = getRewardDistribution();
  for (const reward of rewardDistribution) {
    await prisma.battlePassReward.create({
      data: {
        seasonId: current.id,
        level: reward.level,
        rewardType: reward.type,
        valueInt: reward.valueInt ?? null,
        valueString: reward.valueString ?? null,
      },
    });
  }
};

/**
 * Elimina duplicados de recompensas en la temporada actual.
 * Mantiene solo la primera recompensa de cada nivel.
 */
export const removeDuplicateRewards = async (prisma: PrismaClient): Promise<void> => {
  const current = await getCurrentSeason(prisma);
  if (!current) return;

  const rewards = current.rewards;
  
  // Agrupar recompensas por nivel
  const rewardsByLevel = new Map<number, typeof rewards>();
  for (const r of rewards) {
    if (!rewardsByLevel.has(r.level)) {
      rewardsByLevel.set(r.level, []);
    }
    rewardsByLevel.get(r.level)!.push(r);
  }

  // Encontrar niveles con duplicados
  const levelsWithDuplicates: number[] = [];
  for (const [level, levelRewards] of rewardsByLevel.entries()) {
    if (levelRewards.length > 1) {
      levelsWithDuplicates.push(level);
    }
  }

  // Si no hay duplicados, no hacer nada
  if (levelsWithDuplicates.length === 0) return;

  // Eliminar todas las recompensas duplicadas (mantener solo la primera de cada nivel)
  for (const level of levelsWithDuplicates) {
    const levelRewards = rewardsByLevel.get(level)!;
    // Mantener la primera, eliminar el resto
    const toDelete = levelRewards.slice(1);
    for (const reward of toDelete) {
      await prisma.battlePassReward.delete({
        where: { id: reward.id },
      });
    }
  }
};
