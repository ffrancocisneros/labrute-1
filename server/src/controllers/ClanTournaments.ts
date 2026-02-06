import {
  ExpectedError,
  ForbiddenError,
  MissingElementError,
  NotFoundError,
} from '@labrute/core';
import {
  ClanTournamentFormat,
  ClanTournamentStatus,
  PrismaClient,
} from '@labrute/prisma';
import dayjs from 'dayjs';
import type { Request, Response } from 'express';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { translate } from '../utils/translate.js';

const getNextClanTournamentDateAndFormat = () => {
  let date = dayjs.utc().startOf('day');

  // We play clan tournaments on Wednesday (ELIMINATION) and Sunday (LEAGUE)
  // 0 = Sunday ... 3 = Wednesday
  // Find the next such day (including today)
  for (let i = 0; i < 14; i += 1) {
    const day = date.day();
    if (day === 3) {
      return {
        date,
        format: ClanTournamentFormat.ELIMINATION,
      };
    }
    if (day === 0) {
      return {
        date,
        format: ClanTournamentFormat.LEAGUE,
      };
    }
    date = date.add(1, 'day');
  }

  // Fallback, should never happen
  return {
    date: dayjs.utc().startOf('day'),
    format: ClanTournamentFormat.ELIMINATION,
  };
};

export const ClanTournaments = {
  /**
   * Inscribe a clan for the next available clan tournament (format depends on weekday).
   * Body: { brute: string; clanId: string }
   */
  register: (prisma: PrismaClient) => async (
    req: Request<never, unknown, { brute: string; clanId: string }>,
    res: Response<{ success: boolean }>,
  ) => {
    try {
      const user = await auth(prisma, req);

      if (!req.body.brute || !req.body.clanId) {
        throw new MissingElementError(translate('missingParameters', user));
      }

      // Get brute and ensure it belongs to user
      const brute = await prisma.brute.findFirst({
        where: {
          id: req.body.brute,
          deletedAt: null,
          userId: user.id,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!brute) {
        throw new NotFoundError(translate('bruteNotFound', user));
      }

      // Get clan and ensure brute is master
      const clan = await prisma.clan.findFirst({
        where: {
          id: req.body.clanId,
          deletedAt: null,
        },
        select: {
          id: true,
          masterId: true,
          name: true,
        },
      });

      if (!clan) {
        throw new NotFoundError(translate('clanNotFound', user));
      }

      if (clan.masterId !== brute.id) {
        throw new ForbiddenError(translate('unauthorized', user));
      }

      const { date, format } = getNextClanTournamentDateAndFormat();

      // Find or create tournament for that date/format
      const existingTournament = await prisma.clanTournament.findFirst({
        where: {
          date: date.toDate(),
          format,
        },
        select: {
          id: true,
        },
      });

      const tournamentId = existingTournament
        ? existingTournament.id
        : (await prisma.clanTournament.create({
          data: {
            date: date.toDate(),
            format,
            status: ClanTournamentStatus.PENDING,
          },
          select: { id: true },
        })).id;

      // Check if clan is already registered
      const alreadyRegistered = await prisma.clanTournamentClan.findFirst({
        where: {
          tournamentId,
          clanId: clan.id,
        },
        select: { id: true },
      });

      if (alreadyRegistered) {
        throw new ExpectedError(translate('invalidParameters', user));
      }

      // Count current participants to assign a simple seed
      const count = await prisma.clanTournamentClan.count({
        where: { tournamentId },
      });

      await prisma.clanTournamentClan.create({
        data: {
          clanId: clan.id,
          tournamentId,
          seed: count + 1,
        },
        select: { id: true },
      });

      res.status(200).send({ success: true });
    } catch (error) {
      sendError(res, error);
    }
  },

  /**
   * Get today's clan tournament for a given clan (if any), including wars and participants.
   */
  getTodayForClan: (prisma: PrismaClient) => async (
    req: Request<{ id: string }>,
    res: Response,
  ) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new MissingElementError(translate('missingClanId'));
      }

      // Ensure clan exists
      const clan = await prisma.clan.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, name: true },
      });

      if (!clan) {
        throw new NotFoundError(translate('clanNotFound'));
      }

      const today = dayjs.utc().startOf('day').toDate();

      const tournament = await prisma.clanTournament.findFirst({
        where: {
          date: today,
          participants: {
            some: { clanId: id },
          },
        },
        include: {
          participants: {
            include: {
              clan: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          wars: {
            include: {
              attackerClan: {
                select: { id: true, name: true },
              },
              defenderClan: {
                select: { id: true, name: true },
              },
              winnerClan: {
                select: { id: true, name: true },
              },
            },
            orderBy: [
              { round: 'asc' },
              { id: 'asc' },
            ],
          },
        },
      });

      if (!tournament) {
        res.status(200).send({ tournament: null });
        return;
      }

      // Normalize shape for frontend (avoid leaking Prisma internals)
      const response = {
        id: tournament.id,
        date: tournament.date,
        format: tournament.format,
        status: tournament.status,
        rounds: tournament.rounds,
        participants: tournament.participants.map((p) => ({
          id: p.id,
          seed: p.seed,
          points: p.points,
          finalPosition: p.finalPosition,
          clan: {
            id: p.clan.id,
            name: p.clan.name,
          },
        })),
        wars: tournament.wars.map((w) => ({
          id: w.id,
          round: w.round,
          attackerWins: w.attackerWins,
          defenderWins: w.defenderWins,
          fightIds: w.fightIds,
          attackerClan: w.attackerClan,
          defenderClan: w.defenderClan,
          winnerClan: w.winnerClan,
        })),
      };

      res.status(200).send({ tournament: response });
    } catch (error) {
      sendError(res, error);
    }
  },
};

