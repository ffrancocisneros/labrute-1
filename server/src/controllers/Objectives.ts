import { NotFoundError } from '@labrute/core';
import { PrismaClient } from '@labrute/prisma';
import type { Request, Response } from 'express';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { generateDailyObjectives, generateWeeklyObjectives, getWeekStart } from '../utils/objectives/generateObjectives.js';
import { claimDailyObjectiveReward, claimWeeklyObjectiveReward } from '../utils/objectives/claimObjectiveReward.js';
import dayjs from 'dayjs';

export const Objectives = {
  /**
   * Obtener objetivos diarios y semanales del usuario
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
        rewardType: string;
        rewardValue: number;
      }>;
    }>,
  ) => {
    try {
      const authed = await auth(prisma, req);

      const today = dayjs().startOf('day').toDate();
      const weekStart = getWeekStart();

      // Generar objetivos si no existen
      await generateDailyObjectives(prisma, authed.id, today);
      await generateWeeklyObjectives(prisma, authed.id, weekStart);

      // Obtener objetivos diarios
      const dailyObjectives = await prisma.dailyObjective.findMany({
        where: {
          userId: authed.id,
          date: today,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Obtener objetivos semanales
      const weeklyObjectives = await prisma.weeklyObjective.findMany({
        where: {
          userId: authed.id,
          weekStart,
        },
        orderBy: { createdAt: 'asc' },
      });

      res.send({
        daily: dailyObjectives.map((obj) => ({
          id: obj.id,
          type: obj.type,
          target: obj.target,
          progress: obj.progress,
          completed: obj.completed,
          completedAt: obj.completedAt?.toISOString() || null,
          rewardType: obj.rewardType,
          rewardValue: obj.rewardValue,
        })),
        weekly: weeklyObjectives.map((obj) => ({
          id: obj.id,
          type: obj.type,
          target: obj.target,
          progress: obj.progress,
          completed: obj.completed,
          completedAt: obj.completedAt?.toISOString() || null,
          rewardType: obj.rewardType,
          rewardValue: obj.rewardValue,
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  /**
   * Reclamar recompensa de un objetivo diario
   */
  claimDaily: (prisma: PrismaClient) => async (
    req: Request<{ id: string }>,
    res: Response<{
      success: boolean;
      gold?: number;
      title?: string;
    }>,
  ) => {
    try {
      const authed = await auth(prisma, req);

      const result = await claimDailyObjectiveReward(
        prisma,
        authed.id,
        req.params.id,
      );

      res.send({
        success: true,
        ...result,
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  /**
   * Reclamar recompensa de un objetivo semanal
   */
  claimWeekly: (prisma: PrismaClient) => async (
    req: Request<{ id: string }>,
    res: Response<{
      success: boolean;
      gold?: number;
      title?: string;
    }>,
  ) => {
    try {
      const authed = await auth(prisma, req);

      const result = await claimWeeklyObjectiveReward(
        prisma,
        authed.id,
        req.params.id,
      );

      res.send({
        success: true,
        ...result,
      });
    } catch (error) {
      sendError(res, error);
    }
  },
};
