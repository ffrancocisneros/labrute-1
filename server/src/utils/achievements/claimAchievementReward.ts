import { ExpectedError, getRewardTitleName, NotFoundError } from '@labrute/core';
import { AchievementRewardType, PrismaClient } from '@labrute/prisma';
import { createGoldTransaction } from '../createGoldTransaction.js';

/**
 * Reclama la recompensa de un logro permanente
 */
export const claimAchievementReward = async (
  prisma: PrismaClient,
  userId: string,
  achievementId: string,
): Promise<{ gold?: number; title?: string; cosmetic?: string }> => {
  const achievement = await prisma.permanentAchievement.findFirst({
    where: { id: achievementId, userId },
  });

  if (!achievement) {
    throw new NotFoundError('Logro no encontrado');
  }

  if (!achievement.completed) {
    throw new ExpectedError('El logro no está completado');
  }

  if (achievement.claimed) {
    throw new ExpectedError('La recompensa ya fue reclamada');
  }

  const result: { gold?: number; title?: string; cosmetic?: string } = {};

  if (achievement.rewardType === AchievementRewardType.GOLD) {
    await prisma.user.update({
      where: { id: userId },
      data: { gold: { increment: achievement.rewardValue } },
    });
    result.gold = achievement.rewardValue;

    // Crear transacción de oro
    createGoldTransaction(prisma, {
      userId,
      amount: achievement.rewardValue,
      source: 'achievement',
      sourceData: JSON.stringify({ achievementType: achievement.type, level: achievement.level }),
    });
  } else if (achievement.rewardType === AchievementRewardType.TITLE) {
    const titleId = achievement.rewardValue;
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
  } else if (achievement.rewardType === AchievementRewardType.COSMETIC) {
    result.cosmetic = `Cosmético ${achievement.rewardValue}`;
  }

  await prisma.permanentAchievement.update({
    where: { id: achievementId },
    data: { claimed: true, claimedAt: new Date(), updatedAt: new Date() },
  });

  return result;
};
