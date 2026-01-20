import { ExpectedError } from '@labrute/core';
import { PrismaClient } from '@labrute/prisma';
import type { Request, Response } from 'express';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { generatePermanentAchievements } from '../utils/achievements/generatePermanentAchievements.js';
import { claimAchievementReward } from '../utils/achievements/claimAchievementReward.js';

export const PermanentAchievements = {
  get: (prisma: PrismaClient) => async (
    req: Request,
    res: Response<{
      achievements: Array<{
        id: string;
        type: string;
        level: string;
        target: number;
        progress: number;
        completed: boolean;
        completedAt?: string | null;
        claimed: boolean;
        claimedAt?: string | null;
        rewardType: string;
        rewardValue: number;
      }>;
    }>,
  ) => {
    try {
      const authed = await auth(prisma, req);

      // Generar logros si no existen
      await generatePermanentAchievements(prisma, authed.id);

      // Obtener todos los logros del usuario
      const achievements = await prisma.permanentAchievement.findMany({
        where: { userId: authed.id },
        orderBy: [
          { type: 'asc' },
          { level: 'asc' },
        ],
      });

      res.send({
        achievements: achievements.map((a) => ({
          id: a.id,
          type: a.type,
          level: a.level,
          target: a.target,
          progress: a.progress,
          completed: a.completed,
          completedAt: a.completedAt?.toISOString() || null,
          claimed: a.claimed,
          claimedAt: a.claimedAt?.toISOString() || null,
          rewardType: a.rewardType,
          rewardValue: a.rewardValue,
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  claim: (prisma: PrismaClient) => async (
    req: Request<{ id: string }>,
    res: Response<{
      success: boolean;
      gold?: number;
      title?: string;
      cosmetic?: string;
    }>,
  ) => {
    try {
      const authed = await auth(prisma, req);

      const result = await claimAchievementReward(
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
