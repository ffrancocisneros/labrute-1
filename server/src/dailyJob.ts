import {
  bosses,
  BruteDeletionReason,
  ClanWarMaxParticipants,
  ClanWarPointReward,
  CopaDelReyGoldReward,
  CopaDelReyXpReward,
  DailyModifierCountOdds,
  DailyModifierOdds,
  DailyModifierSpawnChance,
  DailyTournamentGoldReward,
  DailyTournamentXpReward,
  EventPauseDuration,
  Fighter,
  getCalculatedBrute,
  getGameDay,
  getGameTomorrow,
  getNewElo,
  getSpecialRuleForDate,
  getWinsNeededToRankUp,
  GlobalTournamentGoldReward,
  GlobalTournamentXpReward,
  isWinner,
  keys,
  knownIssues,
  LAST_RELEASE,
  Modifiers,
  randomBetween,
  refreshChaosSeeds,
  SpecialTournamentGoldReward,
  SpecialTournamentRule,
  SpecialTournamentXpReward,
  weightedRandom,
} from '@labrute/core';
import {
  AchievementName,
  Brute,
  ClanMissionType,
  ClanMissionCadence,
  ClanTournamentFormat,
  ClanTournamentStatus,
  ClanWarStatus,
  ClanWarType,
  EventStatus,
  FightModifier,
  InventoryItemType,
  LogType, Prisma, PrismaClient, TournamentType,
} from '@labrute/prisma';
import dayjs from 'dayjs';
import { DISCORD, LOGGER } from './context.js';
import { increaseAchievement } from './controllers/Achievements.js';
import { ServerState } from './utils/ServerState.js';
import { resetBrute } from './utils/brute/resetBrute.js';
import { updateClanPoints } from './utils/clan/updateClanPoints.js';
import { generateFight } from './utils/fight/generateFight.js';
import { ensureDailyClanMissions, ensureWeeklyClanMissions, incrementClanMission } from './utils/missions/clanMissions.js';
import { logMemory } from './utils/memory.js';
import { shuffle } from './utils/shuffle.js';

const GENERATE_TOURNAMENTS_IN_DEV = false;

const triggerGC = () => {
  if (global.gc) {
    global.gc();
  }
};

const grantBetaAchievement = async (prisma: PrismaClient) => {
  // Grant beta achievement to all brutes who don't have it yet
  const brutes = await prisma.$executeRaw`
    INSERT INTO "Achievement" (name, "bruteId", "userId", count)
    SELECT 'beta', "Brute"."id", "Brute"."userId", 1
    FROM "Brute"
    WHERE "userId" IS NOT NULL
      AND "deletedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "Achievement"
        WHERE "Brute"."id" = "Achievement"."bruteId"
          AND "Achievement"."name" = 'beta'
      );
  `;

  if (!brutes) {
    return;
  }

  LOGGER.log(`Gave the beta achievement to ${brutes} brutes`);
};

const grantBugAchievement = async (prisma: PrismaClient) => {
  // Grant bug achievement to all admins who don't have it yet
  const admins = await prisma.$executeRaw`
    INSERT INTO "Achievement" (name, "userId", count)
    SELECT 'bug', "User"."id", 999
    FROM "User"
    WHERE "User"."admin" = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM "Achievement"
        WHERE "Achievement"."userId" = "User"."id"
          AND "Achievement"."name" = 'bug'
      );
  `;

  if (!admins) {
    return;
  }

  LOGGER.log(`Gave the bug achievement to ${admins} admins`);
};

const deleteMisformattedTournaments = async (prisma: PrismaClient) => {
  const today = getGameDay();
  const tomorrow = today.add(1, 'day');

  // Check tournaments already created today
  const tournamentsAlreadyCreated = await prisma.tournament.findMany({
    where: {
      type: {
        in: [TournamentType.DAILY, TournamentType.SPECIAL],
      },
      date: {
        gte: today.toDate(),
        lt: tomorrow.toDate(),
      },
    },
    select: {
      id: true,
      fights: { select: { id: true } },
    },
  });

  // Delete misformatted tournaments
  const misformattedTournaments = tournamentsAlreadyCreated.filter(
    (tournament) => tournament.fights.length !== 63,
  );

  if (misformattedTournaments.length) {
    await prisma.fight.deleteMany({
      where: {
        tournamentId: {
          in: misformattedTournaments.map((tournament) => tournament.id),
        },
      },
    });

    await prisma.tournament.deleteMany({
      where: {
        id: {
          in: misformattedTournaments.map((tournament) => tournament.id),
        },
      },
    });
  }
};

const repairMisdatedDailyTournaments = async (prisma: PrismaClient) => {
  const today = getGameDay();
  const tomorrow = today.add(1, 'day');
  const yesterday = today.subtract(1, 'day');

  const todayCount = await prisma.tournament.count({
    where: {
      type: TournamentType.DAILY,
      date: { gte: today.toDate(), lt: tomorrow.toDate() },
    },
  });

  if (todayCount > 0) return;

  const repaired = await prisma.tournament.updateMany({
    where: {
      type: TournamentType.DAILY,
      date: { gte: yesterday.toDate(), lt: today.toDate() },
    },
    data: { date: today.toDate() },
  });

  if (repaired.count > 0) {
    LOGGER.log(`Repaired ${repaired.count} daily tournament(s): date shifted from ${yesterday.format('YYYY-MM-DD')} to ${today.format('YYYY-MM-DD')}`);
  }
};

const handleDailyTournaments = async (
  prisma: PrismaClient,
  modifiers: Modifiers,
) => {
  // Keep track of gains (xp, gold) and daily tournament winners
  const gains: Record<string, [number, number]> = {};
  const dailyWinners: string[] = [];

  const today = getGameDay();
  const tomorrow = today.add(1, 'day');

  // Fix tournaments created with wrong date (new Date() instead of getGameDay())
  await repairMisdatedDailyTournaments(prisma);

  // Delete misformatted tournaments
  await deleteMisformattedTournaments(prisma);

  // Get brutes who registered today and are not in a tournament
  const registeredBrutes = await prisma.brute.findMany({
    where: {
      deletedAt: null,
      eventId: null,
      registeredForTournament: true,
      nextTournamentDate: {
        lt: tomorrow.toDate(),
      },
      tournaments: {
        none: {
          type: TournamentType.DAILY,
          date: {
            gte: today.toDate(),
            lt: tomorrow.toDate(),
          },
        },
      },
    },
    select: {
      id: true,
      level: true,
      ranking: true,
      name: true,
    },
  });

  // All brutes are assigned, do nothing
  if (registeredBrutes.length === 0) {
    return { registeredBrutes, gains, dailyWinners };
  }

  // Shuffle brutes
  const shuffledBrutes = shuffle(registeredBrutes);

  const tournamentsToCreate = Math.ceil(shuffledBrutes.length / 64);

  // Create groups of 64 brutes
  let tournaments: (typeof registeredBrutes)[] = Array(tournamentsToCreate)
    .fill([])
    .map((_, index) => shuffledBrutes.slice(index * 64, index * 64 + 64));

  // Fill last group with generated brutes
  if (tournaments.length && tournaments[tournaments.length - 1]?.length) {
    const lastTournament = tournaments[tournaments.length - 1];

    if (!lastTournament) {
      throw new Error('No last tournament');
    }

    const highestLevelBrute = lastTournament
      .sort((a, b) => a.level - b.level)[lastTournament.length - 1]?.level;

    // Get generated brutes at level lower or equal to highest level brute
    let generatedBrutes = await prisma.brute.findMany({
      where: {
        deletedAt: null,
        user: null,
        level: {
          lte: highestLevelBrute,
        },
      },
      select: {
        id: true,
        level: true,
        ranking: true,
        name: true,
      },
    });

    // Shuffle generated brutes
    generatedBrutes = shuffle(generatedBrutes);

    if (lastTournament.length !== 64) {
      lastTournament.push(...generatedBrutes.slice(0, 64 - lastTournament.length));
    }

    if (lastTournament.length !== 64) {
      // Remove tournament registration for those brutes
      await prisma.brute.updateMany({
        where: {
          id: {
            in: lastTournament.map((brute) => brute.id),
          },
        },
        data: {
          registeredForTournament: false,
          nextTournamentDate: null,
        },
      });

      // Add log to notify brutes
      await prisma.log.createMany({
        data: lastTournament.map((brute) => ({
          currentBruteId: brute.id,
          type: LogType.tournament,
        })),
      });

      // Remove last tournament
      tournaments.pop();
    }
  }

  // Remove empty tournaments and sort brutes by rank and level
  // (Split in two halves)
  tournaments = tournaments.filter(Boolean).map((tournament) => {
    const firstHalf: typeof registeredBrutes = [];
    const secondHalf: typeof registeredBrutes = [];
    const sortedTournament = tournament.sort((a, b) => {
      if (a.ranking === b.ranking) {
        return b.level - a.level;
      }

      return a.ranking - b.ranking;
    });

    // Alternate between first and second half
    for (const brute of sortedTournament) {
      if (firstHalf.length === secondHalf.length) {
        firstHalf.push(brute);
      } else {
        secondHalf.push(brute);
      }
    }

    // Shuffle first and second half before returning
    return [...shuffle(firstHalf), ...shuffle(secondHalf)];
  });

  // Create tournaments
  for (const brutes of tournaments) {
    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        date: today.toDate(),
        participants: {
          connect: brutes.map((brute) => ({ id: brute.id })),
        },
        rounds: 6,
      },
      select: { id: true, date: true },
    });

    // Create tournament steps (1 to 32 for first round, 33 to 48 for 2nd, etc etc)
    let step = 1;
    let roundBrutes = [...brutes];
    let winners: typeof registeredBrutes = [];
    let lastFight: Prisma.FightCreateInput | null = null;
    while (roundBrutes.length > 1) {
      for (let i = 0; i < roundBrutes.length - 1; i += 2) {
        const roundBrute1 = roundBrutes[i];
        const roundBrute2 = roundBrutes[i + 1];

        if (!roundBrute1 || !roundBrute2) {
          throw new Error(`Brute not found: ${roundBrute1?.id || roundBrute2?.id}`);
        }
        const brute1 = await prisma.brute.findUnique({
          where: { id: roundBrute1.id },
        });
        const brute2 = await prisma.brute.findUnique({
          where: { id: roundBrute2.id },
        });

        if (!brute1 || !brute2) {
          throw new Error(`Brute not found: ${brute1?.id || brute2?.id}`);
        }

        if (brute1.id === brute2.id) {
          throw new Error('Attempting to fight a brute against itself');
        }

        // Generate fight (retry if failed)
        let generatedFight: Prisma.FightCreateInput | null = null;
        let retries = 0;

        while (!generatedFight) {
          // Stop at 10 retries
          if (retries > 10) {
            throw new Error('Too many retries');
          }

          try {
            const newGeneratedFight = await generateFight({
              prisma,
              team1: { brutes: [getCalculatedBrute(brute1, modifiers)] },
              team2: { brutes: [getCalculatedBrute(brute2, modifiers)] },
              modifiers,
              backups: false,
              achievements: true,
              tournament: roundBrutes.length === 2 ? 'finals' : 'fight',
            });
            generatedFight = newGeneratedFight.data;
          } catch (error: unknown) {
            if (!(error instanceof Error)) {
              throw error;
            }
            LOGGER.log(`Error while generating a tournament fight between ${brute1.name} and ${brute2.name}, retrying...`);
            DISCORD().sendError(error);
          }

          retries++;
        }

        lastFight = generatedFight;

        // Create fight
        await prisma.fight.create({
          data: {
            ...lastFight,
            tournamentStep: step,
            tournament: { connect: { id: tournament.id } },
          },
          select: { id: true },
        });

        // Get fight winner
        const winner = isWinner(roundBrute1, lastFight) ? roundBrute1 : roundBrute2;
        const winnerId = winner.id;

        // Add winner to next round
        winners.push(winner);

        // Store XP for winner
        const winnerGains = gains[winnerId];
        if (!winnerGains) {
          gains[winnerId] = [DailyTournamentXpReward, 0];
        } else {
          winnerGains[0] += DailyTournamentXpReward;
        }

        step++;
      }

      // Continue with winners
      roundBrutes = [...winners];
      winners = [];
    }

    if (!lastFight) {
      throw new Error('No last fight');
    }

    // Get last fight winner
    const winner = roundBrutes[0];
    if (!winner) {
      throw new Error('No winner');
    }

    dailyWinners.push(winner.id);

    const loser = (JSON.parse(lastFight.fighters) as Fighter[])
      .find((fighter) => !fighter.master && fighter.id !== winner.id);
    if (!loser) {
      throw new Error('No loser');
    }

    const winnerBrute = await prisma.brute.findUnique({
      where: { id: winner.id },
      select: {
        id: true,
        userId: true,
        ranking: true,
        canRankUpSince: true,
        tournamentWins: true,
        ascensions: true,
      },
    });
    const loserBrute = await prisma.brute.findUnique({
      where: { id: loser.id },
      select: { id: true, ranking: true },
    });

    if (!winnerBrute || !loserBrute) {
      throw new Error(`Brute not found: ${winnerBrute?.id || loserBrute?.id}`);
    }

    // Only for real brutes
    if (winnerBrute.userId) {
      // Add 100 Gold to winner user
      await prisma.tournamentGold.create({
        data: {
          userId: winnerBrute.userId,
          date: today.toDate(),
          gold: DailyTournamentGoldReward,
          source: 'daily',
        },
        select: { id: true },
      });

      // Store gains
      const winnerGains = gains[winnerBrute.id];
      if (!winnerGains) {
        gains[winnerBrute.id] = [0, DailyTournamentGoldReward];
      } else {
        winnerGains[1] += DailyTournamentGoldReward;
      }

      // Add 1 tournament win to winner brute
      await prisma.brute.update({
        where: { id: winnerBrute.id },
        data: { tournamentWins: winnerBrute.tournamentWins + 1 },
        select: { id: true },
      });

      // Actualizar logro de torneos ganados
      const { updateAchievementProgress } = await import('./utils/achievements/updateAchievementProgress.js');
      const { AchievementType } = await import('@labrute/prisma');
      await updateAchievementProgress(prisma, winnerBrute.userId, AchievementType.WIN_TOURNAMENTS_TOTAL, 1);

      // Actualizar misión de ganar torneo
      const { updateMissionProgress } = await import('./utils/missions/updateMissionProgress.js');
      const { MissionType } = await import('@labrute/prisma');
      await updateMissionProgress(prisma, winnerBrute.userId, MissionType.WIN_TOURNAMENT, 1);

      // Allow rank up for winner if brute has enough wins
      if (!winnerBrute.canRankUpSince
        && (winnerBrute.tournamentWins + 1) >= getWinsNeededToRankUp(winnerBrute)) {
        await prisma.brute.update({
          where: { id: winnerBrute.id },
          data: { canRankUpSince: today.toDate() },
          select: { id: true },
        });
      }
    }

    // After tournament completes, clear references and trigger GC
    lastFight = null;
    winners = [];
    roundBrutes = [];
    triggerGC();
  }

  // Remove tournament registration for all processed brutes
  await prisma.brute.updateMany({
    where: {
      id: {
        in: registeredBrutes.map((brute) => brute.id),
      },
    },
    data: {
      registeredForTournament: false,
      nextTournamentDate: null,
      // Add current tournament data too
      currentTournamentDate: today.toDate(),
      currentTournamentStepWatched: 0,
    },
  });

  LOGGER.log(`${tournamentsToCreate} daily tournaments created`);

  return {
    registeredBrutes,
    gains,
    dailyWinners,
  };
};

const handleGlobalTournament = async (
  prisma: PrismaClient,
  modifiers: Modifiers,
  brutes: Pick<Brute, 'id'>[],
) => {
  // Keep track of gains
  const gains: Record<string, [number, number]> = {};

  const today = getGameDay();

  // Check if global tournament is already handled
  const globalTournament = await prisma.tournament.count({
    where: {
      date: today.toDate(),
      type: TournamentType.GLOBAL,
    },
  });

  if (globalTournament) {
    return { gains, globalWinnerId: null };
  }

  // Set tournament as invalid until it's finished
  await ServerState.setGlobalTournamentValid(prisma, false);

  if (brutes.length < 2) {
    return { gains, globalWinnerId: null };
  }

  LOGGER.log(`${brutes.length} brutes for global tournament`);

  // Shuffle brutes
  const shuffledBrutes = shuffle(brutes);

  // Create global tournament
  const tournament = await prisma.tournament.create({
    data: {
      date: today.toDate(),
      type: TournamentType.GLOBAL,
      rounds: 0,
    },
    select: { id: true },
  });

  // Separate brutes 1000 by 1000
  const brutesChunks = Array(Math.ceil(shuffledBrutes.length / 1000))
    .fill([])
    .map((_, index) => shuffledBrutes.slice(index * 1000, index * 1000 + 1000));

  // Set tourmanent participants separately, 1000 by 1000 to avoid insert error
  for (const brutesChunk of brutesChunks) {
    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        participants: {
          connect: brutesChunk.map((brute) => ({ id: brute.id })),
        },
      },
      select: { id: true },
    });
  }

  // For the global tournament, fight.tournamentStep represents the round number
  let round = 1;
  let roundBrutes = [...shuffledBrutes];
  let byes: typeof brutes = [];

  // Handle byes for first round (power of 2)
  if (roundBrutes.length !== 2 ** Math.floor(Math.log2(roundBrutes.length))) {
    // Get number of byes
    const byesCount = 2 ** (Math.floor(Math.log2(roundBrutes.length)) + 1) - roundBrutes.length;

    // Add byes
    byes = [...roundBrutes.splice(roundBrutes.length - byesCount, byesCount)];
  }

  // Create tournament steps
  while (roundBrutes.length > 1) {
    let nextBrutes: typeof brutes = [];

    for (let i = 0; i < roundBrutes.length - 1; i += 2) {
      const roundBrute1 = roundBrutes[i];
      const roundBrute2 = roundBrutes[i + 1];

      if (!roundBrute1 || !roundBrute2) {
        throw new Error(`Brute not found: ${roundBrute1?.id || roundBrute2?.id}`);
      }
      const brute1 = await prisma.brute.findUnique({
        where: { id: roundBrute1.id },
      });
      const brute2 = await prisma.brute.findUnique({
        where: { id: roundBrute2.id },
      });

      if (!brute1 || !brute2) {
        throw new Error(`Brute not found: ${brute1?.id || brute2?.id}`);
      }

      if (brute1.id === brute2.id) {
        throw new Error('Attempting to fight a brute against itself');
      }

      // Skip if no adversary
      if (!brute2) {
        nextBrutes.push(brute1);
        continue;
      }

      // Generate fight (retry if failed)
      let generatedFight: Prisma.FightCreateInput | null = null;
      let retries = 0;

      while (!generatedFight) {
        // Stop at 10 retries
        if (retries > 10) {
          throw new Error('Too many retries');
        }

        try {
          const newGeneratedFight = await generateFight({
            prisma,
            team1: { brutes: [getCalculatedBrute(brute1, modifiers)] },
            team2: { brutes: [getCalculatedBrute(brute2, modifiers)] },
            modifiers,
            backups: false,
            achievements: true,
            tournament: roundBrutes.length === 2 ? 'finals' : 'fight',
          });
          generatedFight = newGeneratedFight.data;
        } catch (error: unknown) {
          if (!(error instanceof Error)) {
            throw error;
          }
          LOGGER.log(`Error while generating a tournament fight between ${brute1.name} and ${brute2.name}, retrying...`);
          DISCORD().sendError(error);
        }

        retries++;
      }

      // Create fight
      await prisma.fight.create({
        data: {
          ...generatedFight,
          tournamentStep: round,
          tournament: { connect: { id: tournament.id } },
        },
        select: { id: true },
      });

      // Add winner to next round
      nextBrutes.push(brute1.name === generatedFight.winner ? brute1 : brute2);

      const winnerId = brute1.name === generatedFight.winner ? brute1.id : brute2.id;

      // Store XP for winner
      const winnerGains = gains[winnerId];
      if (!winnerGains) {
        gains[winnerId] = [GlobalTournamentXpReward, 0];
      } else {
        winnerGains[0] += GlobalTournamentXpReward;
      }

      // Clear fight reference after saving
      generatedFight = null;

      // Trigger GC every few fights to prevent buildup
      if (i % 100 === 0) {
        triggerGC();
      }
    }

    // Add byes to next round
    if (byes.length) {
      nextBrutes = [...nextBrutes, ...byes];
      byes.length = 0;
    }

    // Continue with next round
    roundBrutes = [];
    roundBrutes = [...nextBrutes];
    triggerGC(); // GC after each round
    round++;
  }

  if (roundBrutes.length !== 1) {
    throw new Error('Invalid tournament');
  }

  // Get winner user
  const winnerBrute = roundBrutes[0];

  if (!winnerBrute) {
    throw new Error('Winner brute not found');
  }

  const winnerUser = await prisma.user.findFirst({
    where: { brutes: { some: { id: winnerBrute.id } } },
    select: { id: true },
  });

  if (!winnerUser) {
    throw new Error('Winner user not found');
  }

  // Add 150 Gold to the winner user
  await prisma.tournamentGold.create({
    data: {
      userId: winnerUser.id,
      date: today.toDate(),
      gold: GlobalTournamentGoldReward,
      source: 'global',
    },
    select: { id: true },
  });

  // Store gains
  const winnerGains = gains[winnerBrute.id];
  if (!winnerGains) {
    gains[winnerBrute.id] = [0, GlobalTournamentGoldReward];
  } else {
    winnerGains[1] += GlobalTournamentGoldReward;
  }

  // Update tournament with rounds
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { rounds: round - 1 },
    select: { id: true },
  });

  // Set tournament as valid
  await ServerState.setGlobalTournamentValid(prisma, true);

  LOGGER.log('Global tournament created');

  return { gains, globalWinnerId: winnerBrute.id };
};

const handleCopaDelRey = async (
  prisma: PrismaClient,
  modifiers: Modifiers,
  dailyWinners: string[],
  globalWinnerId: string | null,
): Promise<Record<string, [number, number]>> => {
  const gains: Record<string, [number, number]> = {};
  const today = getGameDay();

  if (dailyWinners.length === 0 || !globalWinnerId) {
    return gains;
  }

  // Check if Copa del Rey already handled today
  const existingCopa = await prisma.tournament.count({
    where: {
      date: today.toDate(),
      type: { in: [TournamentType.COPA_DEL_REY, TournamentType.COPA_DEL_REY_SEMIFINAL] },
    },
  });
  if (existingCopa) {
    return gains;
  }

  let dailyChampionId: string;

  if (dailyWinners.length >= 2) {
    // Mini-tournament among daily winners to pick champion
    const shuffledWinners = shuffle(dailyWinners);
    const semifinalTournament = await prisma.tournament.create({
      data: {
        date: today.toDate(),
        type: TournamentType.COPA_DEL_REY_SEMIFINAL,
        rounds: 0,
      },
      select: { id: true },
    });
    await prisma.tournament.update({
      where: { id: semifinalTournament.id },
      data: {
        participants: {
          connect: shuffledWinners.map((id) => ({ id })),
        },
      },
      select: { id: true },
    });

    let roundBrutes = shuffledWinners.map((id) => ({ id }));
    let round = 1;

    while (roundBrutes.length > 1) {
      const nextBrutes: { id: string }[] = [];

      for (let i = 0; i < roundBrutes.length - 1; i += 2) {
        const id1 = roundBrutes[i]?.id;
        const id2 = roundBrutes[i + 1]?.id;
        if (!id1 || !id2) continue;

        const brute1 = await prisma.brute.findUnique({ where: { id: id1 } });
        const brute2 = await prisma.brute.findUnique({ where: { id: id2 } });
        if (!brute1 || !brute2 || brute1.id === brute2.id) continue;

        let generatedFight: Prisma.FightCreateInput | null = null;
        let retries = 0;
        while (!generatedFight && retries <= 10) {
          try {
            const result = await generateFight({
              prisma,
              team1: { brutes: [getCalculatedBrute(brute1, modifiers)] },
              team2: { brutes: [getCalculatedBrute(brute2, modifiers)] },
              modifiers,
              backups: false,
              achievements: true,
              tournament: roundBrutes.length === 2 ? 'finals' : 'fight',
            });
            generatedFight = result.data;
          } catch (err) {
            LOGGER.log(`Copa del Rey semifinal fight error, retry ${retries}`);
            retries++;
          }
        }
        if (!generatedFight) throw new Error('Failed to generate Copa del Rey semifinal fight');

        await prisma.fight.create({
          data: {
            ...generatedFight,
            tournamentStep: round,
            tournament: { connect: { id: semifinalTournament.id } },
          },
          select: { id: true },
        });

        const winnerId = brute1.name === generatedFight.winner ? brute1.id : brute2.id;
        nextBrutes.push({ id: winnerId });
      }

      roundBrutes = nextBrutes;
      round++;
    }

    dailyChampionId = roundBrutes[0]?.id ?? '';
    if (!dailyChampionId) throw new Error('No daily champion from semifinal');

    await prisma.tournament.update({
      where: { id: semifinalTournament.id },
      data: { rounds: round },
      select: { id: true },
    });
  } else {
    dailyChampionId = dailyWinners[0] ?? '';
  }

  if (!dailyChampionId) return gains;

  // Same brute won both: give reward directly, no final
  if (dailyChampionId === globalWinnerId) {
    const winnerBrute = await prisma.brute.findUnique({
      where: { id: dailyChampionId },
      select: { userId: true },
    });
    if (winnerBrute?.userId) {
      await prisma.tournamentGold.create({
        data: {
          userId: winnerBrute.userId,
          date: today.toDate(),
          gold: CopaDelReyGoldReward,
          source: 'copa_del_rey',
        },
        select: { id: true },
      });
      gains[dailyChampionId] = [CopaDelReyXpReward, CopaDelReyGoldReward];
    }
    LOGGER.log('Copa del Rey: same brute won daily and global, reward granted');
    return gains;
  }

  // Final: daily champion vs global winner
  const dailyChampion = await prisma.brute.findUnique({ where: { id: dailyChampionId } });
  const globalWinner = await prisma.brute.findUnique({ where: { id: globalWinnerId } });
  if (!dailyChampion || !globalWinner) return gains;

  const finalTournament = await prisma.tournament.create({
    data: {
      date: today.toDate(),
      type: TournamentType.COPA_DEL_REY,
      rounds: 1,
      participants: {
        connect: [{ id: dailyChampionId }, { id: globalWinnerId }],
      },
    },
    select: { id: true },
  });

  let generatedFight: Prisma.FightCreateInput | null = null;
  let retries = 0;
  while (!generatedFight && retries <= 10) {
    try {
      const result = await generateFight({
        prisma,
        team1: { brutes: [getCalculatedBrute(dailyChampion, modifiers)] },
        team2: { brutes: [getCalculatedBrute(globalWinner, modifiers)] },
        modifiers,
        backups: false,
        achievements: true,
        tournament: 'finals',
      });
      generatedFight = result.data;
    } catch (err) {
      LOGGER.log(`Copa del Rey final fight error, retry ${retries}`);
      retries++;
    }
  }
  if (!generatedFight) throw new Error('Failed to generate Copa del Rey final');

  await prisma.fight.create({
    data: {
      ...generatedFight,
      tournamentStep: 1,
      tournament: { connect: { id: finalTournament.id } },
    },
    select: { id: true },
  });

  const winnerId = dailyChampion.name === generatedFight.winner ? dailyChampionId : globalWinnerId;
  const winnerBrute = await prisma.brute.findUnique({
    where: { id: winnerId },
    select: { userId: true },
  });
  if (winnerBrute?.userId) {
    await prisma.tournamentGold.create({
      data: {
        userId: winnerBrute.userId,
        date: today.toDate(),
        gold: CopaDelReyGoldReward,
        source: 'copa_del_rey',
      },
      select: { id: true },
    });
    gains[winnerId] = [CopaDelReyXpReward, CopaDelReyGoldReward];
  }

  LOGGER.log('Copa del Rey created');
  return gains;
};

const handleUnlimitedGlobalTournament = async (
  prisma: PrismaClient,
  modifiers: Modifiers,
  brutes: Pick<Brute, 'id'>[],
) => {
  const today = getGameDay();

  // Check if unlimited global tournament is already handled
  const globalTournament = await prisma.tournament.count({
    where: {
      date: today.toDate(),
      type: TournamentType.UNLIMITED_GLOBAL,
    },
  });

  if (globalTournament) {
    return;
  }

  // Set tournament as invalid until it's finished
  await ServerState.setGlobalTournamentValid(prisma, false);

  if (brutes.length < 2) {
    return;
  }

  LOGGER.log(`${brutes.length} brutes for the unlimited global tournament`);

  // Shuffle brutes
  const shuffledBrutes = shuffle(brutes);

  // Create global tournament
  const tournament = await prisma.tournament.create({
    data: {
      date: today.toDate(),
      type: TournamentType.UNLIMITED_GLOBAL,
      rounds: 0,
    },
    select: { id: true },
  });

  // Separate brutes 1000 by 1000
  const brutesChunks = Array(Math.ceil(shuffledBrutes.length / 1000))
    .fill([])
    .map((_, index) => shuffledBrutes.slice(index * 1000, index * 1000 + 1000));

  // Set tourmanent participants separately, 1000 by 1000 to avoid insert error
  for (const brutesChunk of brutesChunks) {
    await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        participants: {
          connect: brutesChunk.map((brute) => ({ id: brute.id })),
        },
      },
      select: { id: true },
    });
  }

  // For the global tournament, fight.tournamentStep represents the round number
  let round = 1;
  let roundBrutes = [...shuffledBrutes];
  let byes: typeof brutes = [];

  // Handle byes for first round (power of 2)
  if (roundBrutes.length !== 2 ** Math.floor(Math.log2(roundBrutes.length))) {
    // Get number of byes
    const byesCount = 2 ** (Math.floor(Math.log2(roundBrutes.length)) + 1) - roundBrutes.length;

    // Add byes
    byes = [...roundBrutes.splice(roundBrutes.length - byesCount, byesCount)];
  }

  // Create tournament steps
  while (roundBrutes.length > 1) {
    let nextBrutes: typeof brutes = [];

    for (let i = 0; i < roundBrutes.length - 1; i += 2) {
      const roundBrute1 = roundBrutes[i];
      const roundBrute2 = roundBrutes[i + 1];

      if (!roundBrute1 || !roundBrute2) {
        throw new Error(`Brute not found: ${roundBrute1?.id || roundBrute2?.id}`);
      }
      const brute1 = await prisma.brute.findUnique({
        where: { id: roundBrute1.id },
      });
      const brute2 = await prisma.brute.findUnique({
        where: { id: roundBrute2.id },
      });

      if (!brute1 || !brute2) {
        throw new Error(`Brute not found: ${brute1?.id || brute2?.id}`);
      }

      if (brute1.id === brute2.id) {
        throw new Error('Attempting to fight a brute against itself');
      }

      // Skip if no adversary
      if (!brute2) {
        nextBrutes.push(brute1);
        continue;
      }

      // Generate fight (retry if failed)
      let generatedFight: Prisma.FightCreateInput | null = null;
      let retries = 0;

      while (!generatedFight) {
        // Stop at 10 retries
        if (retries > 10) {
          throw new Error('Too many retries');
        }

        try {
          const newGeneratedFight = await generateFight({
            prisma,
            team1: { brutes: [getCalculatedBrute(brute1, modifiers)] },
            team2: { brutes: [getCalculatedBrute(brute2, modifiers)] },
            modifiers,
            backups: false,
            achievements: true,
            tournament: roundBrutes.length === 2 ? 'finals' : 'fight',
          });
          generatedFight = newGeneratedFight.data;
        } catch (error: unknown) {
          if (!(error instanceof Error)) {
            throw error;
          }
          LOGGER.log(`Error while generating a tournament fight between ${brute1.name} and ${brute2.name}, retrying...`);
          DISCORD().sendError(error);
        }

        retries++;
      }

      // Create fight
      await prisma.fight.create({
        data: {
          ...generatedFight,
          tournamentStep: round,
          tournament: { connect: { id: tournament.id } },
        },
        select: { id: true },
      });

      // Add winner to next round
      nextBrutes.push(brute1.name === generatedFight.winner ? brute1 : brute2);

      generatedFight = null;

      if (i % 100 === 0) {
        triggerGC();
      }
    }

    // Add byes to next round
    if (byes.length) {
      nextBrutes = [...nextBrutes, ...byes];
      byes.length = 0;
    }

    // Continue with next round
    roundBrutes = [];
    roundBrutes = [...nextBrutes];
    triggerGC();
    round++;
  }

  if (roundBrutes.length !== 1) {
    throw new Error('Invalid tournament');
  }

  // Get winner user
  const winnerBrute = roundBrutes[0];

  if (!winnerBrute) {
    throw new Error('Winner brute not found');
  }

  const winnerUser = await prisma.user.findFirst({
    where: { brutes: { some: { id: winnerBrute.id } } },
    select: { id: true },
  });

  if (!winnerUser) {
    throw new Error('Winner user not found');
  }

  // Update tournament with rounds
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { rounds: round - 1 },
    select: { id: true },
  });

  // Set tournament as valid
  await ServerState.setGlobalTournamentValid(prisma, true);

  LOGGER.log('Unlimited global tournament created');
};

/**
 * Determina qué regla especial está activa hoy.
 * Usa getSpecialRuleForDate de core para consistencia con el endpoint getActiveSpecialRule.
 */
const getSpecialRuleForToday = (): SpecialTournamentRule =>
  getSpecialRuleForDate(dayjs.utc());

const handleSpecialTournament = async (
  prisma: PrismaClient,
  modifiers: Modifiers,
): Promise<Record<string, [number, number]>> => {
  const gains: Record<string, [number, number]> = {};
  const today = getGameDay();
  const tomorrow = today.add(1, 'day');

  // Verificar si ya se generó el torneo especial de hoy
  const existingSpecial = await prisma.tournament.findFirst({
    where: {
      type: TournamentType.SPECIAL,
      date: {
        gte: today.toDate(),
        lt: tomorrow.toDate(),
      },
    },
  });

  if (existingSpecial) {
    return gains;
  }

  // Determinar regla especial del día
  const specialRule = getSpecialRuleForToday();

  // Obtener todos los brutos activos (sin filtro de registro, todos entran automáticamente)
  const eligibleBrutes = await prisma.brute.findMany({
    where: {
      deletedAt: null,
      eventId: null,
      user: {
        isNot: null,
      },
    },
    select: {
      id: true,
      level: true,
      ranking: true,
      name: true,
    },
  });

  LOGGER.log(`[special-tournament] Regla ${specialRule} con ${eligibleBrutes.length} brutos elegibles`);

  // Necesitamos al menos 2 brutos para crear un torneo
  if (eligibleBrutes.length < 2) {
    LOGGER.log(`Not enough brutes for special tournament (${specialRule}): ${eligibleBrutes.length}`);
    return gains;
  }

  // Shuffle brutes
  const shuffledBrutes = shuffle(eligibleBrutes);

  // Crear grupos de hasta 64 brutos
  const tournamentsToCreate = Math.ceil(shuffledBrutes.length / 64);
  const tournaments: (typeof eligibleBrutes)[] = Array(tournamentsToCreate)
    .fill([])
    .map((_, index) => shuffledBrutes.slice(index * 64, index * 64 + 64));

  // Rellenar el último grupo con brutos generados (bots) para llegar a 64,
  // igual que en los torneos diarios, pero sin tocar flags de registro.
  if (tournaments.length && tournaments[tournaments.length - 1]?.length) {
    const lastTournament = tournaments[tournaments.length - 1];

    if (!lastTournament) {
      throw new Error('No last special tournament group');
    }

    const highestLevelBrute = lastTournament
      .slice() // no mutar el array original durante el sort
      .sort((a, b) => a.level - b.level)[lastTournament.length - 1]?.level;

    if (typeof highestLevelBrute === 'number') {
      // Obtener brutos generados (userId null) de nivel similar
      let generatedBrutes = await prisma.brute.findMany({
        where: {
          deletedAt: null,
          user: null,
          level: {
            lte: highestLevelBrute,
          },
        },
        select: {
          id: true,
          level: true,
          ranking: true,
          name: true,
        },
      });

      // Barajar bots disponibles
      generatedBrutes = shuffle(generatedBrutes);

      if (lastTournament.length < 64 && generatedBrutes.length) {
        lastTournament.push(...generatedBrutes.slice(0, 64 - lastTournament.length));
      }

      // Si aun así no llegamos a 64, descartamos este grupo para evitar brackets raros
      if (lastTournament.length !== 64) {
        LOGGER.log(`[special-tournament] Grupo incompleto descartado: ${lastTournament.length} participantes (regla ${specialRule})`);
        tournaments.pop();
      }
    }
  }

  // Ordenar brutes por ranking y nivel (igual que torneos diarios)
  const sortedTournaments = tournaments.map((tournament) => {
    const firstHalf: typeof eligibleBrutes = [];
    const secondHalf: typeof eligibleBrutes = [];
    const sortedTournament = tournament.sort((a, b) => {
      if (a.ranking === b.ranking) {
        return b.level - a.level;
      }
      return a.ranking - b.ranking;
    });

    // Alternate between first and second half
    for (const brute of sortedTournament) {
      if (firstHalf.length === secondHalf.length) {
        firstHalf.push(brute);
      } else {
        secondHalf.push(brute);
      }
    }

    return [...shuffle(firstHalf), ...shuffle(secondHalf)];
  });

  let createdSpecialCount = 0;

  // Crear torneos especiales
  for (const brutes of sortedTournaments) {
    // Crear torneo especial
    const tournament = await prisma.tournament.create({
      data: {
        date: today.toDate(),
        type: TournamentType.SPECIAL,
        specialRule,
        participants: {
          connect: brutes.map((brute) => ({ id: brute.id })),
        },
        rounds: 6,
      },
      select: { id: true, date: true },
    });

    // Crear tournament steps (igual que torneos diarios)
    let step = 1;
    let roundBrutes = [...brutes];
    let winners: typeof eligibleBrutes = [];
    let lastFight: Prisma.FightCreateInput | null = null;

    while (roundBrutes.length > 1) {
      for (let i = 0; i < roundBrutes.length - 1; i += 2) {
        const roundBrute1 = roundBrutes[i];
        const roundBrute2 = roundBrutes[i + 1];

        if (!roundBrute1 || !roundBrute2) {
          throw new Error(`Brute not found: ${roundBrute1?.id || roundBrute2?.id}`);
        }

        const brute1 = await prisma.brute.findUnique({
          where: { id: roundBrute1.id },
        });
        const brute2 = await prisma.brute.findUnique({
          where: { id: roundBrute2.id },
        });

        if (!brute1 || !brute2) {
          throw new Error(`Brute not found: ${brute1?.id || brute2?.id}`);
        }

        if (brute1.id === brute2.id) {
          throw new Error('Attempting to fight a brute against itself');
        }

        // Generate fight (retry if failed)
        let generatedFight: Prisma.FightCreateInput | null = null;
        let retries = 0;

        while (!generatedFight) {
          if (retries > 10) {
            throw new Error('Too many retries');
          }

          try {
            const newGeneratedFight = await generateFight({
              prisma,
              team1: { brutes: [getCalculatedBrute(brute1, modifiers)] },
              team2: { brutes: [getCalculatedBrute(brute2, modifiers)] },
              modifiers,
              backups: false,
              achievements: true,
              tournament: roundBrutes.length === 2 ? 'finals' : 'fight',
              specialRule,
            });
            generatedFight = newGeneratedFight.data;
          } catch (error: unknown) {
            if (!(error instanceof Error)) {
              throw error;
            }
            LOGGER.log(`Error while generating a special tournament fight between ${brute1.name} and ${brute2.name}, retrying...`);
            DISCORD().sendError(error);
          }

          retries++;
        }

        lastFight = generatedFight;

        // Create fight
        await prisma.fight.create({
          data: {
            ...lastFight,
            tournamentStep: step,
            tournament: { connect: { id: tournament.id } },
          },
          select: { id: true },
        });

        // Actualizar objetivos de participación en torneos especiales (ambos brutos)
        if (brute1.userId || brute2.userId) {
          const { updateDailyObjectiveProgress, updateWeeklyObjectiveProgress } = await import('./utils/objectives/updateObjectiveProgress.js');
          const { ObjectiveType } = await import('@labrute/prisma');
          if (brute1.userId) {
            await updateDailyObjectiveProgress(prisma, brute1.userId, ObjectiveType.COMPLETE_SPECIAL_FIGHTS, 1);
            await updateWeeklyObjectiveProgress(prisma, brute1.userId, ObjectiveType.COMPLETE_SPECIAL_FIGHTS, 1);
          }
          if (brute2.userId) {
            await updateDailyObjectiveProgress(prisma, brute2.userId, ObjectiveType.COMPLETE_SPECIAL_FIGHTS, 1);
            await updateWeeklyObjectiveProgress(prisma, brute2.userId, ObjectiveType.COMPLETE_SPECIAL_FIGHTS, 1);
          }
        }

        // Get fight winner
        const winner = isWinner(roundBrute1, lastFight) ? roundBrute1 : roundBrute2;
        const winnerId = winner.id;

        // Add winner to next round
        winners.push(winner);

        // Store XP for winner
        const winnerGains = gains[winnerId];
        if (!winnerGains) {
          gains[winnerId] = [SpecialTournamentXpReward, 0];
        } else {
          winnerGains[0] += SpecialTournamentXpReward;
        }

        step++;
      }

      // Continue with winners
      roundBrutes = [...winners];
      winners = [];
    }

    if (!lastFight) {
      throw new Error('No last fight');
    }

    // Get last fight winner
    const winner = roundBrutes[0];
    if (!winner) {
      throw new Error('No winner');
    }

    const loser = (JSON.parse(lastFight.fighters) as Fighter[])
      .find((fighter) => !fighter.master && fighter.id !== winner.id);
    if (!loser) {
      throw new Error('No loser');
    }

    const winnerBrute = await prisma.brute.findUnique({
      where: { id: winner.id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!winnerBrute) {
      throw new Error(`Winner brute not found: ${winner.id}`);
    }

    // Only for real brutes
    if (winnerBrute.userId) {
      const goldReward = SpecialTournamentGoldReward[specialRule];

      // Actualizar objetivos de ganar torneo especial
      const { updateDailyObjectiveProgress, updateWeeklyObjectiveProgress } = await import('./utils/objectives/updateObjectiveProgress.js');
      const { ObjectiveType } = await import('@labrute/prisma');
      await updateDailyObjectiveProgress(prisma, winnerBrute.userId, ObjectiveType.WIN_SPECIAL_TOURNAMENT, 1);
      await updateWeeklyObjectiveProgress(prisma, winnerBrute.userId, ObjectiveType.WIN_SPECIAL_TOURNAMENT, 1);

      // Add gold to winner user
      await prisma.tournamentGold.create({
        data: {
          userId: winnerBrute.userId,
          date: today.toDate(),
          gold: goldReward,
          source: 'special_tournament',
        },
        select: { id: true },
      });

      // Store gains
      const winnerGains = gains[winnerBrute.id];
      if (!winnerGains) {
        gains[winnerBrute.id] = [0, goldReward];
      } else {
        winnerGains[1] += goldReward;
      }
    }

    const fightsCount = step - 1;
    LOGGER.log(`[special-tournament] Torneo ${tournament.id} creado con ${brutes.length} participantes y ${fightsCount} peleas (regla ${specialRule})`);
    createdSpecialCount += 1;

    // After tournament completes, clear references and trigger GC
    lastFight = null;
    winners = [];
    roundBrutes = [];
    triggerGC();
  }

  LOGGER.log(`${createdSpecialCount} special tournaments created (rule: ${specialRule})`);

  return gains;
};

const handleSurvivalTournament = async (
  prisma: PrismaClient,
  modifiers: Modifiers,
) => {
  const today = getGameDay();

  // Solo ejecutar los viernes
  if (today.day() !== 5) {
    return;
  }

  const eventDate = today.toDate();

  // Obtener inscripciones explícitas
  const registrations = await prisma.survivalRegistration.findMany({
    where: {
      eventDate,
    },
    select: {
      userId: true,
      bruteId: true,
    },
  });

  const explicitByUser = new Map<string, string>();
  registrations.forEach((r: { userId: string; bruteId: string }) => {
    explicitByUser.set(r.userId, r.bruteId);
  });

  // Obtener todos los brutos elegibles (uno por usuario, máximo nivel por defecto)
  const brutesByUser = await prisma.brute.findMany({
    where: {
      deletedAt: null,
      eventId: null,
      userId: {
        not: null,
      },
    },
    select: {
      id: true,
      userId: true,
      level: true,
      ranking: true,
    },
  });

  const participantsIds: string[] = [];
  const bestBruteByUser = new Map<string, { id: string; level: number; ranking: number }>();

  for (const brute of brutesByUser) {
    if (!brute.userId) continue;
    const current = bestBruteByUser.get(brute.userId);
    if (!current || brute.level > current.level || (brute.level === current.level && brute.ranking < current.ranking)) {
      bestBruteByUser.set(brute.userId, {
        id: brute.id,
        level: brute.level,
        ranking: brute.ranking,
      });
    }
  }

  for (const [userId, best] of bestBruteByUser.entries()) {
    const explicit = explicitByUser.get(userId);
    participantsIds.push(explicit ?? best.id);
  }

  // Necesitamos al menos 2 participantes reales
  if (participantsIds.length < 2) {
    return;
  }

  // Crear torneo Survival (tipo CUSTOM) y conectar participantes
  const survivalTournament = await prisma.tournament.create({
    data: {
      date: today.toDate(),
      type: TournamentType.CUSTOM,
      rounds: 0,
      participants: {
        connect: participantsIds.map((id) => ({ id })),
      },
    },
    select: { id: true },
  });

  // Cargar brutos completos para el torneo Survival
  let roundBrutes = await prisma.brute.findMany({
    where: {
      id: { in: participantsIds },
    },
  });

  roundBrutes = shuffle(roundBrutes);

  // Torneo por rondas con byes para completar potencia de 2
  let round = 1;
  while (roundBrutes.length > 1) {
    const bracketSize = 2 ** Math.ceil(Math.log2(roundBrutes.length));
    const byesCount = bracketSize - roundBrutes.length;
    const byes = byesCount > 0 ? roundBrutes.splice(roundBrutes.length - byesCount, byesCount) : [];

    const nextRound: typeof roundBrutes = [...byes];

    for (let i = 0; i < roundBrutes.length - 1; i += 2) {
      const brute1 = roundBrutes[i];
      const brute2 = roundBrutes[i + 1];

      if (!brute1 || !brute2) {
        continue;
      }

      // Generar pelea y guardarla en DB (para ver el torneo Survival)
      let generatedFight: Prisma.FightCreateInput | null = null;
      let retries = 0;

      while (!generatedFight) {
        if (retries > 10) {
          throw new Error('Too many retries in Survival tournament');
        }

        try {
          const fight = await generateFight({
            prisma,
            team1: { brutes: [getCalculatedBrute(brute1, modifiers)] },
            team2: { brutes: [getCalculatedBrute(brute2, modifiers)] },
            modifiers,
            backups: false,
            achievements: false,
            tournament: 'fight',
          });
          generatedFight = fight.data;
        } catch (error: unknown) {
          if (!(error instanceof Error)) {
            throw error;
          }
          LOGGER.log(`Error while generating a Survival fight between ${brute1.name} and ${brute2.name}, retrying...`);
          DISCORD().sendError(error);
        }

        retries++;
      }

      // Crear pelea en DB
      await prisma.fight.create({
        data: {
          ...generatedFight,
          tournamentStep: round,
          tournament: { connect: { id: survivalTournament.id } },
        },
        select: { id: true },
      });

      // Elegir ganador por nombre
      const winner = brute1.name === generatedFight.winner ? brute1 : brute2;
      nextRound.push(winner);
    }

    roundBrutes = nextRound;
    round++;
  }

  const champion = roundBrutes[0];

  if (!champion) {
    return;
  }

  // Actualizar cantidad de rondas del torneo Survival
  await prisma.tournament.update({
    where: { id: survivalTournament.id },
    data: { rounds: round - 1 },
    select: { id: true },
  });

  // Marcar para eliminación todos los participantes excepto el campeón
  await prisma.brute.updateMany({
    where: {
      id: {
        in: participantsIds.filter((id) => id !== champion.id),
      },
    },
    data: {
      willBeDeletedAt: dayjs.utc().add(1, 'day').toDate(),
      deletionReason: BruteDeletionReason.EVENT_LOSS,
    },
  });

  // Ascender y reiniciar al campeón a nivel 1
  const fullChampion = await prisma.brute.findUnique({
    where: { id: champion.id },
    include: {
      user: true,
    },
  });

  if (fullChampion && fullChampion.user) {
    await resetBrute({
      prisma,
      user: fullChampion.user,
      brute: fullChampion,
      free: true,
      rankUp: true,
      ascended: undefined,
    });
  }
}

const storeGains = async (
  prisma: PrismaClient,
  dailyGains: Record<string, [number, number]>,
  globalGains: Record<string, [number, number]>,
) => {
  if (!Object.keys(dailyGains).length && !Object.keys(globalGains).length) {
    return;
  }

  const now = dayjs.utc().valueOf();

  // Add gains together
  const gains: Record<string, [number, number]> = {};

  for (const [bruteId, currentGains] of Object.entries(dailyGains)) {
    const bruteGains = gains[bruteId];
    if (!bruteGains) {
      gains[bruteId] = [currentGains[0], currentGains[1]];
    } else {
      bruteGains[0] += currentGains[0];
      bruteGains[1] += currentGains[1];
    }
  }

  for (const [bruteId, currentGains] of Object.entries(globalGains)) {
    const bruteGains = gains[bruteId];
    if (!bruteGains) {
      gains[bruteId] = [currentGains[0], currentGains[1]];
    } else {
      bruteGains[0] += currentGains[0];
      bruteGains[1] += currentGains[1];
    }
  }

  const today = getGameDay().toDate();
  const tomorrow = getGameTomorrow().toDate();

  // Store XP gains
  await prisma.tournamentXp.createMany({
    data: Object.entries(gains).map(([bruteId, [xp]]) => ({
      bruteId,
      date: today,
      xp,
    })),
  });

  // Create XP gains logs for tomorrow
  await prisma.log.createMany({
    data: Object.entries(gains).map(([bruteId, [xp, gold]]) => ({
      currentBruteId: bruteId,
      type: LogType.tournamentXp,
      xp,
      gold,
      date: tomorrow,
    })),
  });

  LOGGER.log(`${dayjs.utc().valueOf() - now}ms to store ${Object.keys(gains).length} xp gains`);
};

const handleXpGains = async (prisma: PrismaClient) => {
  const now = dayjs.utc().valueOf();
  const today = getGameDay();

  const count = await prisma.tournamentXp.count({
    where: {
      date: {
        lt: today.toDate(),
      },
    },
  });

  if (!count) {
    return;
  }

  await prisma.$transaction([
    // Update brutes XP
    prisma.$executeRaw`
      UPDATE "Brute" b
      SET xp = b.xp + txp.xp
      FROM (
          SELECT SUM(xp) xp, "bruteId"
          FROM "TournamentXp"
          WHERE date < ${today.toDate()}
          GROUP BY "bruteId"
      ) txp
      WHERE b.id = txp."bruteId"
    `,
    // Delete tournament XP
    prisma.tournamentXp.deleteMany({
      where: {
        date: {
          lt: today.toDate(),
        },
      },
    }),
  ]);

  LOGGER.log(`${dayjs.utc().valueOf() - now}ms to handle ${count} xp gains`);
};

const handleTournamentEarnings = async (prisma: PrismaClient) => {
  const now = dayjs.utc().valueOf();
  const today = getGameDay().toDate();

  const achievementCount = await prisma.tournamentAchievement.count({
    where: {
      date: {
        lt: today,
      },
    },
  });
  const goldCount = await prisma.tournamentGold.count({
    where: {
      date: {
        lt: today,
      },
    },
  });

  if (!achievementCount && !goldCount) {
    return;
  }

  await prisma.$transaction([
    // Upsert achievements
    prisma.$executeRaw`
      INSERT INTO "Achievement" ("name", "count", "bruteId", "userId")
      (SELECT ta."achievement" "name", ta."achievementCount" "count", b.id "bruteId", b."userId" "userId"
      FROM (
          SELECT SUM("achievementCount") "achievementCount", "achievement", "bruteId"
          FROM "TournamentAchievement"
          WHERE date < ${today}
          GROUP BY "bruteId", "achievement"
      ) ta
      LEFT JOIN "Brute" b
      ON ta."bruteId" = b.id)
      ON CONFLICT ("name", "bruteId") DO UPDATE
      SET "count" = "Achievement"."count" + EXCLUDED."count";
    `,
    // Delete tournament achievements
    prisma.tournamentAchievement.deleteMany({
      where: {
        date: {
          lt: today,
        },
      },
    }),
    // Add Gold to users
    prisma.$executeRaw`
      UPDATE "User" u
      SET gold = u.gold + tg.gold
      FROM (
          SELECT SUM(gold) gold, "userId"
          FROM "TournamentGold"
          WHERE date < ${today}
          GROUP BY "userId"
      ) tg
      WHERE u.id = tg."userId";
    `,
    // User log
    prisma.$executeRaw`
      INSERT INTO "UserLog" ("type", "userId", "gold")
      (SELECT 'GOLD_WIN', "userId", SUM(gold)
      FROM "TournamentGold"
      WHERE date < ${today}
      GROUP BY "userId");
    `,
    // Create GoldTransaction records for each TournamentGold before deleting
    prisma.$executeRaw`
      INSERT INTO "GoldTransaction" ("id", "userId", "amount", "source", "createdAt")
      SELECT 
        uuid_generate_v4(),
        "userId",
        gold,
        CASE 
          WHEN source = 'daily' THEN 'daily_tournament'
          WHEN source = 'global' THEN 'global_tournament'
          WHEN source = 'copa_del_rey' THEN 'copa_del_rey'
          WHEN source = 'special_tournament' THEN 'special_tournament'
          WHEN source = 'clan_tournament' THEN 'clan_tournament'
          ELSE 'tournament'
        END,
        CURRENT_TIMESTAMP
      FROM "TournamentGold"
      WHERE date < ${today};
    `,
    // Delete tournament gold
    prisma.$executeRaw`
      DELETE FROM "TournamentGold"
      WHERE date < ${today};
    `,
  ]);

  // Actualizar logros de oro ganado para todos los usuarios que recibieron oro
  if (goldCount > 0) {
    const { updateAchievementProgress } = await import('./utils/achievements/updateAchievementProgress.js');
    const { AchievementType } = await import('@labrute/prisma');
    
    // Obtener todos los usuarios que recibieron oro
    const usersWithGold = await prisma.$queryRaw<Array<{ userId: string; gold: bigint }>>`
      SELECT "userId", SUM(gold) as gold
      FROM "TournamentGold"
      WHERE date < ${today}
      GROUP BY "userId"
    `;
    
    // Actualizar logro de oro ganado para cada usuario
    for (const userGold of usersWithGold) {
      await updateAchievementProgress(
        prisma,
        userGold.userId,
        AchievementType.GAIN_GOLD_TOTAL,
        Number(userGold.gold),
      );
    }
  }

  LOGGER.log(`${dayjs.utc().valueOf() - now}ms to handle ${achievementCount} achievements and ${goldCount} gold earnings`);
};

const checkNameDuplicates = async (prisma: PrismaClient) => {
  // Get all brutes with duplicate names (grouped by name) (case insensitive)
  // not yet tagged for deletion
  const duplicates: {
    name: string;
    count: number;
    ids: string[];
  }[] = await prisma.$queryRaw`
    SELECT LOWER(name) name, COUNT(*) count, ARRAY_AGG(id ORDER BY "createdAt") ids
    FROM "Brute"
    WHERE "deletedAt" IS NULL
    AND "willBeDeletedAt" IS NULL
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1;
  `;

  if (!duplicates.length) {
    return;
  }

  // Get all brute ids (ignore first items)
  const bruteIds = duplicates.flatMap((duplicate) => duplicate.ids.slice(1));

  // Tag duplicates for deletion
  await prisma.brute.updateMany({
    where: {
      id: {
        in: bruteIds,
      },
    },
    data: {
      willBeDeletedAt: dayjs.utc().add(7, 'day').toDate(),
      deletionReason: BruteDeletionReason.DUPLICATE_NAME,
    },
  });

  // Get brutes that already have the name change item
  const bruteIdsWithItem = await prisma.inventoryItem.findMany({
    where: {
      type: InventoryItemType.nameChange,
      bruteId: {
        in: bruteIds,
      },
    },
    select: { bruteId: true },
  });

  // Add 1x name change item to those brutes
  await prisma.inventoryItem.updateMany({
    where: {
      bruteId: { in: bruteIdsWithItem.map((item) => item.bruteId ?? '') },
      type: InventoryItemType.nameChange,
    },
    data: {
      count: { increment: 1 },
    },
  });

  // Get brutes that don't have the name change item
  const bruteIdsWithoutItem = bruteIds.filter(
    (id) => !bruteIdsWithItem.some((item) => item.bruteId === id),
  );

  // Add 1x name change item to those brutes
  await prisma.inventoryItem.createMany({
    data: bruteIdsWithoutItem.map((id) => ({
      bruteId: id,
      type: InventoryItemType.nameChange,
      count: 1,
    })),
  });

  LOGGER.log(`Tagged ${bruteIds.length} brutes for deletion due to duplicate names`);
};

const deleteBrutes = async (prisma: PrismaClient) => {
  // Get all brutes tagged for deletion
  const brutes = await prisma.brute.findMany({
    where: {
      willBeDeletedAt: {
        lte: new Date(),
      },
    },
    select: {
      id: true,
      clanId: true,
      level: true,
      ranking: true,
      masterId: true,
    },
  });

  if (!brutes.length) {
    return;
  }

  // Separate brutes by chunk of 1000
  const bruteIds = brutes.map((brute) => brute.id);
  const bruteChunks = Array(Math.ceil(bruteIds.length / 1000))
    .fill([])
    .map((_, index) => bruteIds.slice(index * 1000, index * 1000 + 1000));

  // Delete brutes in chunks
  for (const chunk of bruteChunks) {
    await prisma.brute.updateMany({
      where: {
        id: {
          in: chunk,
        },
      },
      data: {
        deletedAt: new Date(),
        willBeDeletedAt: null,
        // Remove from clan
        clanId: null,
        // Delete join requests
        wantToJoinClanId: null,
      },
    });

    const joinedChunk = chunk.join(',');

    // Remove followers
    await prisma.$executeRaw`DELETE FROM "_Followers" WHERE "A" = ANY(STRING_TO_ARRAY(${joinedChunk}::text, ',')::uuid[]);`;

    // Remove from clan fighters
    await prisma.$executeRaw`DELETE FROM "_ClanWarAttackerFighters" WHERE "A" = ANY(STRING_TO_ARRAY(${joinedChunk}::text, ',')::uuid[]);`;
    await prisma.$executeRaw`DELETE FROM "_ClanWarDefenderFighters" WHERE "A" = ANY(STRING_TO_ARRAY(${joinedChunk}::text, ',')::uuid[]);`;
  }

  for (const brute of brutes) {
    // Update clan points
    if (brute.clanId) {
      await updateClanPoints(prisma, brute.clanId, 'remove', brute);
    }

    // Update master pupils count
    if (brute.masterId) {
      await prisma.brute.update({
        where: { id: brute.masterId },
        data: {
          pupilsCount: {
            decrement: 1,
          },
        },
      });
    }
  }

  LOGGER.log(`Deleted ${brutes.length} brutes tagged for deletion`);
};

// Handle modifiers
const handleModifiers = async (prisma: PrismaClient) => {
  // Check if current modifiers expired
  const modifiersExpired = await ServerState.areModifiersExpired(prisma);

  if (!modifiersExpired) {
    return ServerState.getModifiers(prisma);
  }

  const rolledModifiers: Modifiers = {};

  // Chaos every 1st day of the month
  if (dayjs().utc().date() === 1) {
    rolledModifiers[FightModifier.chaos] = true;
  }

  // Check if next modifiers are preselected
  const nextModifiers = await ServerState.getNextModifiers(prisma);

  if (keys(nextModifiers).length) {
    Object.assign(rolledModifiers, nextModifiers);

    // Reset next modifiers
    await ServerState.setNextModifiers(prisma, {});
  }

  if (!keys(rolledModifiers).length && Math.random() < DailyModifierSpawnChance) {
    const modifierCount = weightedRandom(DailyModifierCountOdds).count;

    const availableModifiers = [...DailyModifierOdds];

    // Roll modifiers
    for (let i = 0; i < modifierCount; i++) {
      const { modifier } = weightedRandom(availableModifiers);

      rolledModifiers[modifier] = true;

      // Remove modifier from available list
      availableModifiers.splice(availableModifiers.findIndex((m) => m.modifier === modifier), 1);
    }
  }

  // Store rolled modifiers
  await ServerState.setModifiers(prisma, rolledModifiers);

  if (keys(rolledModifiers).length) {
    DISCORD().sendModifiersNotification(rolledModifiers);
  }

  return rolledModifiers;
};

// Handle releases
const handleReleases = async (prisma: PrismaClient) => {
  // Get the latest release processed
  const latestRelease = await prisma.release.findFirst({
    orderBy: {
      date: 'desc',
    },
    take: 1,
  });

  if (latestRelease?.version === LAST_RELEASE.version) {
    return;
  }

  // Send release notifications
  try {
    // Discord notification
    await DISCORD().sendRelease(LAST_RELEASE);

    // User notifications
    const notifCount = await prisma.$executeRaw`
      INSERT INTO "Notification" ("userId", "message", "link", "severity")
      SELECT id, 'newPatchNotesAvailable', '/patch-notes', 'warning'
      FROM "User";
    `;

    LOGGER.log(`Sent ${notifCount} release notifications`);

    // Store latest release
    await prisma.release.create({
      data: {
        version: LAST_RELEASE.version,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      DISCORD().sendError(error);
    } else {
      console.error(error);
    }
  }
};

const cleanup = async (prisma: PrismaClient) => {
  const thirtyDaysAgo = dayjs.utc().subtract(30, 'day').toDate();

  let now = dayjs.utc().valueOf();

  // Delete logs older than 30 days
  const deletedLogs = await prisma.log.deleteMany({
    where: {
      date: {
        lt: thirtyDaysAgo,
      },
    },
  });

  if (deletedLogs.count) {
    LOGGER.log(`${dayjs.utc().valueOf() - now}ms to delete ${deletedLogs.count} logs older than 30 days`);
  }
  now = dayjs.utc().valueOf();

  // Delete notifications older than 30 days
  const deletedNotifications = await prisma.notification.deleteMany({
    where: {
      date: {
        lt: thirtyDaysAgo,
      },
    },
  });

  if (deletedNotifications.count) {
    LOGGER.log(`${dayjs.utc().valueOf() - now}ms to delete ${deletedNotifications.count} notifications older than 30 days`);
  }

  // Delete non tournament/war or favorited fights older than 30 days
  let deleted = null;
  while (deleted !== 0) {
    now = dayjs.utc().valueOf();

    deleted = await prisma.$executeRaw`
        DELETE FROM "Fight"
        WHERE id IN (SELECT id FROM "Fight"
          WHERE "date" < ${thirtyDaysAgo}
          AND "tournamentId" IS NULL
          AND "clanWarId" IS NULL
          AND "favoriteCount" = 0
          LIMIT 100000);
      `;

    if (deleted) {
      LOGGER.log(`${dayjs.utc().valueOf() - now}ms to delete ${deleted} fights older than 30 days`);
    }
  }

  // Delete deletedAt brutes older than 30 days
  deleted = null;
  while (deleted !== 0) {
    now = dayjs.utc().valueOf();

    deleted = await prisma.$executeRaw`
        DELETE FROM "Brute"
        WHERE id IN (SELECT id FROM "Brute"
          WHERE "deletedAt" < ${thirtyDaysAgo}
          LIMIT 1000);
      `;

    if (deleted) {
      LOGGER.log(`${dayjs.utc().valueOf() - now}ms to delete ${deleted} brutes older than 30 days`);
    }
  }
};

// Handle boss rotation (weekly)
const handleBossRotation = async (prisma: PrismaClient) => {
  const today = getGameDay();

  // Get all active clans
  const clans = await prisma.clan.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      boss: true,
      bossRotationDate: true,
    },
  });

  let rotated = 0;

  for (const clan of clans) {
    let shouldRotate = false;

    // If bossRotationDate is null, set it to today (first time)
    if (!clan.bossRotationDate) {
      await prisma.clan.update({
        where: { id: clan.id },
        data: {
          bossRotationDate: today.toDate(),
        },
      });
      continue;
    }

    // Check if 7 days have passed since last rotation
    const daysSinceRotation = today.diff(dayjs.utc(clan.bossRotationDate), 'day');
    if (daysSinceRotation >= 7) {
      shouldRotate = true;
    }

    if (shouldRotate) {
      // Get all bosses
      const allBosses = bosses.map((b) => b.name);
      
      // Find current boss index
      const currentIndex = allBosses.indexOf(clan.boss);
      
      // Rotate to next boss (cycle back to first if at end)
      const nextIndex = (currentIndex + 1) % allBosses.length;
      const nextBoss = allBosses[nextIndex];

      // Update clan: new boss, reset damage, update rotation date
      await prisma.clan.update({
        where: { id: clan.id },
        data: {
          boss: nextBoss,
          damageOnBoss: 0,
          bossRotationDate: today.toDate(),
        },
      });

      // Clear boss damages for this clan
      await prisma.bossDamage.deleteMany({
        where: { clanId: clan.id },
      });

      rotated++;
    }
  }

  if (rotated > 0) {
    LOGGER.log(`Rotated boss for ${rotated} clans`);
  }
};

const handleClanWars = async (
  prisma: PrismaClient,
  modifiers: Modifiers,
) => {
  const today = getGameDay();

  // Give rewards for finished clan wars
  const finishedClanWars = await prisma.clanWar.findMany({
    where: {
      status: ClanWarStatus.waitingForRewards,
      fights: {
        none: {
          date: today.toDate(),
        },
      },
    },
    select: {
      id: true,
      type: true,
      winnerId: true,
      attacker: {
        select: { id: true, elo: true },
      },
      defender: {
        select: { id: true, elo: true },
      },
    },
  });

  for (const clanWar of finishedClanWars) {
    if (!clanWar.winnerId) {
      throw new Error('No winner for clan war');
    }

    let attackerEloChange = 0;
    let defenderEloChange = 0;

    // No elo for friendly wars
    if (clanWar.type === ClanWarType.official) {
      const attackerElo = getNewElo(
        clanWar.attacker.elo,
        clanWar.defender.elo,
        clanWar.winnerId === clanWar.attacker.id,
      );
      const defenderElo = getNewElo(
        clanWar.defender.elo,
        clanWar.attacker.elo,
        clanWar.winnerId === clanWar.defender.id,
      );

      attackerEloChange = attackerElo - clanWar.attacker.elo;
      defenderEloChange = defenderElo - clanWar.defender.elo;

      // Update attacker
      await prisma.clan.update({
        where: { id: clanWar.attacker.id },
        data: {
          points: {
            increment: clanWar.winnerId === clanWar.attacker.id ? ClanWarPointReward : 0,
          },
          elo: attackerElo,
        },
      });

      // Update defender
      await prisma.clan.update({
        where: { id: clanWar.defender.id },
        data: {
          points: {
            increment: clanWar.winnerId === clanWar.defender.id ? ClanWarPointReward : 0,
          },
          elo: defenderElo,
        },
      });
    }

    // Actualizar logro de guerras de clan ganadas para el clan ganador
    const { updateAchievementProgress } = await import('./utils/achievements/updateAchievementProgress.js');
    const { AchievementType } = await import('@labrute/prisma');
    
    // Obtener todos los usuarios del clan ganador
    const winnerClanId = clanWar.winnerId;
    const winnerClan = await prisma.clan.findUnique({
      where: { id: winnerClanId },
      include: {
        brutes: {
          where: { deletedAt: null },
          select: { userId: true },
        },
      },
    });
    
    if (winnerClan) {
      const userIds = new Set(winnerClan.brutes.map((b) => b.userId).filter(Boolean));
      for (const userId of userIds) {
        if (userId) {
          await updateAchievementProgress(prisma, userId, AchievementType.CLAN_WARS_WON, 1);
        }
      }
    }

    // Update clan war status
    await prisma.clanWar.update({
      where: { id: clanWar.id },
      data: {
        status: ClanWarStatus.finished,
        attackerEloChange,
        defenderEloChange,
      },
    });
  }

  if (finishedClanWars.length) {
    LOGGER.log(`${finishedClanWars.length} clan war rewards given`);
    triggerGC();
  }

  // Get ongoing clan wars
  const clanWars = await prisma.clanWar.findMany({
    where: {
      status: ClanWarStatus.ongoing,
      date: {
        not: new Date(),
      },
    },
    select: {
      id: true,
      attackerId: true,
      defenderId: true,
      attackerWins: true,
      defenderWins: true,
      duration: true,
      fights: {
        select: { id: true, date: true },
      },
    },
  });

  triggerGC();

  let skipped = 0;
  let processed = 0;

  for (const clanWar of clanWars) {
    // Calcular el día basándose en las victorias acumuladas, no en el número de peleas
    // Esto asegura que el día refleje correctamente el progreso de la guerra
    const day = clanWar.attackerWins + clanWar.defenderWins + 1;

    // Check if a fight was already generated for the day
    if (clanWar.fights.some((fight) => dayjs.utc(fight.date).isSame(today))) {
      skipped++;
      continue;
    }

    // Get fighters planned for the day
    const attackers = await prisma.brute.findMany({
      where: {
        clanId: clanWar.attackerId,
        inClanWarAttackerFighters: {
          some: {
            clanWarId: clanWar.id,
            day,
          },
        },
      },
    });

    // Randomize attackers if none selected
    if (!attackers.length) {
      const attackerBrutes = await prisma.brute.findMany({
        where: {
          clanId: clanWar.attackerId,
          deletedAt: null,
          inClanWarAttackerFighters: {
            none: {
              clanWarId: clanWar.id,
            },
          },
        },
      });

      // End war if no attackers left
      if (!attackerBrutes.length) {
        await prisma.clanWar.update({
          where: { id: clanWar.id },
          data: {
            status: ClanWarStatus.waitingForRewards,
            winnerId: clanWar.defenderId,
          },
        });

        continue;
      }

      attackers.push(...shuffle(attackerBrutes).slice(0, ClanWarMaxParticipants));

      // Register attackers for the day
      await prisma.clanWarFighters.upsert({
        where: {
          clanWarId_day: {
            clanWarId: clanWar.id,
            day,
          },
        },
        create: {
          clanWar: { connect: { id: clanWar.id } },
          day,
          attackers: {
            connect: attackers.map((brute) => ({ id: brute.id })),
          },
        },
        update: {
          attackers: {
            connect: attackers.map((brute) => ({ id: brute.id })),
          },
        },
      });
    }

    const defenders = await prisma.brute.findMany({
      where: {
        clanId: clanWar.defenderId,
        inClanWarDefenderFighters: {
          some: {
            clanWarId: clanWar.id,
            day,
          },
        },
      },
    });

    // Randomize defenders if none selected
    if (!defenders.length) {
      const defenderBrutes = await prisma.brute.findMany({
        where: {
          clanId: clanWar.defenderId,
          deletedAt: null,
          inClanWarDefenderFighters: {
            none: {
              clanWarId: clanWar.id,
            },
          },
        },
      });

      // End war if no defenders left
      if (!defenderBrutes.length) {
        await prisma.clanWar.update({
          where: { id: clanWar.id },
          data: {
            status: ClanWarStatus.waitingForRewards,
            winnerId: clanWar.attackerId,
          },
        });

        continue;
      }

      defenders.push(...shuffle(defenderBrutes).slice(0, ClanWarMaxParticipants));

      // Register attackers for the day
      await prisma.clanWarFighters.upsert({
        where: {
          clanWarId_day: {
            clanWarId: clanWar.id,
            day,
          },
        },
        create: {
          clanWar: { connect: { id: clanWar.id } },
          day,
          defenders: {
            connect: defenders.map((brute) => ({ id: brute.id })),
          },
        },
        update: {
          defenders: {
            connect: defenders.map((brute) => ({ id: brute.id })),
          },
        },
      });
    }

    // Generate fight (retry if failed)
    let generatedFight: Prisma.FightCreateInput | null = null;
    let retries = 0;
    while (!generatedFight) {
      // Stop at 10 retries
      if (retries > 10) {
        throw new Error('Too many retries');
      }

      try {
        const newGeneratedFight = await generateFight({
          prisma,
          team1: { brutes: attackers.map((brute) => getCalculatedBrute(brute, modifiers)) },
          team2: { brutes: defenders.map((brute) => getCalculatedBrute(brute, modifiers)) },
          modifiers,
          backups: false,
          achievements: true,
          clanWar: true,
        });
        generatedFight = newGeneratedFight.data;
      } catch (error: unknown) {
        if (!(error instanceof Error)) {
          throw error;
        }
        LOGGER.log(`Error while generating a clan war fight between ${clanWar.attackerId} and ${clanWar.defenderId}, retrying...`);
        DISCORD().sendError(error);
      }

      retries++;
    }

    // Create fight
    await prisma.fight.create({
      data: {
        ...generatedFight,
        clanWar: { connect: { id: clanWar.id } },
      },
      select: { id: true },
    });

    const winner = attackers.some((brute) => generatedFight && isWinner(brute, generatedFight))
      ? 'attacker'
      : 'defender';

    if (winner === 'attacker') {
      clanWar.attackerWins++;
    } else {
      clanWar.defenderWins++;
    }

    const shouldEnd = (clanWar.defenderWins > (clanWar.duration / 2))
      || (clanWar.attackerWins > (clanWar.duration / 2))
      || day >= clanWar.duration;

    // Update clan war
    await prisma.clanWar.update({
      where: { id: clanWar.id },
      data: {
        status: shouldEnd
          ? ClanWarStatus.waitingForRewards
          : ClanWarStatus.ongoing,
        attackerWins: clanWar.attackerWins,
        defenderWins: clanWar.defenderWins,
        winnerId: shouldEnd
          ? clanWar.attackerWins > clanWar.defenderWins
            ? clanWar.attackerId
            : clanWar.defenderId
          : null,
      },
    });

    // Clear fight reference
    generatedFight = null;

    processed++;

    // Trigger GC every 10 clan war fights
    if (processed % 10 === 0) {
      triggerGC();
    }
  }

  // Final GC after all clan wars processed
  if (processed > 0) {
    triggerGC();
  }

  if (clanWars.length - skipped) {
    LOGGER.log(`${clanWars.length - skipped} clan wars handled`);
  }

  // Get clans participating in clan wars
  const clans = await prisma.clan.findMany({
    where: {
      deletedAt: null,
      participateInClanWar: true,
      attacks: {
        none: {
          status: { not: ClanWarStatus.finished },
        },
      },
      defenses: {
        none: {
          status: { not: ClanWarStatus.finished },
        },
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      elo: 'desc',
    },
  });

  // Create new clan wars (pairing clans)
  let created = 0;

  for (let i = 0; i < clans.length; i += 2) {
    const attackerId = clans[i]?.id;
    const defenderId = clans[i + 1]?.id;

    if (!attackerId || !defenderId) {
      break;
    }

    await prisma.clanWar.create({
      data: {
        attacker: { connect: { id: attackerId } },
        defender: { connect: { id: defenderId } },
      },
    });

    created++;
  }

  if (created) {
    LOGGER.log(`${created} new clan wars created`);
  }
};

const handleClanTournaments = async (
  prisma: PrismaClient,
  modifiers: Modifiers,
) => {
  const today = getGameDay().toDate();

  // XP y oro se acumulan y se guardan via TournamentXp / TournamentGold
  const xpByBrute: Record<string, number> = {};
  const goldByUser: Record<string, number> = {};

  // Obtener torneos de clan del día que aún no fueron procesados
  const tournaments = await prisma.clanTournament.findMany({
    where: {
      date: today,
      status: ClanTournamentStatus.PENDING,
    },
    include: {
      participants: {
        include: {
          clan: {
            select: { id: true, name: true },
          },
        },
      },
      wars: true,
    },
  });

  if (!tournaments.length) {
    return;
  }

  const simulateWar = async (
    clanAId: string,
    clanBId: string,
  ) => {
    // Obtener brutos activos de cada clan
    const [brutesA, brutesB] = await Promise.all([
      prisma.brute.findMany({
        where: {
          clanId: clanAId,
          deletedAt: null,
        },
      }),
      prisma.brute.findMany({
        where: {
          clanId: clanBId,
          deletedAt: null,
        },
      }),
    ]);

    const maxPerClan = 10;
    const N = Math.min(
      maxPerClan,
      brutesA.length,
      brutesB.length,
    );

    if (!N) {
      // Si algún clan no tiene brutos, no hay duelos; empate sin ganador
      return {
        attackerWins: 0,
        defenderWins: 0,
        fightIds: [] as string[],
        winnerClanId: null as string | null,
      };
    }

    const attackers = shuffle(brutesA).slice(0, N);
    const defenders = shuffle(brutesB).slice(0, N);

    let attackerWins = 0;
    let defenderWins = 0;
    const fightIds: string[] = [];

    const duelsToPlay = N;

    const playDuel = async (attacker: Brute, defender: Brute) => {
      // Generate fight (retry if failed)
      let generatedFight: Prisma.FightCreateInput | null = null;
      let retries = 0;

      while (!generatedFight) {
        if (retries > 10) {
          throw new Error('Too many retries in clan tournament duel');
        }

        try {
          const result = await generateFight({
            prisma,
            team1: { brutes: [getCalculatedBrute(attacker, modifiers)] },
            team2: { brutes: [getCalculatedBrute(defender, modifiers)] },
            modifiers,
            backups: false,
            achievements: true,
          });
          generatedFight = result.data;
        } catch (error: unknown) {
          if (!(error instanceof Error)) {
            throw error;
          }
          LOGGER.log(`Error while generating a clan tournament duel between ${attacker.name} and ${defender.name}, retrying...`);
          DISCORD().sendError(error);
        }

        retries += 1;
      }

      const created = await prisma.fight.create({
        data: generatedFight,
        select: { id: true, winner: true },
      });

      fightIds.push(created.id);

      // Asignar victoria
      const winnerIsAttacker = isWinner(attacker, generatedFight);
      if (winnerIsAttacker) {
        attackerWins += 1;
        xpByBrute[attacker.id] = (xpByBrute[attacker.id] ?? 0) + 1;
      } else {
        defenderWins += 1;
        xpByBrute[defender.id] = (xpByBrute[defender.id] ?? 0) + 1;
      }
    };

    for (let i = 0; i < duelsToPlay; i += 1) {
      const attacker = attackers[i];
      const defender = defenders[i];
      if (!attacker || !defender) {
        // Algún clan se quedó corto (debería estar cubierto por N, pero por seguridad)
        // Contamos esto como victoria para el que sí tiene bruto
        if (attacker && !defender) {
          attackerWins += 1;
        } else if (!attacker && defender) {
          defenderWins += 1;
        }
        // Sin pelea generada
        // eslint-disable-next-line no-continue
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await playDuel(attacker, defender);
    }

    // Desempate simple si hace falta: duelo extra aleatorio hasta que alguien gane
    let safety = 0;
    while (attackerWins === defenderWins && safety < 5) {
      const attacker = attackers[Math.floor(Math.random() * attackers.length)];
      const defender = defenders[Math.floor(Math.random() * defenders.length)];
      if (!attacker || !defender) break;
      // eslint-disable-next-line no-await-in-loop
      await playDuel(attacker, defender);
      safety += 1;
    }

    let winnerClanId: string | null = null;
    if (attackerWins > defenderWins) {
      winnerClanId = clanAId;
    } else if (defenderWins > attackerWins) {
      winnerClanId = clanBId;
    }

    return {
      attackerWins,
      defenderWins,
      fightIds,
      winnerClanId,
    };
  };

  for (const tournament of tournaments) {
    if (tournament.participants.length < 2) {
      // Nada que hacer, marcar como terminado sin ganador
      await prisma.clanTournament.update({
        where: { id: tournament.id },
        data: {
          status: ClanTournamentStatus.FINISHED,
          rounds: 0,
        },
      });
      // eslint-disable-next-line no-continue
      continue;
    }

    await prisma.clanTournament.update({
      where: { id: tournament.id },
      data: {
        status: ClanTournamentStatus.ONGOING,
      },
    });

    if (tournament.format === ClanTournamentFormat.ELIMINATION) {
      // Torneo de eliminación directa (bracket)
      let currentClans = shuffle(tournament.participants);
      const totalParticipants = currentClans.length;
      let round = 1;

      while (currentClans.length > 1) {
        const nextRoundClans: typeof currentClans = [];

        for (let i = 0; i < currentClans.length; i += 2) {
          const clanA = currentClans[i];
          const clanB = currentClans[i + 1];

          if (clanA && !clanB) {
            // Bye, clanA avanza solo
            nextRoundClans.push(clanA);
            // eslint-disable-next-line no-continue
            continue;
          }

          if (!clanA || !clanB) {
            // Inconsistencia rara, saltar
            // eslint-disable-next-line no-continue
            continue;
          }

          // Crear guerra vacía
          const war = await prisma.clanTournamentWar.create({
            data: {
              tournamentId: tournament.id,
              round,
              attackerClanId: clanA.clanId,
              defenderClanId: clanB.clanId,
            },
            select: { id: true },
          });

          const {
            attackerWins,
            defenderWins,
            fightIds,
            winnerClanId,
          } = await simulateWar(clanA.clanId, clanB.clanId);

          await prisma.clanTournamentWar.update({
            where: { id: war.id },
            data: {
              attackerWins,
              defenderWins,
              fightIds,
              winnerClanId,
            },
          });

          // Progreso de misiones de clan: duelos ganados y victoria de guerra diaria
          await incrementClanMission(prisma, clanA.clanId, ClanMissionType.WEEKLY_DUELS_WON, attackerWins);
          await incrementClanMission(prisma, clanB.clanId, ClanMissionType.WEEKLY_DUELS_WON, defenderWins);
          if (winnerClanId) {
            await incrementClanMission(prisma, winnerClanId, ClanMissionType.DAILY_CLAN_WAR_WIN, 1);
          }

          const winnerParticipant = winnerClanId === clanA.clanId ? clanA : clanB;
          if (winnerParticipant) {
            nextRoundClans.push(winnerParticipant);
          }
        }

        currentClans = nextRoundClans;
        round += 1;
      }

      const champion = currentClans[0];

      await prisma.clanTournament.update({
        where: { id: tournament.id },
        data: {
          status: ClanTournamentStatus.FINISHED,
          rounds: Math.ceil(Math.log2(totalParticipants)),
        },
      });

      if (champion) {
        // Recompensa final torneo eliminación
        const championBrutes = await prisma.brute.findMany({
          where: {
            clanId: champion.clanId,
            deletedAt: null,
          },
          select: {
            id: true,
            userId: true,
          },
        });

        for (const brute of championBrutes) {
          xpByBrute[brute.id] = (xpByBrute[brute.id] ?? 0) + 3;
          if (brute.userId) {
            goldByUser[brute.userId] = (goldByUser[brute.userId] ?? 0) + 150;
          }
        }

        // Guardar posición final
        await prisma.clanTournamentClan.updateMany({
          where: {
            tournamentId: tournament.id,
            clanId: champion.clanId,
          },
          data: {
            finalPosition: 1,
          },
        });

        // Misión semanal: torneo jugado esta semana
        await incrementClanMission(prisma, champion.clanId, ClanMissionType.WEEKLY_TOURNAMENTS_PLAYED, 1);
      }

      // Todos los participantes cuentan como haber jugado este torneo
      for (const participant of tournament.participants) {
        await incrementClanMission(prisma, participant.clanId, ClanMissionType.WEEKLY_TOURNAMENTS_PLAYED, 1);
      }
    } else {
      // Liga todos contra todos
      const participants = tournament.participants;
      const duelWinsByClan: Record<string, number> = {};

      // Generar todas las guerras (round robin)
      let round = 1;
      for (let i = 0; i < participants.length; i += 1) {
        for (let j = i + 1; j < participants.length; j += 1) {
          const clanA = participants[i];
          const clanB = participants[j];
          if (!clanA || !clanB) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const war = await prisma.clanTournamentWar.create({
            data: {
              tournamentId: tournament.id,
              round,
              attackerClanId: clanA.clanId,
              defenderClanId: clanB.clanId,
            },
            select: { id: true },
          });

          const {
            attackerWins,
            defenderWins,
            fightIds,
            winnerClanId,
          } = await simulateWar(clanA.clanId, clanB.clanId);

          await prisma.clanTournamentWar.update({
            where: { id: war.id },
            data: {
              attackerWins,
              defenderWins,
              fightIds,
              winnerClanId,
            },
          });

          // Sumar puntos de liga
          if (winnerClanId) {
            await prisma.clanTournamentClan.updateMany({
              where: {
                tournamentId: tournament.id,
                clanId: winnerClanId,
              },
              data: {
                points: { increment: 1 },
              },
            });

            // Victoria diaria de guerra en día de torneo
            await incrementClanMission(prisma, winnerClanId, ClanMissionType.DAILY_CLAN_WAR_WIN, 1);
          }

          // Sumar duelos ganados para desempate
          duelWinsByClan[clanA.clanId] = (duelWinsByClan[clanA.clanId] ?? 0) + attackerWins;
          duelWinsByClan[clanB.clanId] = (duelWinsByClan[clanB.clanId] ?? 0) + defenderWins;

          // Misiones: duelos ganados en la semana
          await incrementClanMission(prisma, clanA.clanId, ClanMissionType.WEEKLY_DUELS_WON, attackerWins);
          await incrementClanMission(prisma, clanB.clanId, ClanMissionType.WEEKLY_DUELS_WON, defenderWins);

          round += 1;
        }
      }

      // Calcular posiciones finales
      const updatedParticipants = await prisma.clanTournamentClan.findMany({
        where: { tournamentId: tournament.id },
        include: {
          clan: {
            select: { id: true, name: true },
          },
        },
      });

      const sorted = updatedParticipants.slice().sort((a, b) => {
        if (a.points !== b.points) {
          return b.points - a.points;
        }
        const aWins = duelWinsByClan[a.clanId] ?? 0;
        const bWins = duelWinsByClan[b.clanId] ?? 0;
        if (aWins !== bWins) {
          return bWins - aWins;
        }
        // Desempate final por seed (más bajo primero)
        return a.seed - b.seed;
      });

      for (let index = 0; index < sorted.length; index += 1) {
        const participant = sorted[index];
        if (!participant) continue;
        // eslint-disable-next-line no-await-in-loop
        await prisma.clanTournamentClan.update({
          where: { id: participant.id },
          data: { finalPosition: index + 1 },
        });
      }

      await prisma.clanTournament.update({
        where: { id: tournament.id },
        data: {
          status: ClanTournamentStatus.FINISHED,
          rounds: sorted.length > 1 ? sorted.length - 1 : 1,
        },
      });

      const champion = sorted[0];
      if (champion) {
        const championBrutes = await prisma.brute.findMany({
          where: {
            clanId: champion.clanId,
            deletedAt: null,
          },
          select: {
            id: true,
            userId: true,
          },
        });

        for (const brute of championBrutes) {
          xpByBrute[brute.id] = (xpByBrute[brute.id] ?? 0) + 4;
          if (brute.userId) {
            goldByUser[brute.userId] = (goldByUser[brute.userId] ?? 0) + 200;
          }
        }

        // Misión semanal: torneo jugado esta semana (liga)
        await incrementClanMission(prisma, champion.clanId, ClanMissionType.WEEKLY_TOURNAMENTS_PLAYED, 1);
      }
    }
  }

  // Persistir XP de brutos del torneo de clan
  if (Object.keys(xpByBrute).length) {
    await prisma.tournamentXp.createMany({
      data: Object.entries(xpByBrute).map(([bruteId, xp]) => ({
        bruteId,
        date: today,
        xp,
      })),
    });
  }

  // Persistir oro para usuarios
  if (Object.keys(goldByUser).length) {
    await prisma.tournamentGold.createMany({
      data: Object.entries(goldByUser).map(([userId, gold]) => ({
        userId,
        date: today,
        gold,
        source: 'clan_tournament',
      })),
    });
  }

  LOGGER.log(`${tournaments.length} clan tournaments handled`);
};

const handleEventFinish = async (prisma: PrismaClient) => {
  // Get last event
  const lastEvent = await prisma.event.findFirst({
    orderBy: {
      date: 'desc',
    },
    take: 1,
  });

  // Don't start another if last one is not finished
  if (lastEvent && lastEvent.status !== EventStatus.finished) {
    return;
  }

  // Don't start another if the pause is not over
  if (lastEvent && dayjs.utc().isBefore(dayjs.utc(lastEvent.finishedAt).add(EventPauseDuration, 'day'))) {
    return;
  }

  // Create new event
  const maxLevel = randomBetween(20, 120);
  const newEvent = await prisma.event.create({
    data: {
      maxLevel,
    },
    select: { id: true },
  });

  // Notify users
  const notifications = await prisma.$executeRaw`
    INSERT INTO "Notification" ("userId", "message", "link")
    SELECT id, 'event.started', ${`{bruteName}/event/${newEvent.id}`}
    FROM "User";
  `;

  LOGGER.log(`New event created with max level ${maxLevel}. ${notifications} notifications sent`);
};

const handleEventTournament = async (
  prisma: PrismaClient,
  modifiers: Modifiers,
) => {
  // Get last event
  const lastEvent = await prisma.event.findFirst({
    where: {
      status: { not: EventStatus.finished },
    },
    orderBy: {
      date: 'desc',
    },
    take: 1,
    include: {
      brutes: {
        select: { id: true },
      },
      tournament: {
        select: {
          id: true,
          rounds: true,
        },
      },
    },
  });

  if (!lastEvent) {
    return;
  }

  // No brutes, increase event date
  if (!lastEvent.brutes.length && !lastEvent.sortedBrutes.length) {
    await prisma.event.update({
      where: { id: lastEvent.id },
      data: {
        date: dayjs.utc(lastEvent.date).add(1, 'day').toDate(),
      },
    });

    return;
  }

  // Less than 2 days, skip
  if (dayjs.utc().diff(dayjs.utc(lastEvent.date), 'days') < 2) {
    return;
  }

  if (!lastEvent.tournament) {
    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        date: lastEvent.date,
        type: TournamentType.BATTLE_ROYALE,
        rounds: 0,
        eventId: lastEvent.id,
      },
      select: {
        id: true,
        rounds: true,
      },
    });

    // Shuffle brutes
    const shuffledBrutes = shuffle(lastEvent.brutes);

    const bruteIds = shuffledBrutes.map((brute) => brute.id);

    // Store shuffled brutes
    await prisma.event.update({
      where: { id: lastEvent.id },
      data: {
        sortedBrutes: {
          set: bruteIds,
        },
      },
    });

    // Update last event with sorted brutes and tournament
    lastEvent.sortedBrutes = bruteIds;
    lastEvent.tournament = tournament;
  }

  if (!lastEvent.tournament) {
    throw new Error('Tournament not found');
  }

  // Check if today's round is already done
  if (lastEvent.tournament.rounds + 1 >= dayjs.utc().diff(dayjs.utc(lastEvent.date), 'days')) {
    return;
  }

  LOGGER.log(`Event ${lastEvent.id} ongoing with ${lastEvent.sortedBrutes.length} brutes`);

  // For the battle royale event tournament, fight.tournamentStep represents the round number
  const round = lastEvent.tournament.rounds + 1;
  const roundBrutes = [...lastEvent.sortedBrutes];
  let nextBrutes: string[] = [];

  // Handle byes for first round (power of 2)
  if (roundBrutes.length !== 2 ** Math.floor(Math.log2(roundBrutes.length))) {
    // Get number of byes
    const byesCount = 2 ** (Math.floor(Math.log2(roundBrutes.length)) + 1) - roundBrutes.length;

    // Add byes
    nextBrutes = [...roundBrutes.splice(roundBrutes.length - byesCount, byesCount)];
  }

  for (let i = 0; i < roundBrutes.length - 1; i += 2) {
    const roundBrute1 = roundBrutes[i];
    const roundBrute2 = roundBrutes[i + 1];

    // Brute 1 not found, skip
    if (!roundBrute1) {
      if (roundBrute2) {
        nextBrutes.push(roundBrute2);
      }
      continue;
    }

    // Brute 2 not found, skip
    if (!roundBrute2) {
      nextBrutes.push(roundBrute1);
      continue;
    }

    const brute1 = await prisma.brute.findUnique({
      where: { id: roundBrute1 },
    });
    const brute2 = await prisma.brute.findUnique({
      where: { id: roundBrute2 },
    });

    if (!brute1 || !brute2) {
      throw new Error(`Brute not found: ${brute1?.id || brute2?.id}`);
    }

    if (brute1.id === brute2.id) {
      throw new Error(`Attempted to fight same brute: ${brute1.name}`);
    }

    // Skip if no adversary
    if (!brute2) {
      nextBrutes.push(brute1.id);
      continue;
    }

    // Generate fight (retry if failed)
    let generatedFight: Prisma.FightCreateInput | null = null;
    let retries = 0;

    while (!generatedFight) {
      // Stop at 10 retries
      if (retries > 10) {
        throw new Error('Too many retries');
      }

      try {
        const newGeneratedFight = await generateFight({
          prisma,
          team1: { brutes: [getCalculatedBrute(brute1, modifiers)] },
          team2: { brutes: [getCalculatedBrute(brute2, modifiers)] },
          modifiers,
          backups: false,
          achievements: false,
        });
        generatedFight = newGeneratedFight.data;
      } catch (error: unknown) {
        if (!(error instanceof Error)) {
          throw error;
        }
        LOGGER.log(`Error while generating a tournament fight between ${brute1.name} and ${brute2.name}, retrying...`);
        DISCORD().sendError(error);
      }

      retries++;
    }

    // Create fight
    await prisma.fight.create({
      data: {
        ...generatedFight,
        tournamentStep: round,
        tournament: { connect: { id: lastEvent.tournament.id } },
      },
      select: { id: true },
    });

    // Add winner to next round
    nextBrutes.push(brute1.name === generatedFight.winner ? brute1.id : brute2.id);

    // Clear fight reference and trigger GC periodically
    generatedFight = null;

    if (i % 50 === 0) {
      triggerGC();
    }
  }

  // Tournament ends if only one brute left
  if (nextBrutes.length === 1) {
    const winner = nextBrutes[0];

    if (!winner) {
      throw new Error('Winner brute not found');
    }

    // Actualizar logro de llegar a la final para el ganador
    const winnerBruteForFinal = await prisma.brute.findUnique({
      where: { id: winner },
      select: { userId: true },
    });

    if (winnerBruteForFinal?.userId) {
      const { updateAchievementProgress } = await import('./utils/achievements/updateAchievementProgress.js');
      const { AchievementType } = await import('@labrute/prisma');
      await updateAchievementProgress(prisma, winnerBruteForFinal.userId, AchievementType.EVENTS_FINAL_REACHED, 1);

      // Actualizar misión de llegar a la final del evento
      const { updateMissionProgress } = await import('./utils/missions/updateMissionProgress.js');
      const { MissionType } = await import('@labrute/prisma');
      await updateMissionProgress(prisma, winnerBruteForFinal.userId, MissionType.REACH_EVENT_FINAL, 1);
    }

    // Update event
    await prisma.event.update({
      where: { id: lastEvent.id },
      data: {
        status: EventStatus.finished,
        winnerId: winner,
        finishedAt: new Date(),
      },
    });

    // Delete all other brutes
    const brutesToDelete = lastEvent.brutes.filter((brute) => brute.id !== winner) ?? [];

    // Separate brutes 1000 by 1000
    const brutesChunks = Array(Math.ceil(brutesToDelete.length / 1000))
      .fill([])
      .map((_, index) => brutesToDelete.slice(index * 1000, index * 1000 + 1000));

    for (const brutesChunk of brutesChunks) {
      await prisma.brute.updateMany({
        where: {
          id: {
            in: brutesChunk.map((brute) => brute.id),
          },
        },
        data: {
          willBeDeletedAt: dayjs.utc().add(3, 'day').toDate(),
          deletionReason: BruteDeletionReason.EVENT_LOSS,
        },
      });
    }

    LOGGER.log(`Marked ${brutesToDelete.length} brutes for deletion from event ${lastEvent.id}`);

    // Make winner an official brute
    const winnerBrute = await prisma.brute.update({
      where: { id: winner },
      data: {
        eventId: null,
      },
      select: {
        id: true,
        userId: true,
        destinyPath: true,
        level: true,
        ranking: true,
        eventId: true,
        xp: true,
        ascensions: true,
        ascendedWeapons: true,
        ascendedSkills: true,
        ascendedPets: true,
      },
    });

    // Reset brute
    await resetBrute({
      prisma,
      brute: winnerBrute,
      free: true,
    });

    if (!winnerBrute.userId) {
      throw new Error('Winner user not found');
    }

    // Add achievement
    await increaseAchievement(
      prisma,
      winnerBrute.userId,
      winnerBrute.id,
      AchievementName.battleRoyaleWin,
    );

    // Actualizar logro de eventos ganados
    const { updateAchievementProgress } = await import('./utils/achievements/updateAchievementProgress.js');
    const { AchievementType } = await import('@labrute/prisma');
    await updateAchievementProgress(prisma, winnerBrute.userId, AchievementType.EVENTS_WON, 1);

    // Actualizar misión de ganar evento
    const { updateMissionProgress } = await import('./utils/missions/updateMissionProgress.js');
    const { MissionType } = await import('@labrute/prisma');
    await updateMissionProgress(prisma, winnerBrute.userId, MissionType.WIN_EVENT, 1);

    LOGGER.log(`Event ${lastEvent.id} finished with winner ${winnerBrute.id}`);
  }

  // Update event sorted brutes and tournament rounds
  await prisma.event.update({
    where: { id: lastEvent.id },
    data: {
      sortedBrutes: nextBrutes,
      tournament: {
        update: {
          rounds: round,
        },
      },
    },
    select: { id: true },
  });

  if (lastEvent.status === EventStatus.starting) {
    // Update event status
    await prisma.event.update({
      where: { id: lastEvent.id },
      data: {
        status: EventStatus.ongoing,
        maxRound: Math.ceil(Math.log2(lastEvent.sortedBrutes.length)),
      },
    });
  }

  LOGGER.log(`Round ${round} of event ${lastEvent.id} completed`);
};

export const dailyJob = (prisma: PrismaClient) => async () => {
  try {
    logMemory('START');

    // Releases
    await handleReleases(prisma);
    logMemory('After releases');

    // Rotate clan bosses (weekly)
    await handleBossRotation(prisma);
    logMemory('After boss rotation');

    // Asegurar próxima temporada de pase de batalla (si la actual termina en ≤1 día)
    const { ensureNextBattlePassSeason, updateCurrentSeasonRewards } = await import('./utils/battlePass/ensureNextSeason.js');
    await ensureNextBattlePassSeason(prisma).catch((err: Error) => {
      LOGGER.log('ensureNextBattlePassSeason error:');
      LOGGER.log(err?.message ?? String(err));
    });
    // Actualizar recompensas de la temporada actual si tiene las antiguas
    await updateCurrentSeasonRewards(prisma).catch((err: Error) => {
      LOGGER.log('updateCurrentSeasonRewards error:');
      LOGGER.log(err?.message ?? String(err));
    });
    logMemory('After ensureNextBattlePassSeason');

    // Roll daily modifiers
    const modifiers = await handleModifiers(prisma);
    logMemory('After modifiers');

    // Refresh chaos seeds
    refreshChaosSeeds(modifiers);

    // Clan missions (daily + weekly)
    await ensureDailyClanMissions(prisma);
    await ensureWeeklyClanMissions(prisma);
    logMemory('After clan missions generation');

    if (process.env.NODE_ENV === 'production' || GENERATE_TOURNAMENTS_IN_DEV) {
      // Update server state to hold traffic
      ServerState.setReady(false);

      // Get unregistered brutes that fought in the last 24 hours
      const unregisteredBrutes = await prisma.brute.findMany({
        where: {
          deletedAt: null,
          eventId: null,
          registeredForTournament: false,
          lastFight: {
            gte: dayjs.utc().subtract(1, 'day').toDate(),
          },
          user: {
            isNot: null,
          },
        },
        select: { id: true },
      });
      logMemory('After fetching unregistered brutes');

      // Handle daily tournaments
      const {
        registeredBrutes,
        gains: dailyGains,
        dailyWinners,
      } = await handleDailyTournaments(prisma, modifiers);
      logMemory('After daily tournaments');
      triggerGC();

      // Handle global tournament
      const { gains: globalGains, globalWinnerId } = await handleGlobalTournament(prisma, modifiers, registeredBrutes);
      logMemory('After global tournament');
      triggerGC();

      // Handle Copa del Rey (daily champion vs global winner)
      const copaGains = await handleCopaDelRey(prisma, modifiers, dailyWinners, globalWinnerId);
      logMemory('After Copa del Rey');
      triggerGC();

      // Handle unlimited global tournament
      await handleUnlimitedGlobalTournament(prisma, modifiers, unregisteredBrutes);
      logMemory('After unlimited global tournament');
      triggerGC();

      // Handle special tournament
      const specialGains = await handleSpecialTournament(prisma, modifiers);
      logMemory('After special tournament');
      triggerGC();

      // Handle Survival weekly tournament (viernes)
      await handleSurvivalTournament(prisma, modifiers);
      logMemory('After Survival tournament');
      triggerGC();

      // Handle clan tournaments (clan vs clan)
      await handleClanTournaments(prisma, modifiers);
      logMemory('After clan tournaments');
      triggerGC();

      // Store gains (merge daily, global, Copa del Rey, and special tournament)
      const mergedGlobalGains = { ...globalGains };
      for (const [bruteId, [xp, gold]] of Object.entries(copaGains)) {
        const existing = mergedGlobalGains[bruteId];
        if (!existing) {
          mergedGlobalGains[bruteId] = [xp, gold];
        } else {
          mergedGlobalGains[bruteId] = [existing[0] + xp, existing[1] + gold];
        }
      }
      // Merge special tournament gains
      for (const [bruteId, [xp, gold]] of Object.entries(specialGains)) {
        const existing = mergedGlobalGains[bruteId];
        if (!existing) {
          mergedGlobalGains[bruteId] = [xp, gold];
        } else {
          mergedGlobalGains[bruteId] = [existing[0] + xp, existing[1] + gold];
        }
      }
      await storeGains(prisma, dailyGains, mergedGlobalGains);
      logMemory('After storing gains');
    }

    // Handle clan wars
    await handleClanWars(prisma, modifiers);
    logMemory('After clan wars');

    // Handle events
    await handleEventFinish(prisma);
    logMemory('After event finish');
    await handleEventTournament(prisma, modifiers);
    logMemory('After event tournament');
    ServerState.setCurrentEvent(undefined);

    // Delete brutes tagged for deletion
    await deleteBrutes(prisma);
    logMemory('After deleting brutes');

    // Update server state to release traffic
    ServerState.setReady(true);

    // Grant beta achievement to all brutes who don't have it yet
    await grantBetaAchievement(prisma);
    logMemory('After granting beta achievement');

    // Grant bug achievements to all admins who don't have it yet
    await grantBugAchievement(prisma);
    logMemory('After granting bug achievement');

    // Handle XP won the previous day
    await handleXpGains(prisma);
    logMemory('After handling XP gains');

    // Handle tournament earnings from the previous day
    await handleTournamentEarnings(prisma);
    logMemory('After handling tournament earnings');

    // Check name duplicates
    await checkNameDuplicates(prisma);
    logMemory('After checking name duplicates');

    // Clean up DB
    await cleanup(prisma);
    logMemory('After cleanup');

    // Update known issues
    await DISCORD().updateKnownIssues(knownIssues);

    LOGGER.info('Daily job completed');
  } catch (error: unknown) {
    if (!(error instanceof Error)) {
      throw error;
    }
    DISCORD().sendError(error);
    // Delete misformatted tournaments
    await deleteMisformattedTournaments(prisma);

    // Update server state to release traffic
    ServerState.setReady(true);
  }
};
