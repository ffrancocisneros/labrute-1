import { ObjectiveRewardType, PrismaClient } from '@labrute/prisma';
import { ExpectedError, getRewardTitleName } from '@labrute/core';
import { createGoldTransaction } from '../createGoldTransaction.js';

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

    // Crear transacción de oro
    createGoldTransaction(prisma, {
      userId,
      amount: objective.rewardValue,
      source: 'daily_objective',
      sourceData: JSON.stringify({ objectiveType: objective.type }),
    });
  } else if (objective.rewardType === ObjectiveRewardType.TITLE) {
    // Desbloquear título exclusivo
    const titleId = objective.rewardValue;
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { unlockedTitleIds: true },
    });
    const ids = u?.unlockedTitleIds ?? [];
    if (!ids.includes(titleId)) {
      await prisma.user.update({
        where: { id: userId },
        data: { unlockedTitleIds: [...ids, titleId] },
      });
    }
    result.title = getRewardTitleName(titleId) ?? `Título ${titleId}`;
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

    // Crear transacción de oro
    createGoldTransaction(prisma, {
      userId,
      amount: objective.rewardValue,
      source: 'weekly_objective',
      sourceData: JSON.stringify({ objectiveType: objective.type }),
    });
  } else if (objective.rewardType === ObjectiveRewardType.TITLE) {
    // Desbloquear título exclusivo
    const titleId = objective.rewardValue;
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { unlockedTitleIds: true },
    });
    const ids = u?.unlockedTitleIds ?? [];
    if (!ids.includes(titleId)) {
      await prisma.user.update({
        where: { id: userId },
        data: { unlockedTitleIds: [...ids, titleId] },
      });
    }
    result.title = getRewardTitleName(titleId) ?? `Título ${titleId}`;
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
