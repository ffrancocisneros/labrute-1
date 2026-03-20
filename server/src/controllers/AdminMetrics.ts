import {
  ExpectedError,
  getFightsLeft,
  getGameDay,
  getTieredSkills,
  toGameDay,
} from '@labrute/core';
import { PrismaClient, UserLogType } from '@labrute/prisma';
import dayjs from 'dayjs';
import type { Request, Response } from 'express';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { ServerState } from '../utils/ServerState.js';
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
    userTotalFightsAvailable: number;
    fightsTodayRatio: string; // X de TOTAL
    lastConnectionAt: Date | null;
    msSinceLastConnection: number | null;
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
        connectedToday,
        fightsToday,
        latestConnectLogs,
        modifiers,
        survivalRegistrationsCount,
        dailyTournamentBrutes,
      ] = await Promise.all([
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
        prisma.userLog.groupBy({
          by: ['userId'],
          where: {
            type: UserLogType.CONNECT,
          },
          _max: {
            date: true,
          },
        }),
        ServerState.getModifiers(prisma),
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

      const connectedUserIds = connectedToday.map((connectedUser) => connectedUser.userId);
      const lastConnectByUserId = new Map<string, Date>(
        latestConnectLogs
          .filter((row) => row._max.date)
          .map((row) => [row.userId, row._max.date as Date]),
      );

      const connectedUsersBrutes = await prisma.brute.findMany({
        where: {
          deletedAt: null,
          userId: {
            in: connectedUserIds,
          },
        },
        select: {
          id: true,
          userId: true,
          skills: true,
          fightsLeft: true,
          lastFight: true,
          eventId: true,
          bonusFightsCount: true,
          bonusFightsDate: true,
        },
      });

      const today = getGameDay();
      const totalFightsAvailableByUserId = new Map<string, number>();
      connectedUsersBrutes.forEach((brute) => {
        if (!brute.userId) return;

        const calculatedSkills = getTieredSkills(brute, modifiers);
        const dailyFightsAvailable = getFightsLeft({
          ...brute,
          skills: calculatedSkills,
        }, modifiers);

        const hasBonusToday = brute.bonusFightsDate
          && toGameDay(brute.bonusFightsDate).isSame(today, 'day');
        const bonusFights = hasBonusToday ? (brute.bonusFightsCount ?? 0) : 0;
        const bruteTotal = dailyFightsAvailable + bonusFights;

        totalFightsAvailableByUserId.set(
          brute.userId,
          (totalFightsAvailableByUserId.get(brute.userId) || 0) + bruteTotal,
        );
      });

      const users = connectedToday.map((connectedUser) => {
        const fightsTodayCount = fightsByUserId.get(connectedUser.userId) || 0;
        const userTotalFightsAvailable = totalFightsAvailableByUserId.get(connectedUser.userId) || 0;
        const lastConnectionAt = lastConnectByUserId.get(connectedUser.userId) || null;

        return {
          userId: connectedUser.userId,
          userName: connectedUser.user.name,
          fightsToday: fightsTodayCount,
          userTotalFightsAvailable,
          fightsTodayRatio: `${fightsTodayCount} de ${userTotalFightsAvailable}`,
          lastConnectionAt,
          msSinceLastConnection: lastConnectionAt
            ? Math.max(0, Date.now() - lastConnectionAt.getTime())
            : null,
        };
      }).sort((a, b) => b.fightsToday - a.fightsToday);

      res.status(200).send({
        date: date.format('YYYY-MM-DD'),
        totalFights: fightsToday.length,
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
