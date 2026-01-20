import type { PrismaClient } from '@labrute/prisma';

/**
 * Calcula la racha máxima de victorias entre todos los brutos del usuario.
 */
export const getMaxWinStreakForUser = async (
  prisma: PrismaClient,
  userId: string,
): Promise<number> => {
  const brutes = await prisma.brute.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, name: true },
  });

  let maxStreak = 0;

  for (const brute of brutes) {
    const fights = await prisma.fight.findMany({
      where: {
        OR: [{ brute1Id: brute.id }, { brute2Id: brute.id }],
      },
      orderBy: { date: 'asc' },
      select: { winner: true },
    });

    let current = 0;
    for (const f of fights) {
      if (f.winner === brute.name) {
        current++;
        maxStreak = Math.max(maxStreak, current);
      } else {
        current = 0;
      }
    }
  }

  return maxStreak;
};
