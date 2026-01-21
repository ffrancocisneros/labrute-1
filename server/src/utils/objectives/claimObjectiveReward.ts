import { ObjectiveRewardType, PrismaClient } from '@labrute/prisma';
import { ExpectedError } from '@labrute/core';

/**
 * Reclama la recompensa de un objetivo diario completado
 */
export const claimDailyObjectiveReward = async (
  prisma: PrismaClient,
  userId: string,
  objectiveId: string,
): Promise<{ gold?: number; title?: string }> => {
  const objective = await prisma.dailyObjective.findFirst({
    where: {
      id: objectiveId,
      userId,
      completed: true,
    },
  });

  if (!objective) {
    throw new ExpectedError('Objective not found or not completed');
  }

  // Verificar si ya se reclamó
  // Nota: completedAt indica cuándo se completó, NO cuándo se reclamó.
  if (objective.claimed || objective.claimedAt) {
    throw new ExpectedError('Reward already claimed');
  }

  const result: { gold?: number; title?: string } = {};

  if (objective.rewardType === ObjectiveRewardType.GOLD) {
    // Dar oro al usuario
    await prisma.user.update({
      where: { id: userId },
      data: {
        gold: { increment: objective.rewardValue },
      },
    });
    result.gold = objective.rewardValue;
  } else if (objective.rewardType === ObjectiveRewardType.TITLE) {
    // TODO: Implementar sistema de títulos exclusivos
    // Por ahora, solo retornamos el ID del título
    result.title = `title_${objective.rewardValue}`;
  }

  // Marcar como reclamado
  await prisma.dailyObjective.update({
    where: { id: objective.id },
    data: {
      claimed: true,
      claimedAt: new Date(),
    },
  });

  return result;
};

/**
 * Reclama la recompensa de un objetivo semanal completado
 */
export const claimWeeklyObjectiveReward = async (
  prisma: PrismaClient,
  userId: string,
  objectiveId: string,
): Promise<{ gold?: number; title?: string }> => {
  const objective = await prisma.weeklyObjective.findFirst({
    where: {
      id: objectiveId,
      userId,
      completed: true,
    },
  });

  if (!objective) {
    throw new ExpectedError('Objective not found or not completed');
  }

  // Verificar si ya se reclamó
  // Nota: completedAt indica cuándo se completó, NO cuándo se reclamó.
  if (objective.claimed || objective.claimedAt) {
    throw new ExpectedError('Reward already claimed');
  }

  const result: { gold?: number; title?: string } = {};

  if (objective.rewardType === ObjectiveRewardType.GOLD) {
    // Dar oro al usuario
    await prisma.user.update({
      where: { id: userId },
      data: {
        gold: { increment: objective.rewardValue },
      },
    });
    result.gold = objective.rewardValue;
  } else if (objective.rewardType === ObjectiveRewardType.TITLE) {
    // TODO: Implementar sistema de títulos exclusivos
    result.title = `title_${objective.rewardValue}`;
  }

  // Marcar como reclamado
  await prisma.weeklyObjective.update({
    where: { id: objective.id },
    data: {
      claimed: true,
      claimedAt: new Date(),
    },
  });

  return result;
};
