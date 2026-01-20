import { BattlePassMissionType, type PrismaClient } from '@labrute/prisma';
import { getCurrentSeason } from './getCurrentSeason.js';
import { getDamageDealtForUserInFight } from './getDamageDealtForUserInFight.js';
import { getMaxWinStreakForUser } from './getMaxWinStreakForUser.js';

/**
 * Suma XP al progreso del pase de batalla del usuario en la temporada actual.
 */
export const addXp = async (
  prisma: PrismaClient,
  userId: string,
  amount: number,
): Promise<void> => {
  if (amount <= 0) return;
  const season = await getCurrentSeason(prisma);
  if (!season) return;

  await prisma.userBattlePassProgress.upsert({
    where: {
      userId_seasonId: { userId, seasonId: season.id },
    },
    create: {
      userId,
      seasonId: season.id,
      totalXp: amount,
    },
    update: {
      totalXp: { increment: amount },
    },
  });
};

export interface AddMissionProgressOptions {
  /** Para WIN_STREAK: en vez de sumar, usar progress = max(progress, amount) */
  setMax?: boolean;
}

/**
 * Actualiza el progreso de misiones del pase. Si una misión llega al target, se concede su xpReward.
 */
export const addMissionProgress = async (
  prisma: PrismaClient,
  userId: string,
  type: BattlePassMissionType,
  amount: number,
  options: AddMissionProgressOptions = {},
): Promise<void> => {
  if (amount <= 0 && !options.setMax) return;
  const season = await getCurrentSeason(prisma);
  if (!season) return;

  const typeStr = type as string;
  const missions = season.missions.filter((m) => m.type === typeStr);
  if (missions.length === 0) return;

  for (const mission of missions) {
    if (options.setMax) {
      const cur = await prisma.userBattlePassMissionProgress.findUnique({
        where: { userId_missionId: { userId, missionId: mission.id } },
      });
      const prev = cur?.progress ?? 0;
      const newProgress = Math.min(Math.max(prev, amount), mission.target);
      const wasCompleted = !!cur?.completedAt;

      await prisma.userBattlePassMissionProgress.upsert({
        where: { userId_missionId: { userId, missionId: mission.id } },
        create: {
          userId,
          missionId: mission.id,
          progress: newProgress,
          completedAt: newProgress >= mission.target ? new Date() : null,
        },
        update: {
          progress: newProgress,
          completedAt: newProgress >= mission.target ? new Date() : undefined,
        },
      });
      if (newProgress >= mission.target && !wasCompleted) {
        await addXp(prisma, userId, mission.xpReward);
      }
      continue;
    }

    // Acumular: progress += amount, cap at target
    const cur = await prisma.userBattlePassMissionProgress.findUnique({
      where: { userId_missionId: { userId, missionId: mission.id } },
    });
    const prev = cur?.progress ?? 0;
    const added = Math.min(amount, Math.max(0, mission.target - prev));
    const newProgress = prev + added;
    const wasCompleted = !!cur?.completedAt;

    await prisma.userBattlePassMissionProgress.upsert({
      where: { userId_missionId: { userId, missionId: mission.id } },
      create: {
        userId,
        missionId: mission.id,
        progress: newProgress,
        completedAt: newProgress >= mission.target ? new Date() : null,
      },
      update: {
        progress: newProgress,
        completedAt: newProgress >= mission.target ? new Date() : undefined,
      },
    });
    if (newProgress >= mission.target && !wasCompleted) {
      await addXp(prisma, userId, mission.xpReward);
    }
  }
};

export interface AddMissionProgressFromFightOptions {
  damage?: boolean;
  winStreak?: boolean;
}

/**
 * Actualiza misiones del pase que dependen de datos de la pelea: DEAL_DAMAGE, WIN_STREAK.
 */
export const addMissionProgressFromFight = async (
  prisma: PrismaClient,
  userId: string,
  fightId: string,
  opts: AddMissionProgressFromFightOptions = {},
): Promise<void> => {
  const season = await getCurrentSeason(prisma);
  if (!season) return;

  if (opts.damage) {
    const damage = await getDamageDealtForUserInFight(prisma, userId, fightId);
    if (damage > 0) {
      await addMissionProgress(prisma, userId, BattlePassMissionType.DEAL_DAMAGE, damage);
    }
  }

  if (opts.winStreak) {
    const maxStreak = await getMaxWinStreakForUser(prisma, userId);
    if (maxStreak > 0) {
      await addMissionProgress(prisma, userId, BattlePassMissionType.WIN_STREAK, maxStreak, { setMax: true });
    }
  }
};
