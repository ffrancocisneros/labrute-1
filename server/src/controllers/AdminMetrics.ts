import { ExpectedError } from '@labrute/core';
import { PrismaClient, UserLogType } from '@labrute/prisma';
import dayjs from 'dayjs';
import type { Request, Response } from 'express';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { translate } from '../utils/translate.js';

type AdminDailyMetricsResponse = {
  date: string;
  totalFights: number;
  connectedUsersCount: number;
  tournamentRegistrationsCount: number;
  survivalRegistrationsCount: number;
  activeUsersWithFightsCount: number;
  users: Array<{
    userId: string;
    userName: string;
    fightsToday: number;
    fightsTodayRatio: string;
    lastSeen: Date;
    msSinceLastConnection: number;
  }>;
};

export const AdminMetrics = {
  daily: (prisma: PrismaClient) => async (
    req: Request,
    res: Response<AdminDailyMetricsResponse>,
  ) => {
    try {
      const user = await auth(prisma, req, { admin: true });

      const dateQuery = typeof req.query.date === 'string'
        ? req.query.date
        : dayjs.utc().format('YYYY-MM-DD');
      const date = dayjs.utc(dateQuery, 'YYYY-MM-DD', true);

      if (!date.isValid()) {
        throw new ExpectedError(translate('invalidParameters', user));
      }

      const dayStart = date.startOf('day').toDate();
      const dayEnd = date.endOf('day').toDate();

      const [
        totalFights,
        connectedToday,
        fightsToday,
        survivalRegistrationsCount,
        dailyTournamentBrutes,
      ] = await Promise.all([
        prisma.fight.count({
          where: {
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
        prisma.userLog.findMany({
          where: {
            type: UserLogType.CONNECT,
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          distinct: ['userId'],
          select: {
            userId: true,
            user: {
              select: {
                name: true,
                lastSeen: true,
              },
            },
          },
        }),
        prisma.fight.findMany({
          where: {
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          select: {
            id: true,
            brute1: {
              select: {
                userId: true,
              },
            },
            brute2: {
              select: {
                userId: true,
              },
            },
          },
        }),
        prisma.survivalRegistration.count({
          where: {
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
        prisma.brute.findMany({
          where: {
            deletedAt: null,
            registeredForTournament: true,
            nextTournamentDate: {
              gte: dayStart,
              lte: dayEnd,
            },
            userId: {
              not: null,
            },
          },
          distinct: ['userId'],
          select: {
            userId: true,
          },
        }),
      ]);

      const fightsByUserId = new Map<string, number>();

      fightsToday.forEach((fight) => {
        const userIds = new Set<string>();

        if (fight.brute1?.userId) {
          userIds.add(fight.brute1.userId);
        }
        if (fight.brute2?.userId) {
          userIds.add(fight.brute2.userId);
        }

        userIds.forEach((userId) => {
          fightsByUserId.set(userId, (fightsByUserId.get(userId) || 0) + 1);
        });
      });

      const users = connectedToday.map((connectedUser) => {
        const fightsTodayCount = fightsByUserId.get(connectedUser.userId) || 0;

        return {
          userId: connectedUser.userId,
          userName: connectedUser.user.name,
          fightsToday: fightsTodayCount,
          fightsTodayRatio: `${fightsTodayCount} de ${totalFights}`,
          lastSeen: connectedUser.user.lastSeen,
          msSinceLastConnection: Math.max(0, Date.now() - connectedUser.user.lastSeen.getTime()),
        };
      }).sort((a, b) => b.fightsToday - a.fightsToday);

      res.status(200).send({
        date: date.format('YYYY-MM-DD'),
        totalFights,
        connectedUsersCount: connectedToday.length,
        tournamentRegistrationsCount: dailyTournamentBrutes.length,
        survivalRegistrationsCount,
        activeUsersWithFightsCount: users.filter((u) => u.fightsToday > 0).length,
        users,
      });
    } catch (error) {
      sendError(res, error);
    }
  },
};
