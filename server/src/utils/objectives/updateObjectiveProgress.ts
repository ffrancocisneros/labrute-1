import { ObjectiveType, PrismaClient } from '@labrute/prisma';
import dayjs from 'dayjs';
import { generateDailyObjectives } from './generateObjectives.js';
import { getWeekStart } from './generateObjectives.js';

/**
 * Actualiza el progreso de un objetivo diario
 */
export const updateDailyObjectiveProgress = async (
  prisma: PrismaClient,
  userId: string,
  type: ObjectiveType,
  amount: number = 1,
): Promise<void> => {
  const today = dayjs().startOf('day').toDate();

  // Asegurar que existan objetivos diarios para hoy
  await generateDailyObjectives(prisma, userId, today);

  // Buscar objetivos diarios activos (no completados) del tipo especificado
  const objectives = await prisma.dailyObjective.findMany({
    where: {
      userId,
      type,
      date: today,
      completed: false,
    },
  });

  for (const objective of objectives) {
    const newProgress = Math.min(objective.progress + amount, objective.target);

    await prisma.dailyObjective.update({
      where: { id: objective.id },
      data: {
        progress: newProgress,
        completed: newProgress >= objective.target,
        completedAt: newProgress >= objective.target ? new Date() : undefined,
      },
    });
  }
};

/**
 * Actualiza el progreso de un objetivo semanal
 */
export const updateWeeklyObjectiveProgress = async (
  prisma: PrismaClient,
  userId: string,
  type: ObjectiveType,
  amount: number = 1,
): Promise<void> => {
  const weekStart = getWeekStart();

  // Asegurar que existan objetivos semanales para esta semana
  const { generateWeeklyObjectives } = await import('./generateObjectives.js');
  await generateWeeklyObjectives(prisma, userId, weekStart);

  // Buscar objetivos semanales activos (no completados) del tipo especificado
  const objectives = await prisma.weeklyObjective.findMany({
    where: {
      userId,
      type,
      weekStart,
      completed: false,
    },
  });

  for (const objective of objectives) {
    const newProgress = Math.min(objective.progress + amount, objective.target);

    await prisma.weeklyObjective.update({
      where: { id: objective.id },
      data: {
        progress: newProgress,
        completed: newProgress >= objective.target,
        completedAt: newProgress >= objective.target ? new Date() : undefined,
      },
    });
  }
};
