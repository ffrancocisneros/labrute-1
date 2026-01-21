import {
  canLevelUp,
  getCalculatedBrute,
  getFightsLeft,
  isWinner,
  randomBetween,
  FightLogTemplateCount,
} from '@labrute/core';
import {
  Brute,
  FightModifier,
  LogType,
  PrismaClient,
} from '@labrute/prisma';
import { enrichCalculatedBruteWithTemporary } from './enrichCalculatedBruteWithTemporary.js';
import { getOpponents } from './getOpponents.js';
import { generateFight } from '../fight/generateFight.js';
import { ServerState } from '../ServerState.js';
import { ilike } from '../ilike.js';
import { getXPNeeded } from '@labrute/core';

export interface AutoFightResult {
  fightsCompleted: number;
  fightsLeft: number;
  canLevelUp: boolean;
  stopped: boolean;
  reason?: string;
}

/**
 * Ejecuta peleas automáticas para un bruto
 * Similar a la lógica de scripts/autoFightBot.ts pero integrada
 */
export const executeAutoFights = async (
  prisma: PrismaClient,
  bruteId: string,
): Promise<AutoFightResult> => {
  // Obtener el bruto completo con todos los campos necesarios
  let brute = await prisma.brute.findFirst({
    where: {
      id: bruteId,
      deletedAt: null,
    },
  });

  if (!brute) {
    throw new Error('Brute not found');
  }

  // Obtener modificadores actuales
  const modifiers = await ServerState.getModifiers(prisma);

  // Obtener bruto calculado
  const calculatedBrute = getCalculatedBrute(brute, modifiers);

  // Verificar si puede subir de nivel
  if (canLevelUp(calculatedBrute)) {
    return {
      fightsCompleted: 0,
      fightsLeft: getFightsLeft(calculatedBrute, modifiers),
      canLevelUp: true,
      stopped: true,
      reason: 'canLevelUp',
    };
  }

  // Obtener peleas disponibles
  let fightsLeft = getFightsLeft(calculatedBrute, modifiers);

  if (fightsLeft <= 0) {
    return {
      fightsCompleted: 0,
      fightsLeft: 0,
      canLevelUp: false,
      stopped: true,
      reason: 'noFightsLeft',
    };
  }

  // Siempre obtener nuevos oponentes (más simple y rápido)
  let opponents: Awaited<ReturnType<typeof getOpponents>> = await getOpponents(prisma, brute);
  
  // Guardar oponentes
  if (opponents.length > 0) {
    await prisma.brute.update({
      where: { id: brute.id },
      data: {
        opponents: {
          set: opponents.map((o) => ({ id: o.id })),
        },
        opponentsGeneratedAt: new Date(),
      },
    });
  }

  if (opponents.length === 0) {
    return {
      fightsCompleted: 0,
      fightsLeft,
      canLevelUp: false,
      stopped: true,
      reason: 'noOpponents',
    };
  }

  // Pelear hasta agotar las peleas disponibles
  let currentFightsLeft = fightsLeft;
  let fightsCompleted = 0;

  while (currentFightsLeft > 0) {
    // Si no hay oponentes disponibles, obtener nuevos
    if (opponents.length === 0) {
      if (!brute) {
        break;
      }
      const newOpponents = await getOpponents(prisma, brute);
      
      if (newOpponents.length === 0) {
        break;
      }

      // Actualizar oponentes
      await prisma.brute.update({
        where: { id: brute.id },
        data: {
          opponents: {
            set: newOpponents.map((o) => ({ id: o.id })),
          },
          opponentsGeneratedAt: new Date(),
        },
      });

      opponents = newOpponents;
    }

    // Seleccionar un oponente aleatorio
    const randomIndex = Math.floor(Math.random() * opponents.length);
    const opponent = opponents[randomIndex];

    if (!opponent) {
      opponents = opponents.filter((o, i) => i !== randomIndex);
      continue;
    }

    try {
      // Obtener el bruto actualizado antes de pelear (necesario para verificar estado actual)
      if (!brute) {
        break;
      }
      
      const updatedBrute: Awaited<ReturnType<typeof prisma.brute.findFirst>> = await prisma.brute.findFirst({
        where: {
          id: brute.id,
          deletedAt: null,
        },
      });

      if (!updatedBrute) {
        break;
      }

      // Verificar nuevamente si puede subir de nivel
      const updatedCalculatedBrute = getCalculatedBrute(updatedBrute, modifiers);

      if (canLevelUp({ level: updatedBrute.level, xp: updatedBrute.xp })) {
        return {
          fightsCompleted,
          fightsLeft: getFightsLeft(updatedCalculatedBrute, modifiers),
          canLevelUp: true,
          stopped: true,
          reason: 'canLevelUp',
        };
      }

      // Verificar peleas restantes
      const updatedFightsLeft = getFightsLeft(updatedCalculatedBrute, modifiers);
      if (updatedFightsLeft <= 0) {
        break;
      }

      // Actualizar currentFightsLeft con el valor real
      currentFightsLeft = updatedFightsLeft;

      // Obtener el oponente completo de la base de datos
      const opponentBrute = await prisma.brute.findFirst({
        where: {
          name: ilike(opponent.name),
          deletedAt: null,
        },
      });

      if (!opponentBrute) {
        opponents = opponents.filter((o) => o.id !== opponent.id);
        continue;
      }

      // Generar la pelea (incluir habilidades temporales, p. ej. del pase)
      const opponentCalculatedBrute = getCalculatedBrute(opponentBrute, modifiers);
      await enrichCalculatedBruteWithTemporary(prisma, updatedCalculatedBrute);
      await enrichCalculatedBruteWithTemporary(prisma, opponentCalculatedBrute);
      const fightData = await generateFight({
        prisma,
        team1: { brutes: [updatedCalculatedBrute] },
        team2: { brutes: [opponentCalculatedBrute] },
        modifiers,
        backups: !updatedBrute.eventId,
        achievements: true,
      });

      // Guardar la pelea
      const fight = await prisma.fight.create({
        data: fightData.data,
      });

      // Determinar ganador
      const brute1Won = isWinner(updatedBrute, fightData.data);
      
      // Calcular XP ganado
      const levelDifference = updatedBrute.level - opponentBrute.level;
      const event = await ServerState.getCurrentEvent(prisma);
      
      let xpGained = brute1Won
        ? updatedBrute.eventId
          ? updatedBrute.level >= (event?.maxLevel ?? 999)
            ? 0
            : getXPNeeded(updatedBrute.level + 1)
          : levelDifference > 10 ? 0 : levelDifference > 2 ? 1 : 2
        : updatedBrute.eventId
          ? updatedBrute.level >= (event?.maxLevel ?? 999)
            ? 0
            : Math.ceil(getXPNeeded(updatedBrute.level + 1) / 2)
          : levelDifference > 10 ? 0 : 1;

      // Double XP modifier
      if (modifiers[FightModifier.doubleXP]) {
        xpGained *= 2;
      }

      // Obtener userId antes de actualizar
      const bruteWithUser = await prisma.brute.findFirst({
        where: { id: updatedBrute.id },
        select: { userId: true },
      });

      // Actualizar bruto
      const updatedBruteAfterFight: Awaited<ReturnType<typeof prisma.brute.update>> = await prisma.brute.update({
        where: { id: updatedBrute.id },
        data: {
          lastFight: new Date(),
          fightsLeft: updatedFightsLeft - 1,
          xp: { increment: xpGained },
          victories: { increment: brute1Won ? 1 : 0 },
          losses: { increment: brute1Won ? 0 : 1 },
        },
      });

      // Actualizar progreso de objetivos
      if (bruteWithUser?.userId) {
        const { updateDailyObjectiveProgress, updateWeeklyObjectiveProgress } = await import('../objectives/updateObjectiveProgress.js');
        const { ObjectiveType, AchievementType } = await import('@labrute/prisma');
        const { updateAchievementProgress, updateAchievementProgressSingleBrute, updateWinStreakAchievement, updateDamageDealtAchievement, updateConsecutiveDaysAchievement } = await import('../achievements/updateAchievementProgress.js');
        
        // Actualizar objetivo de peleas completadas
        await updateDailyObjectiveProgress(prisma, bruteWithUser.userId, ObjectiveType.COMPLETE_FIGHTS, 1);
        await updateWeeklyObjectiveProgress(prisma, bruteWithUser.userId, ObjectiveType.COMPLETE_FIGHTS, 1);
        await updateAchievementProgress(prisma, bruteWithUser.userId, AchievementType.COMPLETE_FIGHTS_TOTAL, 1);
        // Actualizar logro de peleas completadas con un solo bruto (máximo)
        await updateAchievementProgressSingleBrute(
          prisma,
          bruteWithUser.userId,
          AchievementType.COMPLETE_FIGHTS_SINGLE_BRUTE,
          (brute) => (brute.victories || 0) + (brute.losses || 0),
        );
        
        // Actualizar objetivo de peleas ganadas
        if (brute1Won) {
          await updateDailyObjectiveProgress(prisma, bruteWithUser.userId, ObjectiveType.WIN_FIGHTS, 1);
          await updateWeeklyObjectiveProgress(prisma, bruteWithUser.userId, ObjectiveType.WIN_FIGHTS, 1);
          await updateAchievementProgress(prisma, bruteWithUser.userId, AchievementType.WIN_FIGHTS_TOTAL, 1);
          // Actualizar logro de peleas ganadas con un solo bruto (máximo)
          await updateAchievementProgressSingleBrute(
            prisma,
            bruteWithUser.userId,
            AchievementType.WIN_FIGHTS_SINGLE_BRUTE,
            (brute) => brute.victories || 0,
          );
        }
        
        // Actualizar objetivo de XP ganado
        if (xpGained > 0) {
          await updateDailyObjectiveProgress(prisma, bruteWithUser.userId, ObjectiveType.GAIN_XP, xpGained);
          await updateWeeklyObjectiveProgress(prisma, bruteWithUser.userId, ObjectiveType.GAIN_XP, xpGained);
        }
        
        // Actualizar logro de peleas automáticas completadas
        await updateAchievementProgress(prisma, bruteWithUser.userId, AchievementType.AUTO_FIGHTS_COMPLETED, 1);
        
        // Actualizar racha de victorias incrementalmente (evita escanear todas las peleas)
        const streakBefore = await prisma.brute.findUnique({
          where: { id: updatedBrute.id },
          select: { winStreakCurrent: true, winStreakMax: true },
        });

        const newCurrentStreak = brute1Won
          ? (streakBefore?.winStreakCurrent ?? 0) + 1
          : 0;
        const newMaxStreak = Math.max(streakBefore?.winStreakMax ?? 0, newCurrentStreak);

        await prisma.brute.update({
          where: { id: updatedBrute.id },
          data: {
            winStreakCurrent: newCurrentStreak,
            winStreakMax: newMaxStreak,
          },
          select: { id: true },
        });

        // Logros permanentes de racha de victorias: leer desde Brute.winStreakMax (O(#brutes))
        await updateWinStreakAchievement(prisma, bruteWithUser.userId);
        await updateDamageDealtAchievement(prisma, bruteWithUser.userId, fight.id);
        await updateConsecutiveDaysAchievement(prisma, bruteWithUser.userId);
        
        // Actualizar progreso de misiones
        const { updateMissionProgress, updateMissionProgressSingleBrute } = await import('../missions/updateMissionProgress.js');
        const { MissionType } = await import('@labrute/prisma');
        
        // Misiones de combate
        await updateMissionProgress(prisma, bruteWithUser.userId, MissionType.COMPLETE_FIGHTS, 1);
        if (brute1Won) {
          await updateMissionProgress(prisma, bruteWithUser.userId, MissionType.WIN_FIGHTS, 1);
        }
        await updateMissionProgressSingleBrute(
          prisma,
          bruteWithUser.userId,
          MissionType.REACH_LEVEL,
          (brute) => brute.level || 0,
        );

        // Misiones de progresión
        if (xpGained > 0) {
          await updateMissionProgress(prisma, bruteWithUser.userId, MissionType.GAIN_XP, xpGained);
        }

        // Misiones de daño causado, racha de victorias y habilidades diferentes
        const { updateDamageDealtMission, updateWinStreakMission, updateDifferentSkillsMissionIncremental } = await import('../missions/updateMissionProgress.js');
        await updateDamageDealtMission(prisma, bruteWithUser.userId, fight.id);
        await updateWinStreakMission(prisma, bruteWithUser.userId);
        await updateDifferentSkillsMissionIncremental(prisma, bruteWithUser.userId, fight.id);

        // Pase de batalla (peleas automáticas también suman XP)
        const { addXp, addMissionProgress, addMissionProgressFromFight } = await import('../battlePass/updateBattlePassProgress.js');
        const { BattlePassMissionType: BP } = await import('@labrute/prisma');
        const { BATTLE_PASS_XP } = await import('@labrute/core');
        await addXp(prisma, bruteWithUser.userId, brute1Won ? BATTLE_PASS_XP.FIGHT_WIN : BATTLE_PASS_XP.FIGHT_LOSS).catch((err: Error) => {
          // Silently fail for Battle Pass updates in auto fights
        });
        if (brute1Won) {
          await addMissionProgress(prisma, bruteWithUser.userId, BP.WIN_FIGHTS, 1).catch((err: Error) => {
            // Silently fail for Battle Pass updates in auto fights
          });
        }
        await addMissionProgressFromFight(prisma, bruteWithUser.userId, fight.id, { damage: true, winStreak: true }).catch((err: Error) => {
          // Silently fail for Battle Pass updates in auto fights
        });
      }

      // Crear logs
      await prisma.log.create({
        data: {
          currentBrute: { connect: { id: updatedBrute.id } },
          type: brute1Won ? LogType.win : LogType.lose,
          brute: opponentBrute.name,
          fight: { connect: { id: fight.id } },
          xp: xpGained,
          template: randomBetween(0, FightLogTemplateCount - 1).toString(),
        },
      });

      const opponentWon = isWinner(opponentBrute, fightData.data);
      await prisma.log.create({
        data: {
          currentBrute: { connect: { id: opponentBrute.id } },
          type: opponentWon ? LogType.win : LogType.lose,
          brute: updatedBrute.name,
          fight: { connect: { id: fight.id } },
          template: randomBetween(0, FightLogTemplateCount - 1).toString(),
        },
      });

      fightsCompleted++;
      currentFightsLeft--;

      // Actualizar referencia del brute para siguiente iteración (sin regenerar oponentes innecesariamente)
      // Solo regenerar oponentes si se acabaron
      if (opponents.length <= 1) {
        const freshOpponents = await getOpponents(prisma, updatedBruteAfterFight);
        if (freshOpponents.length > 0) {
          opponents = freshOpponents;
          await prisma.brute.update({
            where: { id: updatedBruteAfterFight.id },
            data: {
              opponents: {
                set: opponents.map((o) => ({ id: o.id })),
              },
              opponentsGeneratedAt: new Date(),
            },
          });
        }
      }

      // Actualizar referencia del brute para siguiente iteración
      brute = updatedBruteAfterFight;

    } catch (error) {
      // Remover el oponente que causó el error y continuar
      opponents = opponents.filter((o) => o.id !== opponent.id);
      continue;
    }
  }

  // Obtener estado final del bruto
  const finalBrute = await prisma.brute.findFirst({
    where: { id: bruteId },
  });

  if (!finalBrute) {
    return {
      fightsCompleted,
      fightsLeft: 0,
      canLevelUp: false,
      stopped: true,
      reason: 'bruteNotFound',
    };
  }

  const finalCalculatedBrute = getCalculatedBrute(finalBrute, modifiers);
  const finalFightsLeft = getFightsLeft(finalCalculatedBrute, modifiers);
  const finalCanLevelUp = canLevelUp(finalCalculatedBrute);

  return {
    fightsCompleted,
    fightsLeft: finalFightsLeft,
    canLevelUp: finalCanLevelUp,
    stopped: finalFightsLeft === 0 || finalCanLevelUp,
    reason: finalCanLevelUp ? 'canLevelUp' : finalFightsLeft === 0 ? 'noFightsLeft' : undefined,
  };
};
