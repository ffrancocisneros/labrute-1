import { AchievementType, PrismaClient } from '@labrute/prisma';
import { FightStep, StepType } from '@labrute/core';

/**
 * Actualiza el progreso de un logro permanente específico (suma el amount)
 */
export const updateAchievementProgress = async (
  prisma: PrismaClient,
  userId: string,
  type: AchievementType,
  amount: number,
): Promise<void> => {
  // Obtener todos los logros de este tipo que no estén completados
  const achievements = await prisma.permanentAchievement.findMany({
    where: {
      userId,
      type,
      completed: false,
    },
  });

  // Actualizar el progreso de cada logro
  for (const achievement of achievements) {
    const newProgress = Math.min(achievement.progress + amount, achievement.target);
    const isCompleted = newProgress >= achievement.target;

    await prisma.permanentAchievement.update({
      where: { id: achievement.id },
      data: {
        progress: newProgress,
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });
  }
};

/**
 * Actualiza el progreso de un logro que requiere el máximo de un solo bruto
 * (por ejemplo, WIN_FIGHTS_SINGLE_BRUTE, COMPLETE_FIGHTS_SINGLE_BRUTE)
 */
export const updateAchievementProgressSingleBrute = async (
  prisma: PrismaClient,
  userId: string,
  type: AchievementType,
  getValue: (brute: { victories?: number; losses?: number }) => number,
): Promise<void> => {
  // Obtener todos los brutes del usuario con sus estadísticas
  const brutes = await prisma.brute.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    select: {
      victories: true,
      losses: true,
    },
  });

  // Calcular el máximo valor entre todos los brutes
  const maxValue = brutes.length > 0
    ? Math.max(...brutes.map((brute) => getValue(brute)))
    : 0;

  // Obtener todos los logros de este tipo que no estén completados
  const achievements = await prisma.permanentAchievement.findMany({
    where: {
      userId,
      type,
      completed: false,
    },
  });

  // Actualizar el progreso de cada logro con el máximo valor
  for (const achievement of achievements) {
    const newProgress = Math.min(maxValue, achievement.target);
    const isCompleted = newProgress >= achievement.target;

    await prisma.permanentAchievement.update({
      where: { id: achievement.id },
      data: {
        progress: newProgress,
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });
  }
};

/**
 * Actualiza el progreso del logro de racha de victorias (máxima racha individual del bruto)
 */
export const updateWinStreakAchievement = async (
  prisma: PrismaClient,
  userId: string,
): Promise<void> => {
  // Nueva lógica (O(#brutes)): usar campos incrementales en Brute
  const agg = await prisma.brute.aggregate({
    where: { userId, deletedAt: null },
    _max: { winStreakMax: true },
  });

  const maxStreak = agg._max.winStreakMax ?? 0;

  // Obtener todos los logros de este tipo que no estén completados
  const achievements = await prisma.permanentAchievement.findMany({
    where: {
      userId,
      type: AchievementType.WIN_STREAK,
      completed: false,
    },
  });

  // Actualizar el progreso de cada logro con la racha máxima
  for (const achievement of achievements) {
    const newProgress = Math.min(maxStreak, achievement.target);
    const isCompleted = newProgress >= achievement.target;

    await prisma.permanentAchievement.update({
      where: { id: achievement.id },
      data: {
        progress: newProgress,
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });
  }
};

/**
 * Calcula el daño total causado por un bruto en una pelea
 */
const calculateBruteDamageInFight = (
  steps: FightStep[],
  bruteId: string,
  fighters: Array<{ id: string; index: number }>,
): number => {
  // Encontrar el índice del bruto en los fighters
  const bruteFighter = fighters.find((f) => f.id === bruteId);
  if (!bruteFighter) {
    return 0;
  }

  let totalDamage = 0;

  // Recorrer todos los pasos y sumar el daño causado por este brute
  for (const step of steps) {
    // Tipos de pasos que causan daño
    if (
      step.a === StepType.Hit
      || step.a === StepType.Hammer
      || step.a === StepType.Poison
      || step.a === StepType.Haste
      || step.a === StepType.FlashFlood
    ) {
      // Verificar si el paso tiene el campo 'f' (fighter index) que indica quién causó el daño
      const attackerIndex = 'f' in step ? step.f : undefined;

      if (attackerIndex === bruteFighter.index && 'd' in step && typeof step.d === 'number') {
        totalDamage += step.d;
      }
    }
  }

  return totalDamage;
};

/**
 * Actualiza el progreso del logro de daño total causado
 */
export const updateDamageDealtAchievement = async (
  prisma: PrismaClient,
  userId: string,
  fightId: string,
): Promise<void> => {
  // Obtener la pelea con sus steps y fighters
  const fight = await prisma.fight.findUnique({
    where: { id: fightId },
    select: {
      steps: true,
      fighters: true,
      brute1Id: true,
      brute2Id: true,
    },
  });

  if (!fight) {
    return;
  }

  // Parsear steps y fighters
  const steps = JSON.parse(fight.steps) as FightStep[];
  const fighters = JSON.parse(fight.fighters) as Array<{ id: string; index: number; type?: string }>;

  // Filtrar solo brutes (no pets ni bosses)
  const bruteFighters = fighters.filter((f) => f.type === 'brute' || !f.type);

  // Obtener todos los brutes del usuario que participaron en esta pelea
  const userBrutes = await prisma.brute.findMany({
    where: {
      userId,
      deletedAt: null,
      id: {
        in: [fight.brute1Id, fight.brute2Id].filter(Boolean) as string[],
      },
    },
    select: {
      id: true,
    },
  });

  let totalDamage = 0;

  // Calcular el daño total causado por todos los brutes del usuario
  for (const brute of userBrutes) {
    totalDamage += calculateBruteDamageInFight(steps, brute.id, bruteFighters);
  }

  if (totalDamage > 0) {
    await updateAchievementProgress(prisma, userId, AchievementType.DAMAGE_DEALT_TOTAL, totalDamage);
  }
};

/**
 * Actualiza el progreso del logro de días consecutivos jugando
 */
export const updateConsecutiveDaysAchievement = async (
  prisma: PrismaClient,
  userId: string,
): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Obtener el usuario con su información de días consecutivos
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastFightDate: true,
      consecutiveDaysPlayed: true,
    },
  });

  if (!user) {
    return;
  }

  let newConsecutiveDays = 0;

  if (user.lastFightDate) {
    const lastFightDate = new Date(user.lastFightDate);
    lastFightDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastFightDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Mismo día, mantener la racha
      newConsecutiveDays = user.consecutiveDaysPlayed;
    } else if (daysDiff === 1) {
      // Día siguiente, incrementar la racha
      newConsecutiveDays = user.consecutiveDaysPlayed + 1;
    } else {
      // Más de un día de diferencia, resetear la racha
      newConsecutiveDays = 1;
    }
  } else {
    // Primera pelea
    newConsecutiveDays = 1;
  }

  // Actualizar el usuario
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastFightDate: today,
      consecutiveDaysPlayed: newConsecutiveDays,
    },
  });

  // Obtener todos los logros de este tipo que no estén completados
  const achievements = await prisma.permanentAchievement.findMany({
    where: {
      userId,
      type: AchievementType.DAYS_PLAYED_CONSECUTIVE,
      completed: false,
    },
  });

  // Actualizar el progreso de cada logro
  for (const achievement of achievements) {
    const newProgress = Math.min(newConsecutiveDays, achievement.target);
    const isCompleted = newProgress >= achievement.target;

    await prisma.permanentAchievement.update({
      where: { id: achievement.id },
      data: {
        progress: newProgress,
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });
  }
};
