import { ObjectiveRewardType, ObjectiveType, PrismaClient } from '@labrute/prisma';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';

dayjs.extend(isoWeek);

export interface ObjectiveConfig {
  type: ObjectiveType;
  target: number;
  rewardType: ObjectiveRewardType;
  rewardValue: number;
}

// Configuraciones de objetivos diarios (más generales)
const DAILY_OBJECTIVE_CONFIGS: ObjectiveConfig[] = [
  { type: ObjectiveType.WIN_FIGHTS, target: 5, rewardType: ObjectiveRewardType.GOLD, rewardValue: 10 },
  { type: ObjectiveType.WIN_FIGHTS, target: 10, rewardType: ObjectiveRewardType.GOLD, rewardValue: 25 },
  { type: ObjectiveType.COMPLETE_FIGHTS, target: 12, rewardType: ObjectiveRewardType.GOLD, rewardValue: 15 },
  { type: ObjectiveType.COMPLETE_SPECIAL_FIGHTS, target: 3, rewardType: ObjectiveRewardType.GOLD, rewardValue: 30 },
  { type: ObjectiveType.LEVEL_UP, target: 1, rewardType: ObjectiveRewardType.GOLD, rewardValue: 20 },
  { type: ObjectiveType.WIN_TOURNAMENT, target: 1, rewardType: ObjectiveRewardType.GOLD, rewardValue: 50 },
  { type: ObjectiveType.WIN_SPECIAL_TOURNAMENT, target: 1, rewardType: ObjectiveRewardType.GOLD, rewardValue: 75 },
];

// Configuraciones de objetivos semanales (más generales)
const WEEKLY_OBJECTIVE_CONFIGS: ObjectiveConfig[] = [
  { type: ObjectiveType.WIN_FIGHTS, target: 50, rewardType: ObjectiveRewardType.GOLD, rewardValue: 100 },
  { type: ObjectiveType.WIN_FIGHTS, target: 100, rewardType: ObjectiveRewardType.GOLD, rewardValue: 250 },
  { type: ObjectiveType.COMPLETE_FIGHTS, target: 150, rewardType: ObjectiveRewardType.GOLD, rewardValue: 150 },
  { type: ObjectiveType.COMPLETE_SPECIAL_FIGHTS, target: 9, rewardType: ObjectiveRewardType.GOLD, rewardValue: 100 },
  { type: ObjectiveType.LEVEL_UP, target: 3, rewardType: ObjectiveRewardType.GOLD, rewardValue: 75 },
  { type: ObjectiveType.WIN_TOURNAMENT, target: 3, rewardType: ObjectiveRewardType.GOLD, rewardValue: 200 },
  { type: ObjectiveType.WIN_SPECIAL_TOURNAMENT, target: 5, rewardType: ObjectiveRewardType.GOLD, rewardValue: 300 },
  { type: ObjectiveType.GAIN_XP, target: 1000, rewardType: ObjectiveRewardType.GOLD, rewardValue: 125 },
];

/**
 * Obtiene el inicio de la semana (lunes)
 */
export const getWeekStart = (date: Date = new Date()): Date => {
  return dayjs(date).startOf('isoWeek').toDate();
};

/**
 * Genera objetivos diarios para un usuario si no existen para la fecha actual
 */
export const generateDailyObjectives = async (
  prisma: PrismaClient,
  userId: string,
  date: Date = new Date(),
): Promise<void> => {
  const dateOnly = dayjs(date).startOf('day').toDate();

  // Obtener objetivos existentes para esta fecha
  const existing = await prisma.dailyObjective.findMany({
    where: {
      userId,
      date: dateOnly,
    },
    select: { type: true },
  });

  // Si ya hay 2 o más objetivos, no generar más
  if (existing.length >= 2) {
    return;
  }

  // Obtener tipos ya existentes para evitar duplicados
  const existingTypes = new Set(existing.map((e) => e.type));

  // Seleccionar 2-3 objetivos aleatorios (un solo config por type: el índice único es userId+type+date)
  const available = DAILY_OBJECTIVE_CONFIGS.filter((c) => !existingTypes.has(c.type));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const toCreate = Math.min(3 - existing.length, shuffled.length);

  const selected: ObjectiveConfig[] = [];
  const seenTypes = new Set<ObjectiveType>();
  for (const config of shuffled) {
    if (seenTypes.has(config.type)) continue;
    seenTypes.add(config.type);
    selected.push(config);
    if (selected.length >= toCreate) break;
  }

  if (selected.length > 0) {
    await prisma.dailyObjective.createMany({
      data: selected.map((config) => ({
        userId,
        type: config.type,
        target: config.target,
        rewardType: config.rewardType,
        rewardValue: config.rewardValue,
        date: dateOnly,
      })),
      skipDuplicates: true,
    });
  }
};

/**
 * Genera objetivos semanales para un usuario si no existen para la semana actual
 */
export const generateWeeklyObjectives = async (
  prisma: PrismaClient,
  userId: string,
  weekStart: Date = getWeekStart(),
): Promise<void> => {
  const weekStartOnly = dayjs(weekStart).startOf('day').toDate();

  // Obtener objetivos existentes para esta semana
  const existing = await prisma.weeklyObjective.findMany({
    where: {
      userId,
      weekStart: weekStartOnly,
    },
    select: { type: true },
  });

  // Si ya hay 2 o más objetivos, no generar más
  if (existing.length >= 2) {
    return;
  }

  // Obtener tipos ya existentes para evitar duplicados
  const existingTypes = new Set(existing.map((e) => e.type));

  // Seleccionar 2-3 objetivos aleatorios (un solo config por type: el índice único es userId+type+weekStart)
  const available = WEEKLY_OBJECTIVE_CONFIGS.filter((c) => !existingTypes.has(c.type));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const toCreate = Math.min(3 - existing.length, shuffled.length);

  const selected: ObjectiveConfig[] = [];
  const seenTypes = new Set<ObjectiveType>();
  for (const config of shuffled) {
    if (seenTypes.has(config.type)) continue;
    seenTypes.add(config.type);
    selected.push(config);
    if (selected.length >= toCreate) break;
  }

  if (selected.length > 0) {
    await prisma.weeklyObjective.createMany({
      data: selected.map((config) => ({
        userId,
        type: config.type,
        target: config.target,
        rewardType: config.rewardType,
        rewardValue: config.rewardValue,
        weekStart: weekStartOnly,
      })),
      skipDuplicates: true,
    });
  }
};
