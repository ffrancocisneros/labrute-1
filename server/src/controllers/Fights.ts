import {
  BATTLE_PASS_XP,
  ExpectedError, FightCreateResponse, FightGetResponse, FightLogTemplateCount,
  GLOBAL_TOURNAMENT_START_HOUR, LimitError, MissingElementError, NotFoundError,
  canLevelUp, getCalculatedBrute, getFightsLeft,
  getGameDay,
  toGameDay,
  getXPNeeded,
  isUuid,
  isWinner,
  randomBetween,
} from '@labrute/core';
import dayjs from 'dayjs';
import {
  FightModifier,
  InventoryItemType,
  LogType, Prisma, PrismaClient, TournamentType,
} from '@labrute/prisma';
import type { Request, Response } from 'express';
import { DISCORD, LOGGER } from '../context.js';
import { auth } from '../utils/auth.js';
import { enrichCalculatedBruteWithTemporary } from '../utils/brute/enrichCalculatedBruteWithTemporary.js';
import { getOpponents } from '../utils/brute/getOpponents.js';
import { generateFight } from '../utils/fight/generateFight.js';
import { ilike } from '../utils/ilike.js';
import { sendError } from '../utils/sendError.js';
import { ServerState } from '../utils/ServerState.js';
import { translate } from '../utils/translate.js';

export const Fights = {
  get: (prisma: PrismaClient) => async (
    req: Request,
    res: Response<FightGetResponse>,
  ) => {
    try {
      if (!req.params.id) {
        throw new MissingElementError(translate('missingParameters'));
      }

      if (!isUuid(req.params.id)) {
        throw new ExpectedError(translate('invalidParameters'));
      }

      // Get fight
      const fight = await prisma.fight.findFirst({
        where: {
          id: req.params.id,
        },
        include: {
          favoritedBy: {
            select: { id: true },
          },
        },
      });

      if (!fight) {
        throw new NotFoundError(translate('fightNotFound'));
      }

      // Limit viewing if the fight is from a global tournament round not yet reached
      const tournament = await prisma.tournament.findFirst({
        where: {
          type: TournamentType.GLOBAL,
          date: { gte: new Date() },
          fights: { some: { id: fight.id } },
        },
      });

      const now = dayjs.utc();
      const hour = now.hour();

      if (tournament && fight.tournamentStep > hour - GLOBAL_TOURNAMENT_START_HOUR + 1) {
        throw new LimitError('Fight unavailable for now');
      } else {
        res.send(fight);
      }
    } catch (error) {
      sendError(res, error);
    }
  },
  create: (prisma: PrismaClient) => async (
    req: Request<never, unknown, { brute1: string, brute2: string }>,
    res: Response<FightCreateResponse>,
  ) => {
    try {
      const user = await auth(prisma, req);
      
      if (!req.body.brute1 || !req.body.brute2) {
        throw new MissingElementError(translate('missingParameters', user));
      }

      // Get brutes
      const baseBrute1 = await prisma.brute.findFirst({
        where: {
          name: ilike(req.body.brute1),
          deletedAt: null,
          userId: user.id,
        },
        include: {
          Brute_Opponents_B: {
            select: { name: true },
          },
        },
      });
      if (!baseBrute1) {
        throw new NotFoundError(translate('bruteNotFound', user));
      }

      // Obtener peleas bonus del bruto
      const today = getGameDay();
      const hasBonusToday = (baseBrute1.bonusFightsDate
        && toGameDay(baseBrute1.bonusFightsDate).isSame(today, 'day'))
        ?? false;
      const bonusCount = hasBonusToday ? (baseBrute1.bonusFightsCount ?? 0) : 0;

      const baseBrute2 = await prisma.brute.findFirst({
        where: {
          name: ilike(req.body.brute2),
          deletedAt: null,
        },
      });
      if (!baseBrute2) {
        throw new NotFoundError(translate('bruteNotFound', user));
      }

      // Get current modifiers
      const modifiers = await ServerState.getModifiers(prisma);

      const brute1 = getCalculatedBrute(baseBrute1, modifiers);
      const brute2 = getCalculatedBrute(baseBrute2, modifiers);
      await enrichCalculatedBruteWithTemporary(prisma, brute1);
      await enrichCalculatedBruteWithTemporary(prisma, brute2);

      // Check if this is an arena fight
      const arenaFight = brute1.Brute_Opponents_B.some((opponent: { name: string }) => opponent.name === brute2.name);

      const brute1FightsLeft = getFightsLeft(brute1, modifiers);
      const availableFights = brute1FightsLeft + bonusCount;

      // Cancel if brute1 has no fights left (ni del bruto ni bonus de hoy)
      if (arenaFight && availableFights <= 0) {
        throw new LimitError(translate('noFightsLeft', user));
      }

      // Cancel if brute1 can level up
      if (canLevelUp(brute1)) {
        throw new LimitError(translate('cantFightBeforeLevelingUp', user));
      }

      // Consumir pelea: priorizar bonus de hoy para no gastar las diarias del bruto
      let usedBonus = false;
      if (arenaFight) {
        if (bonusCount > 0) {
          usedBonus = true;
          await prisma.brute.update({
            where: { id: brute1.id },
            data: {
              lastFight: new Date(),
              bonusFightsCount: { decrement: 1 },
            },
            select: { id: true },
          });
        } else {
          await prisma.brute.update({
            where: { id: brute1.id },
            data: {
              lastFight: new Date(),
              fightsLeft: brute1FightsLeft - 1,
            },
            select: { id: true },
          });
        }
      }

      // Generate fight (retry if failed)
      let generatedFight: Prisma.FightCreateInput | null = null;
      let expectedError: ExpectedError | null = null;
      let retry = 0;

      while (!generatedFight && !expectedError && retry < 10) {
        try {
          retry += 1;

          const newGeneratedFight = await generateFight({
            prisma,
            team1: { brutes: [brute1] },
            team2: { brutes: [brute2] },
            modifiers,
            // No backups for event brutes
            backups: !brute1.eventId,
            achievements: arenaFight,
          });
          generatedFight = newGeneratedFight.data;
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }

          if (error instanceof ExpectedError) {
            expectedError = error;
          } else {
            LOGGER.log(`Error while generating fight between ${brute1.name} and ${brute2.name}, retrying...`);
            DISCORD().sendError(error);
          }
        }
      }

      if (expectedError || !generatedFight) {
        throw expectedError;
      }

      // Save important fight data
      const { id: fightId } = await prisma.fight.create({
        data: generatedFight,
        select: { id: true },
      });

      // Get current event
      const event = await ServerState.getCurrentEvent(prisma);

      // Get XP gained (0 for non arena fights)
      // (+1 level for a win as an event brute)
      // (+0.5 level for a loss as an event brute)
      // (+2 for a win against a brute at least 2 level below you)
      // (+1 for a win against a brute at least 10 level below you)
      // (+0 otherwise)
      const levelDifference = brute1.level - brute2.level;
      const brute1Won = isWinner(brute1, generatedFight);
      let xpGained = arenaFight
        ? brute1Won
          ? brute1.eventId
            ? brute1.level >= (event?.maxLevel ?? 999)
              ? 0
              : getXPNeeded(brute1.level + 1)
            : levelDifference > 10 ? 0 : levelDifference > 2 ? 1 : 2
          : brute1.eventId
            ? brute1.level >= (event?.maxLevel ?? 999)
              ? 0
              : Math.ceil(getXPNeeded(brute1.level + 1) / 2)
            : levelDifference > 10 ? 0 : 1
        : 0;

      // Double XP modifier
      if (modifiers[FightModifier.doubleXP]) {
        xpGained *= 2;
      }

      // Crazy day modifier: x10 XP
      if (modifiers[FightModifier.crazyDay]) {
        xpGained *= 10;
      }

      // Update brute XP, victories and losses if arena fight
      if (arenaFight) {
        // Actualizar racha de victorias incrementalmente (evita escanear todas las peleas)
        // Lo hacemos con lectura + update para mantenerlo simple y portable.
        const streakBefore = await prisma.brute.findUnique({
          where: { id: brute1.id },
          select: { winStreakCurrent: true, winStreakMax: true },
        });

        const newCurrentStreak = brute1Won
          ? (streakBefore?.winStreakCurrent ?? 0) + 1
          : 0;
        const newMaxStreak = Math.max(streakBefore?.winStreakMax ?? 0, newCurrentStreak);

        await prisma.brute.update({
          where: { id: brute1.id },
          data: {
            winStreakCurrent: newCurrentStreak,
            winStreakMax: newMaxStreak,
          },
          select: { id: true },
        });

        const updatedBrute = await prisma.brute.update({
          where: { id: brute1.id },
          data: {
            xp: { increment: xpGained },
            victories: { increment: brute1Won ? 1 : 0 },
            losses: { increment: brute1Won ? 0 : 1 },
          },
          select: { id: true, userId: true },
        });

        // Heavy post-processing (misiones, logros, battle-pass) en background para no bloquear la respuesta
        if (updatedBrute.userId) {
          const userId = updatedBrute.userId;
          void (async () => {
            try {
              const { updateDailyObjectiveProgress, updateWeeklyObjectiveProgress } = await import('../utils/objectives/updateObjectiveProgress.js');
              const { ObjectiveType, AchievementType, MissionType } = await import('@labrute/prisma');
              const { updateAchievementProgress, updateAchievementProgressSingleBrute, updateWinStreakAchievement, updateDamageDealtAchievement, updateConsecutiveDaysAchievement } = await import('../utils/achievements/updateAchievementProgress.js');
              const { updateMissionProgress, updateMissionProgressSingleBrute, updateDamageDealtMission, updateWinStreakMission, updateDifferentSkillsMissionIncremental } = await import('../utils/missions/updateMissionProgress.js');

              // Objetivos (diario/semanal)
              await updateDailyObjectiveProgress(prisma, userId, ObjectiveType.COMPLETE_FIGHTS, 1);
              await updateWeeklyObjectiveProgress(prisma, userId, ObjectiveType.COMPLETE_FIGHTS, 1);
              await updateAchievementProgress(prisma, userId, AchievementType.COMPLETE_FIGHTS_TOTAL, 1);
              await updateAchievementProgressSingleBrute(
                prisma,
                userId,
                AchievementType.COMPLETE_FIGHTS_SINGLE_BRUTE,
                (brute) => (brute.victories || 0) + (brute.losses || 0),
              );

              if (brute1Won) {
                await updateDailyObjectiveProgress(prisma, userId, ObjectiveType.WIN_FIGHTS, 1);
                await updateWeeklyObjectiveProgress(prisma, userId, ObjectiveType.WIN_FIGHTS, 1);
                await updateAchievementProgress(prisma, userId, AchievementType.WIN_FIGHTS_TOTAL, 1);
                await updateAchievementProgressSingleBrute(
                  prisma,
                  userId,
                  AchievementType.WIN_FIGHTS_SINGLE_BRUTE,
                  (brute) => brute.victories || 0,
                );
              }

              if (xpGained > 0) {
                await updateDailyObjectiveProgress(prisma, userId, ObjectiveType.GAIN_XP, xpGained);
                await updateWeeklyObjectiveProgress(prisma, userId, ObjectiveType.GAIN_XP, xpGained);
                await updateMissionProgress(prisma, userId, MissionType.GAIN_XP, xpGained);
              }

              // Racha de victorias / daño / días consecutivos
              await updateWinStreakAchievement(prisma, userId);
              await updateDamageDealtAchievement(prisma, userId, fightId);
              await updateConsecutiveDaysAchievement(prisma, userId);

              // Misiones de combate/progresión
              await updateMissionProgress(prisma, userId, MissionType.COMPLETE_FIGHTS, 1);
              if (brute1Won) {
                await updateMissionProgress(prisma, userId, MissionType.WIN_FIGHTS, 1);
              }
              await updateMissionProgressSingleBrute(
                prisma,
                userId,
                MissionType.REACH_LEVEL,
                (brute) => brute.level || 0,
              );

              // Misiones de daño, racha, skills distintas
              await updateDamageDealtMission(prisma, userId, fightId);
              await updateWinStreakMission(prisma, userId);
              await updateDifferentSkillsMissionIncremental(prisma, userId, fightId);

              // Pase de batalla (peleas manuales; las automáticas no suman)
              const { addXp, addMissionProgress, addMissionProgressFromFight } = await import('../utils/battlePass/updateBattlePassProgress.js');
              const { BattlePassMissionType: BP } = await import('@labrute/prisma');
              await addXp(prisma, userId, brute1Won ? BATTLE_PASS_XP.FIGHT_WIN : BATTLE_PASS_XP.FIGHT_LOSS).catch((err: Error) => {
                LOGGER.error(`Battle Pass addXp error: ${err.message}`);
              });
              if (brute1Won) {
                await addMissionProgress(prisma, userId, BP.WIN_FIGHTS, 1).catch((err: Error) => {
                  LOGGER.error(`Battle Pass addMissionProgress WIN_FIGHTS error: ${err.message}`);
                });
              }
              await addMissionProgressFromFight(prisma, userId, fightId, { damage: true, winStreak: true }).catch((err: Error) => {
                LOGGER.error(`Battle Pass addMissionProgressFromFight error: ${err.message}`);
              });
            } catch (err) {
              LOGGER.error(`Post-fight async processing error: ${err instanceof Error ? err.message : String(err)}`);
            }
          })();
        }
      }

      // Add fighter log
      await prisma.log.create({
        data: {
          currentBrute: { connect: { id: brute1.id } },
          type: brute1Won ? LogType.win : LogType.lose,
          brute: brute2.name,
          fight: { connect: { id: fightId } },
          xp: xpGained,
          template: randomBetween(0, FightLogTemplateCount - 1).toString(),
        },
        select: { id: true },
      });

      // Add opponent log
      await prisma.log.create({
        data: {
          currentBrute: { connect: { id: brute2.id } },
          type: isWinner(brute2, generatedFight) ? LogType.win : LogType.lose,
          brute: brute1.name,
          fight: { connect: { id: fightId } },
          template: randomBetween(0, FightLogTemplateCount - 1).toString(),
        },
        select: { id: true },
      });

      // Update brute opponents if the opponent was in the arena
      if (brute1.Brute_Opponents_B.some((o: { name: string }) => o.name === brute2.name)) {
        // Get new opponents
        const newOpponents = await getOpponents(prisma, brute1);

        // Save opponents
        await prisma.brute.update({
          where: {
            id: brute1.id,
          },
          data: {
            Brute_Opponents_B: {
              set: newOpponents.map((o) => ({
                id: o.id,
              })),
            },
            // Update opponentsGeneratedAt
            opponentsGeneratedAt: new Date(),
          },
          select: { id: true },
        });
      }

      const fightsLeftAfter = arenaFight
        ? (usedBonus ? brute1FightsLeft : brute1FightsLeft - 1)
        : brute1FightsLeft;

      // Send fight id to client
      res.send({
        id: fightId,
        xpWon: arenaFight ? xpGained : 0,
        fightsLeft: fightsLeftAfter,
        victories: arenaFight ? brute1Won ? 1 : 0 : 0,
        losses: arenaFight ? !brute1Won ? 1 : 0 : 0,
      });
    } catch (error) {
      sendError(res, error);
    }
  },
  toggleFavorite: (prisma: PrismaClient) => async (
    req: Request<{ id: string }>,
    res: Response,
  ) => {
    try {
      const user = await auth(prisma, req);

      if (!req.params.id) {
        throw new MissingElementError(translate('missingParameters', user));
      }

      // Get fight
      const fight = await prisma.fight.findFirst({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          favoritedBy: {
            select: { id: true },
          },
        },
      });

      if (!fight) {
        throw new NotFoundError(translate('fightNotFound', user));
      }

      // Toggle favorite
      const isFavorited = fight.favoritedBy.some((f) => f.id === user.id);

      if (isFavorited) {
        // Unfavorite
        await prisma.fight.update({
          where: { id: fight.id },
          data: {
            favoritedBy: {
              disconnect: { id: user.id },
            },
          },
          select: { id: true },
        });

        // Add 1x favorite fight item
        await prisma.inventoryItem.upsert({
          where: {
            type_userId: {
              type: InventoryItemType.favoriteFight,
              userId: user.id,
            },
          },
          create: {
            type: InventoryItemType.favoriteFight,
            user: { connect: { id: user.id } },
          },
          update: {
            count: {
              increment: 1,
            },
          },
          select: { id: true },
        });
      } else {
        // Check if user has enough favorite fight items
        const favoriteFightItem = await prisma.inventoryItem.findFirst({
          where: {
            type: InventoryItemType.favoriteFight,
            userId: user.id,
          },
          select: { id: true, count: true },
        });

        if (!favoriteFightItem || favoriteFightItem.count <= 0) {
          throw new LimitError(translate('favoriteLimit', user));
        }

        // Favorite
        await prisma.fight.update({
          where: { id: fight.id },
          data: {
            favoritedBy: {
              connect: { id: user.id },
            },
          },
          select: { id: true },
        });

        // Remove 1x favorite fight item
        await prisma.inventoryItem.update({
          where: {
            type_userId: {
              type: InventoryItemType.favoriteFight,
              userId: user.id,
            },
          },
          data: {
            count: {
              decrement: 1,
            },
          },
          select: { id: true },
        });
      }

      res.send({ success: true });
    } catch (error) {
      sendError(res, error);
    }
  },
};
