import { MissionType, PrismaClient } from '@labrute/prisma';
import { FightStep, StepType } from '@labrute/core';

/**
 * Actualiza el progreso de una misión específica
 */
export const updateMissionProgress = async (
  prisma: PrismaClient,
  userId: string,
  type: MissionType,
  amount: number,
): Promise<void> => {
  // Obtener todas las misiones de este tipo que no estén completadas
  const missions = await prisma.mission.findMany({
    where: {
      userId,
      type,
      completed: false,
    },
  });

  // Actualizar el progreso de cada misión
  for (const mission of missions) {
    const newProgress = Math.min(mission.progress + amount, mission.target);
    const isCompleted = newProgress >= mission.target;

    await prisma.mission.update({
      where: { id: mission.id },
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
 * Actualiza el progreso de una misión basada en el máximo valor de un solo bruto
 */
export const updateMissionProgressSingleBrute = async (
  prisma: PrismaClient,
  userId: string,
  type: MissionType,
  getValue: (brute: { victories?: number; losses?: number; level?: number }) => number,
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
      level: true,
    },
  });

  // Calcular el máximo valor entre todos los brutes
  const maxValue = brutes.length > 0
    ? Math.max(...brutes.map((brute) => getValue(brute)))
    : 0;

  // Obtener todas las misiones de este tipo que no estén completadas
  const missions = await prisma.mission.findMany({
    where: {
      userId,
      type,
      completed: false,
    },
  });

  // Actualizar el progreso de cada misión con el máximo valor
  for (const mission of missions) {
    const newProgress = Math.min(maxValue, mission.target);
    const isCompleted = newProgress >= mission.target;

    await prisma.mission.update({
      where: { id: mission.id },
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
 * Actualiza el progreso de misiones de daño causado usando la misma lógica que los logros
 */
export const updateDamageDealtMission = async (
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
    // Encontrar el índice del bruto en los fighters
    const bruteFighter = bruteFighters.find((f) => f.id === brute.id);
    if (!bruteFighter) {
      continue;
    }

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
  }

  if (totalDamage > 0) {
    await updateMissionProgress(prisma, userId, MissionType.DEAL_DAMAGE, totalDamage);
  }
};

/**
 * Actualiza el progreso de misiones de racha de victorias
 */
export const updateWinStreakMission = async (
  prisma: PrismaClient,
  userId: string,
): Promise<void> => {
  // Nueva lógica (O(#brutes)): usar campos incrementales en Brute
  const agg = await prisma.brute.aggregate({
    where: { userId, deletedAt: null },
    _max: { winStreakMax: true },
  });

  const maxStreak = agg._max.winStreakMax ?? 0;

  // Obtener todas las misiones de este tipo que no estén completadas
  const missions = await prisma.mission.findMany({
    where: {
      userId,
      type: MissionType.WIN_FIGHTS_STREAK,
      completed: false,
    },
  });

  // Actualizar el progreso de cada misión con la racha máxima
  for (const mission of missions) {
    const newProgress = Math.min(maxStreak, mission.target);
    const isCompleted = newProgress >= mission.target;

    await prisma.mission.update({
      where: { id: mission.id },
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
 * Actualiza el progreso de TRY_DIFFERENT_SKILLS en forma incremental.
 * En vez de escanear todas las peleas del usuario, inserta skills usadas en esta pelea
 * en una tabla única (userId, skill) y luego usa COUNT(*) como progreso.
 */
export const updateDifferentSkillsMissionIncremental = async (
  prisma: PrismaClient,
  userId: string,
  fightId: string,
): Promise<void> => {
  const fight = await prisma.fight.findUnique({
    where: { id: fightId },
    select: {
      steps: true,
      fighters: true,
      brute1Id: true,
      brute2Id: true,
    },
  });

  if (!fight) return;

  const steps = JSON.parse(fight.steps) as FightStep[];
  const fighters = JSON.parse(fight.fighters) as Array<{ id: string; index: number; type?: string }>;
  const bruteFighters = fighters.filter((f) => f.type === 'brute' || !f.type);

  const fightUserBrutes = await prisma.brute.findMany({
    where: {
      userId,
      deletedAt: null,
      id: {
        in: [fight.brute1Id, fight.brute2Id].filter(Boolean) as string[],
      },
    },
    select: { id: true },
  });

  const fightBruteIds = new Set(fightUserBrutes.map((b) => b.id));
  const fightBruteIndices = new Set(
    bruteFighters.filter((f) => fightBruteIds.has(f.id)).map((f) => f.index),
  );

  const skillsUsedInFight = new Set<string>();
  for (const step of steps) {
    if (step.a === StepType.SkillActivate && 's' in step && step.s) {
      const fighterIndex = 'b' in step ? step.b : undefined;
      if (fighterIndex === undefined || !fightBruteIndices.has(fighterIndex)) continue;

      const skill = step.s as unknown;
      if (skill && typeof skill === 'object' && 'id' in skill) {
        skillsUsedInFight.add(String((skill as { id: string }).id));
      }
    }
  }

  if (skillsUsedInFight.size > 0) {
    await prisma.userUsedSkill.createMany({
      data: Array.from(skillsUsedInFight).map((skill) => ({ userId, skill })),
      skipDuplicates: true,
    });
  }

  const uniqueSkillCount = await prisma.userUsedSkill.count({ where: { userId } });

  const missions = await prisma.mission.findMany({
    where: {
      userId,
      type: MissionType.TRY_DIFFERENT_SKILLS,
      completed: false,
    },
  });

  for (const mission of missions) {
    const newProgress = Math.min(uniqueSkillCount, mission.target);
    const isCompleted = newProgress >= mission.target;
    await prisma.mission.update({
      where: { id: mission.id },
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
 * Actualiza el progreso de misiones de habilidades diferentes usadas
 */
export const updateDifferentSkillsMission = async (
  prisma: PrismaClient,
  userId: string,
  fightId: string,
): Promise<void> => {
  // Obtener todos los brutes del usuario
  const userBrutes = await prisma.brute.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  const bruteIds = new Set(userBrutes.map((b) => b.id));

  // Obtener todas las peleas del usuario para contar habilidades únicas totales
  const allUserFights = await prisma.fight.findMany({
    where: {
      OR: [
        { brute1Id: { in: Array.from(bruteIds) } },
        { brute2Id: { in: Array.from(bruteIds) } },
      ],
    },
    select: {
      steps: true,
      fighters: true,
      brute1Id: true,
      brute2Id: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Contar todas las habilidades únicas usadas en todas las peleas
  const allUniqueSkills = new Set<string>();

  for (const userFight of allUserFights) {
    const fightSteps = JSON.parse(userFight.steps) as FightStep[];
    const fightFighters = JSON.parse(userFight.fighters) as Array<{ id: string; index: number; type?: string }>;
    const fightBruteFighters = fightFighters.filter((f) => f.type === 'brute' || !f.type);

    // Obtener los índices de los brutes del usuario en esta pelea
    const fightUserBrutes = await prisma.brute.findMany({
      where: {
        userId,
        deletedAt: null,
        id: {
          in: [userFight.brute1Id, userFight.brute2Id].filter(Boolean) as string[],
        },
      },
      select: { id: true },
    });

    const fightBruteIds = new Set(fightUserBrutes.map((b) => b.id));
    const fightBruteIndices = new Set(
      fightBruteFighters.filter((f) => fightBruteIds.has(f.id)).map((f) => f.index),
    );

    // Extraer habilidades usadas en esta pelea
    for (const step of fightSteps) {
      if (step.a === StepType.SkillActivate && 's' in step && step.s) {
        const skill = step.s as unknown;
        const fighterIndex = 'b' in step ? step.b : undefined;

        // El skill es un SkillId que tiene una propiedad id
        let skillName: string | undefined;
        if (skill && typeof skill === 'object' && 'id' in skill) {
          skillName = String((skill as { id: string }).id);
        }

        if (fighterIndex !== undefined && fightBruteIndices.has(fighterIndex) && skillName) {
          allUniqueSkills.add(skillName);
        }
      }
    }
  }

  // Obtener todas las misiones de este tipo que no estén completadas
  const missions = await prisma.mission.findMany({
    where: {
      userId,
      type: MissionType.TRY_DIFFERENT_SKILLS,
      completed: false,
    },
  });

  // Actualizar el progreso de cada misión con el número de habilidades únicas
  for (const mission of missions) {
    const newProgress = Math.min(allUniqueSkills.size, mission.target);
    const isCompleted = newProgress >= mission.target;

    await prisma.mission.update({
      where: { id: mission.id },
      data: {
        progress: newProgress,
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });
  }
};
