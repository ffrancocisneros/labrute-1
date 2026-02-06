import {
  canLevelUp,
  type CalculatedBrute,
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
import { enrichCalculatedBruteWithTemporary, type TemporaryEffectsCache } from './enrichCalculatedBruteWithTemporary.js';
import { getOpponents } from './getOpponents.js';
import { generateFight } from '../fight/generateFight.js';
import { ServerState } from '../ServerState.js';
import { ilike } from '../ilike.js';
import { getXPNeeded } from '@labrute/core';
import { DISCORD, LOGGER } from '../../context.js';
import dayjs from 'dayjs';

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
  // Métricas de performance
  const startTime = Date.now();
  const fightTimings: number[] = [];

  // Obtener el bruto completo con todos los campos necesarios
  let brute = await prisma.brute.findFirst({
    where: {
      id: bruteId,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      name: true,
      level: true,
      xp: true,
      hp: true,
      enduranceStat: true,
      enduranceModifier: true,
      enduranceValue: true,
      strengthStat: true,
      strengthModifier: true,
      strengthValue: true,
      agilityStat: true,
      agilityModifier: true,
      agilityValue: true,
      speedStat: true,
      speedModifier: true,
      speedValue: true,
      weapons: true,
      skills: true,
      pets: true,
      masterId: true,
      pupilsCount: true,
      clanId: true,
      registeredForTournament: true,
      nextTournamentDate: true,
      currentTournamentDate: true,
      currentTournamentStepWatched: true,
      globalTournamentWatchedDate: true,
      globalTournamentRoundWatched: true,
      eventTournamentWatchedDate: true,
      eventTournamentRoundWatched: true,
      lastFight: true,
      fightsLeft: true,
      bonusFightsCount: true,
      bonusFightsDate: true,
      victories: true,
      losses: true,
      winStreakCurrent: true,
      winStreakMax: true,
      opponentsGeneratedAt: true,
      canRankUpSince: true,
      favorite: true,
      autoFightEnabled: true,
      eventId: true,
    },
  });

  if (!brute) {
    throw new Error('Brute not found');
  }

  // Obtener modificadores actuales
  const modifiers = await ServerState.getModifiers(prisma);

  // Cachear evento actual (no cambia durante las peleas automáticas)
  const currentEvent = await ServerState.getCurrentEvent(prisma);

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

  // Obtener peleas disponibles (diarias + bonus)
  let fightsLeft = getFightsLeft(calculatedBrute, modifiers);
  
  // Obtener peleas bonus del bruto
  const hasBonusToday = (brute.bonusFightsDate
    && dayjs.utc(brute.bonusFightsDate).isSame(dayjs.utc(), 'day'))
    ?? false;
  const bonusFightsCount = hasBonusToday ? (brute.bonusFightsCount ?? 0) : 0;
  const totalAvailableFights = fightsLeft + bonusFightsCount;

  // Validar que tenga peleas disponibles (diarias o bonus)
  if (totalAvailableFights <= 0) {
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
        Brute_Opponents_B: {
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

  // Pelear hasta agotar las peleas disponibles (diarias + bonus)
  let currentFightsLeft = fightsLeft;
  let currentBonusFights = bonusFightsCount;
  let fightsCompleted = 0;

  // Cache de habilidades temporales para optimizar queries
  const temporaryEffectsCache = new Map<string, TemporaryEffectsCache>();

  // Función helper para obtener efectos temporales desde cache o DB
  const getTemporaryEffects = async (bruteId: string): Promise<TemporaryEffectsCache> => {
    if (temporaryEffectsCache.has(bruteId)) {
      return temporaryEffectsCache.get(bruteId)!;
    }

    const [skills, weapons] = await Promise.all([
      prisma.bruteTemporaryEffect.findMany({
        where: { bruteId, expiresAt: { gt: new Date() } },
        select: { skillName: true },
      }),
      prisma.bruteTemporaryWeapon.findMany({
        where: { bruteId, expiresAt: { gt: new Date() } },
        select: { weaponName: true },
      }),
    ]);

    const result: TemporaryEffectsCache = {
      skills: skills.map((s) => s.skillName),
      weapons: weapons.map((w) => w.weaponName),
    };

    temporaryEffectsCache.set(bruteId, result);
    return result;
  };

  // Pre-cargar efectos temporales del bruto principal
  const bruteTemporaryEffects = await getTemporaryEffects(brute.id);

  // Pre-cargar efectos temporales de todos los oponentes en paralelo
  await Promise.all(opponents.map((opp) => getTemporaryEffects(opp.id)));

  while (currentFightsLeft > 0 || currentBonusFights > 0) {
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
          Brute_Opponents_B: {
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
      // Métricas: inicio de pelea individual
      const fightStartTime = Date.now();

      // Usar el bruto del estado del loop (inicial o actualizado en iteración anterior). Evita 1 query por pelea (ver ANALISIS_LENTITUD_PELEAS_AUTOMATICAS.md).
      if (!brute) {
        break;
      }

      type UpdatedBruteSelect = Pick<Brute, 'id' | 'userId' | 'winStreakCurrent' | 'winStreakMax' | 'level' | 'xp' | 'eventId' | 'name' | 'victories' | 'losses' | 'weapons' | 'skills' | 'pets' | 'lastFight' | 'fightsLeft' | 'bonusFightsCount' | 'bonusFightsDate' | 'enduranceStat' | 'enduranceModifier' | 'enduranceValue' | 'strengthStat' | 'strengthModifier' | 'strengthValue' | 'agilityStat' | 'agilityModifier' | 'agilityValue' | 'speedStat' | 'speedModifier' | 'speedValue' | 'hp'>;
      const updatedBrute = brute as UpdatedBruteSelect;

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

      // Obtener efectos temporales del oponente desde cache
      const opponentTemporaryEffects = await getTemporaryEffects(opponentBrute.id);

      // Generar la pelea (incluir habilidades temporales usando cache)
      const opponentCalculatedBrute = getCalculatedBrute(opponentBrute, modifiers);
      await Promise.all([
        enrichCalculatedBruteWithTemporary(prisma, updatedCalculatedBrute as CalculatedBrute, bruteTemporaryEffects),
        enrichCalculatedBruteWithTemporary(prisma, opponentCalculatedBrute as CalculatedBrute, opponentTemporaryEffects),
      ]);
      const fightData = await generateFight({
        prisma,
        team1: { brutes: [updatedCalculatedBrute as CalculatedBrute] },
        team2: { brutes: [opponentCalculatedBrute as CalculatedBrute] },
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
      
      // Calcular XP ganado (usar evento cacheado)
      const levelDifference = updatedBrute.level - opponentBrute.level;
      
      let xpGained = brute1Won
        ? updatedBrute.eventId
          ? updatedBrute.level >= (currentEvent?.maxLevel ?? 999)
            ? 0
            : getXPNeeded(updatedBrute.level + 1)
          : levelDifference > 10 ? 0 : levelDifference > 2 ? 1 : 2
        : updatedBrute.eventId
          ? updatedBrute.level >= (currentEvent?.maxLevel ?? 999)
            ? 0
            : Math.ceil(getXPNeeded(updatedBrute.level + 1) / 2)
          : levelDifference > 10 ? 0 : 1;

      // Double XP modifier
      if (modifiers[FightModifier.doubleXP]) {
        xpGained *= 2;
      }

      // Crazy day modifier: x10 XP
      if (modifiers[FightModifier.crazyDay]) {
        xpGained *= 10;
      }

      // Consumir pelea: priorizar bonus para no gastar las diarias del bruto
      let usedBonus = false;
      if (currentBonusFights > 0) {
        usedBonus = true;
        currentBonusFights--;
      } else {
        currentFightsLeft--;
      }

      // Racha de victorias: calcular aquí para un solo update (evita 1 query por pelea; ver ANALISIS_LENTITUD_PELEAS_AUTOMATICAS.md)
      const newCurrentStreak = brute1Won ? (updatedBrute.winStreakCurrent ?? 0) + 1 : 0;
      const newMaxStreak = Math.max(updatedBrute.winStreakMax ?? 0, newCurrentStreak);

      const userId = updatedBrute.userId;
      const updatedBruteAfterFight: Brute = await prisma.brute.update({
        where: { id: updatedBrute.id },
        data: {
          lastFight: new Date(),
          ...(usedBonus
            ? { bonusFightsCount: { decrement: 1 } }
            : { fightsLeft: currentFightsLeft }),
          xp: { increment: xpGained },
          victories: { increment: brute1Won ? 1 : 0 },
          losses: { increment: brute1Won ? 0 : 1 },
          winStreakCurrent: newCurrentStreak,
          winStreakMax: newMaxStreak,
        },
      });

      // Objetivos, logros, misiones y battle pass en background para no bloquear la siguiente pelea (ANALISIS_LENTITUD_PELEAS_AUTOMATICAS.md)
      if (userId) {
        void (async () => {
          try {
            const { updateDailyObjectiveProgress, updateWeeklyObjectiveProgress } = await import('../objectives/updateObjectiveProgress.js');
            const { ObjectiveType, AchievementType } = await import('@labrute/prisma');
            const { updateAchievementProgress, updateAchievementProgressSingleBrute, updateWinStreakAchievement, updateDamageDealtAchievement, updateConsecutiveDaysAchievement } = await import('../achievements/updateAchievementProgress.js');

            await updateDailyObjectiveProgress(prisma, userId, ObjectiveType.COMPLETE_FIGHTS, 1);
            await updateWeeklyObjectiveProgress(prisma, userId, ObjectiveType.COMPLETE_FIGHTS, 1);
            await updateAchievementProgress(prisma, userId, AchievementType.COMPLETE_FIGHTS_TOTAL, 1);
            await updateAchievementProgressSingleBrute(
              prisma,
              userId,
              AchievementType.COMPLETE_FIGHTS_SINGLE_BRUTE,
              (b) => (b.victories || 0) + (b.losses || 0),
            );
            if (brute1Won) {
              await updateDailyObjectiveProgress(prisma, userId, ObjectiveType.WIN_FIGHTS, 1);
              await updateWeeklyObjectiveProgress(prisma, userId, ObjectiveType.WIN_FIGHTS, 1);
              await updateAchievementProgress(prisma, userId, AchievementType.WIN_FIGHTS_TOTAL, 1);
              await updateAchievementProgressSingleBrute(prisma, userId, AchievementType.WIN_FIGHTS_SINGLE_BRUTE, (b) => b.victories || 0);
            }
            if (xpGained > 0) {
              await updateDailyObjectiveProgress(prisma, userId, ObjectiveType.GAIN_XP, xpGained);
              await updateWeeklyObjectiveProgress(prisma, userId, ObjectiveType.GAIN_XP, xpGained);
            }
            await updateAchievementProgress(prisma, userId, AchievementType.AUTO_FIGHTS_COMPLETED, 1);

            await updateWinStreakAchievement(prisma, userId);
            await updateDamageDealtAchievement(prisma, userId, fight.id);
            await updateConsecutiveDaysAchievement(prisma, userId);

            const { updateMissionProgress, updateMissionProgressSingleBrute, updateDamageDealtMission, updateWinStreakMission, updateDifferentSkillsMissionIncremental } = await import('../missions/updateMissionProgress.js');
            const { MissionType } = await import('@labrute/prisma');
            await updateMissionProgress(prisma, userId, MissionType.COMPLETE_FIGHTS, 1);
            if (brute1Won) await updateMissionProgress(prisma, userId, MissionType.WIN_FIGHTS, 1);
            await updateMissionProgressSingleBrute(prisma, userId, MissionType.REACH_LEVEL, (b) => b.level || 0);
            if (xpGained > 0) await updateMissionProgress(prisma, userId, MissionType.GAIN_XP, xpGained);
            await updateDamageDealtMission(prisma, userId, fight.id);
            await updateWinStreakMission(prisma, userId);
            await updateDifferentSkillsMissionIncremental(prisma, userId, fight.id);

            const { addXp, addMissionProgress, addMissionProgressFromFight } = await import('../battlePass/updateBattlePassProgress.js');
            const { BattlePassMissionType: BP } = await import('@labrute/prisma');
            const { BATTLE_PASS_XP } = await import('@labrute/core');
            await addXp(prisma, userId, brute1Won ? BATTLE_PASS_XP.FIGHT_WIN : BATTLE_PASS_XP.FIGHT_LOSS).catch(() => {});
            if (brute1Won) await addMissionProgress(prisma, userId, BP.WIN_FIGHTS, 1).catch(() => {});
            await addMissionProgressFromFight(prisma, userId, fight.id, { damage: true, winStreak: true }).catch(() => {});
          } catch (err) {
            LOGGER.error(`AutoFight background error: ${err instanceof Error ? err.message : String(err)}`);
          }
        })();
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

      // Métricas: fin de pelea individual
      const fightDuration = Date.now() - fightStartTime;
      fightTimings.push(fightDuration);

      // Actualizar referencia del brute para siguiente iteración (incluir valores actualizados)
      brute = {
        ...updatedBruteAfterFight,
        bonusFightsCount: usedBonus ? (brute.bonusFightsCount ?? 0) - 1 : (brute.bonusFightsCount ?? 0),
        bonusFightsDate: brute.bonusFightsDate,
        fightsLeft: usedBonus ? brute.fightsLeft : currentFightsLeft,
      } as Brute;

      // Si se regeneran oponentes, pre-cargar sus efectos temporales
      if (opponents.length <= 1) {
        const freshOpponents = await getOpponents(prisma, updatedBruteAfterFight);
        if (freshOpponents.length > 0) {
          opponents = freshOpponents;
          // Pre-cargar efectos temporales de nuevos oponentes en paralelo
          await Promise.all(freshOpponents.map((opp) => getTemporaryEffects(opp.id)));
          await prisma.brute.update({
            where: { id: updatedBruteAfterFight.id },
            data: {
              Brute_Opponents_B: {
                set: opponents.map((o) => ({ id: o.id })),
              },
              opponentsGeneratedAt: new Date(),
            },
          });
        }
      }

    } catch (error) {
      // Remover el oponente que causó el error y continuar
      opponents = opponents.filter((o) => o.id !== opponent.id);
      continue;
    }
  }

  // Obtener estado final del bruto
  const finalBrute = await prisma.brute.findFirst({
    where: { id: bruteId },
    select: {
      fightsLeft: true,
      bonusFightsCount: true,
      bonusFightsDate: true,
      lastFight: true,
      skills: true,
      eventId: true,
      level: true,
      xp: true,
      hp: true,
      enduranceStat: true,
      enduranceModifier: true,
      enduranceValue: true,
      strengthStat: true,
      strengthModifier: true,
      strengthValue: true,
      agilityStat: true,
      agilityModifier: true,
      agilityValue: true,
      speedStat: true,
      speedModifier: true,
      speedValue: true,
      masterId: true,
      pupilsCount: true,
      clanId: true,
      registeredForTournament: true,
      nextTournamentDate: true,
      currentTournamentDate: true,
      currentTournamentStepWatched: true,
      globalTournamentWatchedDate: true,
      globalTournamentRoundWatched: true,
      eventTournamentWatchedDate: true,
      eventTournamentRoundWatched: true,
    },
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

  const finalCalculatedBrute = getCalculatedBrute(finalBrute as Brute, modifiers);
  const finalFightsLeft = getFightsLeft(finalCalculatedBrute, modifiers);
  
  // Obtener peleas bonus finales
  const finalHasBonusToday = (finalBrute.bonusFightsDate
    && dayjs.utc(finalBrute.bonusFightsDate).isSame(dayjs.utc(), 'day'))
    ?? false;
  const finalBonusFights = finalHasBonusToday ? (finalBrute.bonusFightsCount ?? 0) : 0;
  const totalFinalFights = finalFightsLeft + finalBonusFights;
  
  const finalCanLevelUp = canLevelUp(finalCalculatedBrute);

  // Métricas: calcular estadísticas finales
  const totalDuration = Date.now() - startTime;
  const avgFightTime = fightTimings.length > 0
    ? Math.round(fightTimings.reduce((a, b) => a + b, 0) / fightTimings.length)
    : 0;
  const minFightTime = fightTimings.length > 0 ? Math.min(...fightTimings) : 0;
  const maxFightTime = fightTimings.length > 0 ? Math.max(...fightTimings) : 0;

  // Log de métricas de performance
  if (fightsCompleted > 0) {
    LOGGER.log(`AutoFights performance [${brute.name}]: ${fightsCompleted} peleas en ${totalDuration}ms (promedio: ${avgFightTime}ms/pelea, min: ${minFightTime}ms, max: ${maxFightTime}ms)`);
  }

  // Devolver solo peleas DIARIAS: la columna fightsLeft en DB es solo diarias.
  // El controlador escribe result.fightsLeft en la DB; si devolvemos total (diarias+bonus)
  // duplicamos las bonus (ej: 0 diarias + 10 bonus -> escribíamos 10 en fightsLeft y quedaban 20 total).
  return {
    fightsCompleted,
    fightsLeft: finalFightsLeft,
    canLevelUp: finalCanLevelUp,
    stopped: totalFinalFights === 0 || finalCanLevelUp,
    reason: finalCanLevelUp ? 'canLevelUp' : totalFinalFights === 0 ? 'noFightsLeft' : undefined,
  };
};
