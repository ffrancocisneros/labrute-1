import { getGameDay } from '@labrute/core';
import { ClanMissionCadence, PrismaClient } from '@labrute/prisma';
import dayjs from 'dayjs';
import type { Request, Response } from 'express';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { generateGeneralMissions } from '../utils/missions/generateMissions.js';
import { claimMissionReward } from '../utils/missions/claimMissionReward.js';
import { getWeekStart } from '../utils/objectives/generateObjectives.js';

export const Missions = {
  /**
   * Obtener todas las misiones del usuario (diarias, semanales y generales)
   */
  get: (prisma: PrismaClient) => async (
    req: Request,
    res: Response<{
      daily: Array<{
        id: string;
        type: string;
        target: number;
        progress: number;
        completed: boolean;
        completedAt?: string | null;
        claimed: boolean;
        claimedAt?: string | null;
        rewardType: string;
        rewardValue: number;
      }>;
      weekly: Array<{
        id: string;
        type: string;
        target: number;
        progress: number;
        completed: boolean;
        completedAt?: string | null;
        claimed: boolean;
        claimedAt?: string | null;
        rewardType: string;
        rewardValue: number;
      }>;
      general: Array<{
        id: string;
        category: string;
        type: string;
        title: string;
        description: string;
        target: number;
        progress: number;
        completed: boolean;
        completedAt?: string | null;
        claimed: boolean;
        rewardType: string;
        rewardValue: number;
        order: number;
      }>;
      clanDaily: Array<{
        id: string;
        type: string;
        target: number;
        progress: number;
        completed: boolean;
        rewardGold: number;
        rewardXp: number;
        startDate: string;
        endDate: string;
      }>;
      clanWeekly: Array<{
        id: string;
        type: string;
        target: number;
        progress: number;
        completed: boolean;
        rewardGold: number;
        rewardXp: number;
        startDate: string;
        endDate: string;
      }>;
    }>,
  ) => {
    try {
      const authed = await auth(prisma, req);

      const today = getGameDay().toDate();
      const weekStart = getWeekStart();

      // Generar misiones generales si no existen
      await generateGeneralMissions(prisma, authed.id);

      // Generar objetivos diarios y semanales (la función ya maneja la generación incremental)
      const { generateDailyObjectives, generateWeeklyObjectives } = await import('../utils/objectives/generateObjectives.js');
      await generateDailyObjectives(prisma, authed.id, today);
      await generateWeeklyObjectives(prisma, authed.id, weekStart);

      // Obtener objetivos diarios (misiones diarias)
      const dailyMissions = await prisma.dailyObjective.findMany({
        where: {
          userId: authed.id,
          date: today,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Obtener objetivos semanales (misiones semanales)
      const weeklyMissions = await prisma.weeklyObjective.findMany({
        where: {
          userId: authed.id,
          weekStart,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Obtener misiones generales
      const generalMissions = await prisma.mission.findMany({
        where: {
          userId: authed.id,
        },
        orderBy: [
          { category: 'asc' },
          { order: 'asc' },
        ],
      });

      // Misiones de clan (para el primer clan en el que tenga un bruto)
      let clanDaily: {
        id: string;
        type: string;
        target: number;
        progress: number;
        completed: boolean;
        rewardGold: number;
        rewardXp: number;
        startDate: string;
        endDate: string;
      }[] = [];

      let clanWeekly: {
        id: string;
        type: string;
        target: number;
        progress: number;
        completed: boolean;
        rewardGold: number;
        rewardXp: number;
        startDate: string;
        endDate: string;
      }[] = [];

      const userBruteWithClan = await prisma.brute.findFirst({
        where: {
          userId: authed.id,
          deletedAt: null,
          clanId: { not: null },
        },
        select: {
          clanId: true,
        },
      });

      if (userBruteWithClan?.clanId) {
        const clanId = userBruteWithClan.clanId;

        const dailyClanMissions = await prisma.clanMission.findMany({
          where: {
            clanId,
            cadence: ClanMissionCadence.DAILY,
            startDate: today,
            endDate: today,
          },
          orderBy: { createdAt: 'asc' },
        });

        const weekStart = getWeekStart();
        const weekEnd = dayjs.utc(weekStart).add(6, 'day').startOf('day').toDate();

        const weeklyClanMissions = await prisma.clanMission.findMany({
          where: {
            clanId,
            cadence: ClanMissionCadence.WEEKLY,
            startDate: weekStart,
            endDate: weekEnd,
          },
          orderBy: { createdAt: 'asc' },
        });

        clanDaily = dailyClanMissions.map((m) => ({
          id: m.id,
          type: m.type,
          target: m.target,
          progress: m.progress,
          completed: m.completed,
          rewardGold: m.rewardGold,
          rewardXp: m.rewardXp,
          startDate: m.startDate.toISOString(),
          endDate: m.endDate.toISOString(),
        }));

        clanWeekly = weeklyClanMissions.map((m) => ({
          id: m.id,
          type: m.type,
          target: m.target,
          progress: m.progress,
          completed: m.completed,
          rewardGold: m.rewardGold,
          rewardXp: m.rewardXp,
          startDate: m.startDate.toISOString(),
          endDate: m.endDate.toISOString(),
        }));
      }

      res.send({
        daily: dailyMissions.map((m) => ({
          id: m.id,
          type: m.type,
          target: m.target,
          progress: m.progress,
          completed: m.completed,
          completedAt: m.completedAt?.toISOString() || null,
          claimed: m.claimed,
          claimedAt: m.claimedAt?.toISOString() || null,
          rewardType: m.rewardType,
          rewardValue: m.rewardValue,
        })),
        weekly: weeklyMissions.map((m) => ({
          id: m.id,
          type: m.type,
          target: m.target,
          progress: m.progress,
          completed: m.completed,
          completedAt: m.completedAt?.toISOString() || null,
          claimed: m.claimed,
          claimedAt: m.claimedAt?.toISOString() || null,
          rewardType: m.rewardType,
          rewardValue: m.rewardValue,
        })),
        general: generalMissions.map((m) => ({
          id: m.id,
          category: m.category,
          type: m.type,
          title: m.title,
          description: m.description,
          target: m.target,
          progress: m.progress,
          completed: m.completed,
          completedAt: m.completedAt?.toISOString() || null,
          claimed: m.claimed,
          rewardType: m.rewardType,
          rewardValue: m.rewardValue,
          order: m.order,
        })),
        clanDaily,
        clanWeekly,
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  /**
   * Reclamar recompensa de una misión (general, diaria o semanal)
   */
  claim: (prisma: PrismaClient) => async (
    req: Request<{ id: string }>,
    res: Response<{
      success: boolean;
      gold?: number;
      title?: string;
    }>,
  ) => {
    try {
      const authed = await auth(prisma, req);

      // Intentar reclamar como misión general primero
      const generalMission = await prisma.mission.findFirst({
        where: {
          id: req.params.id,
          userId: authed.id,
        },
      });

      if (generalMission) {
        const result = await claimMissionReward(
          prisma,
          authed.id,
          req.params.id,
        );

        res.send({
          success: true,
          ...result,
        });
        return;
      }

      // Si no es misión general, intentar como objetivo diario
      const dailyObjective = await prisma.dailyObjective.findFirst({
        where: {
          id: req.params.id,
          userId: authed.id,
        },
      });

      if (dailyObjective) {
        const { claimDailyObjectiveReward } = await import('../utils/objectives/claimObjectiveReward.js');
        const result = await claimDailyObjectiveReward(
          prisma,
          authed.id,
          req.params.id,
        );

        res.send({
          success: true,
          ...result,
        });
        return;
      }

      // Si no es diario, intentar como objetivo semanal
      const weeklyObjective = await prisma.weeklyObjective.findFirst({
        where: {
          id: req.params.id,
          userId: authed.id,
        },
      });

      if (weeklyObjective) {
        const { claimWeeklyObjectiveReward } = await import('../utils/objectives/claimObjectiveReward.js');
        const result = await claimWeeklyObjectiveReward(
          prisma,
          authed.id,
          req.params.id,
        );

        res.send({
          success: true,
          ...result,
        });
        return;
      }

      throw new Error('Mission not found');
    } catch (error) {
      sendError(res, error);
    }
  },
};
