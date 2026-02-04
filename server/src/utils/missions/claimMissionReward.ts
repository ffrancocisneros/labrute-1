import { ExpectedError, getRewardTitleName, NotFoundError } from '@labrute/core';
import { MissionRewardType, PrismaClient } from '@labrute/prisma';
import { createGoldTransaction } from '../createGoldTransaction.js';

/**
 * Reclama la recompensa de una misión completada
 */
export const claimMissionReward = async (
  prisma: PrismaClient,
  userId: string,
  missionId: string,
): Promise<{ gold?: number; title?: string }> => {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, userId },
  });

  if (!mission) {
    throw new NotFoundError('Misión no encontrada');
  }

  if (!mission.completed) {
    throw new ExpectedError('La misión no está completada');
  }

  if (mission.claimed) {
    throw new ExpectedError('La recompensa ya fue reclamada');
  }

  const result: { gold?: number; title?: string } = {};

  if (mission.rewardType === MissionRewardType.GOLD) {
    await prisma.user.update({
      where: { id: userId },
      data: { gold: { increment: mission.rewardValue } },
    });
    result.gold = mission.rewardValue;

    // Crear transacción de oro
    createGoldTransaction(prisma, {
      userId,
      amount: mission.rewardValue,
      source: 'mission',
      sourceData: JSON.stringify({ missionType: mission.type, category: mission.category }),
    });
  } else if (mission.rewardType === MissionRewardType.TITLE) {
    const titleId = mission.rewardValue;
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

  await prisma.mission.update({
    where: { id: mission.id },
    data: { claimed: true, claimedAt: new Date(), updatedAt: new Date() },
  });

  return result;
};
