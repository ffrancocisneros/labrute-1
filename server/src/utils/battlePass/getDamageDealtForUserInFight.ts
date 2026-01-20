import { FightStep, StepType } from '@labrute/core';
import type { PrismaClient } from '@labrute/prisma';

/**
 * Calcula el daño total causado por los brutes del usuario en una pelea.
 */
export const getDamageDealtForUserInFight = async (
  prisma: PrismaClient,
  userId: string,
  fightId: string,
): Promise<number> => {
  const fight = await prisma.fight.findUnique({
    where: { id: fightId },
    select: {
      steps: true,
      fighters: true,
      brute1Id: true,
      brute2Id: true,
    },
  });

  if (!fight) return 0;

  const steps = JSON.parse(fight.steps) as FightStep[];
  const fighters = JSON.parse(fight.fighters) as Array<{ id: string; index: number; type?: string }>;
  const bruteFighters = fighters.filter((f) => f.type === 'brute' || !f.type);

  const userBrutes = await prisma.brute.findMany({
    where: {
      userId,
      deletedAt: null,
      id: { in: [fight.brute1Id, fight.brute2Id].filter(Boolean) as string[] },
    },
    select: { id: true },
  });

  let total = 0;
  for (const brute of userBrutes) {
    const bf = bruteFighters.find((f) => f.id === brute.id);
    if (!bf) continue;
    for (const step of steps) {
      if (
        step.a === StepType.Hit
        || step.a === StepType.Hammer
        || step.a === StepType.Poison
        || step.a === StepType.Haste
        || step.a === StepType.FlashFlood
      ) {
        const attackerIndex = 'f' in step ? step.f : undefined;
        if (attackerIndex === bf.index && 'd' in step && typeof step.d === 'number') {
          total += step.d;
        }
      }
    }
  }
  return total;
};
