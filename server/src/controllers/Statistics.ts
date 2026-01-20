import { PrismaClient } from '@labrute/prisma';
import type { Request, Response } from 'express';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { getCalculatedBrute, ExpectedError, NotFoundError } from '@labrute/core';
import { ServerState } from '../utils/ServerState.js';

export interface BruteStatistics {
  id: string;
  name: string;
  // Combate
  totalFights: number;
  victories: number;
  losses: number;
  winRate: number;
  maxWinStreak: number;
  currentWinStreak: number;
  totalDamage: number;
  maxDamage: number;
  averageDamage: number;
  flawlessWins: number;
  // Progreso
  level: number;
  totalXP: number;
  ascensions: number;
  resets: number;
  // Torneos
  tournamentWins: number;
  tournamentParticipations: number;
  // Eventos
  eventsParticipated: number;
  eventsFinalReached: number;
  eventsWon: number;
  // Clanes
  clanWarsParticipated: number;
  clanWarsWon: number;
  clanPointsContributed: number;
  // Habilidades y armas
  uniqueSkillsUsed: number;
  uniqueWeaponsUsed: number;
  // Tiempo
  daysSinceCreation: number;
  lastFightDate: Date | null;
}

export interface UserStatistics {
  // Combate
  totalFights: number;
  totalVictories: number;
  totalLosses: number;
  overallWinRate: number;
  maxWinStreak: number;
  totalDamage: number;
  maxDamage: number;
  averageDamage: number;
  flawlessWins: number;
  // Progreso
  maxLevel: number;
  totalXP: number;
  totalAscensions: number;
  totalResets: number;
  totalGold: number;
  // Torneos
  totalTournamentWins: number;
  totalTournamentParticipations: number;
  // Eventos
  totalEventsParticipated: number;
  totalEventsFinalReached: number;
  totalEventsWon: number;
  // Clanes
  totalClanWarsParticipated: number;
  totalClanWarsWon: number;
  totalClanPointsContributed: number;
  // Habilidades y armas
  totalUniqueSkillsUsed: number;
  totalUniqueWeaponsUsed: number;
  // Brutes
  totalBrutes: number;
  activeBrutes: number;
  // Tiempo
  daysSinceFirstBrute: number;
  consecutiveDaysPlayed: number;
  // Comparativas
  brutes: BruteStatistics[];
}

export const Statistics = {
  /**
   * Obtener estadísticas del usuario (generales y por bruto)
   */
  get: (prisma: PrismaClient) => async (
    req: Request,
    res: Response<UserStatistics>,
  ) => {
    try {
      const authed = await auth(prisma, req);

      // Obtener todos los brutes del usuario
      const brutes = await prisma.brute.findMany({
        where: {
          userId: authed.id,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          level: true,
          xp: true,
          victories: true,
          losses: true,
          ascensions: true,
          resets: true,
          tournamentWins: true,
          createdAt: true,
          lastFight: true,
          eventId: true,
          clanId: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Obtener modificadores para cálculos
      const modifiers = await ServerState.getModifiers(prisma);

      // Calcular estadísticas por bruto
      const bruteStats: BruteStatistics[] = [];

      for (const brute of brutes) {
        // Obtener peleas del bruto
        const fights = await prisma.fight.findMany({
          where: {
            OR: [
              { brute1Id: brute.id },
              { brute2Id: brute.id },
            ],
          },
          select: {
            id: true,
            winner: true,
            steps: true,
            fighters: true,
            date: true,
          },
          orderBy: {
            date: 'asc',
          },
        });

        const totalFights = fights.length;
        let victories = 0;
        let losses = 0;
        let currentStreak = 0;
        let maxStreak = 0;
        let totalDamage = 0;
        let maxDamage = 0;
        let flawlessWins = 0;

        // Calcular racha de victorias
        for (const fight of fights) {
          const won = fight.winner === brute.name;
          if (won) {
            victories++;
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            losses++;
            currentStreak = 0;
          }
        }

        // Calcular daño total y máximo
        for (const fight of fights) {
          try {
            const steps = JSON.parse(fight.steps) as Array<{ a: string; f?: number; d?: number }>;
            const fighters = JSON.parse(fight.fighters) as Array<{ id: string; index: number; type?: string }>;
            const bruteFighter = fighters.find((f) => f.id === brute.id && (f.type === 'brute' || !f.type));
            
            if (bruteFighter) {
              let fightDamage = 0;
              for (const step of steps) {
                if (step.f === bruteFighter.index && typeof step.d === 'number') {
                  fightDamage += step.d;
                }
              }
              totalDamage += fightDamage;
              maxDamage = Math.max(maxDamage, fightDamage);
            }
          } catch {
            // Ignorar errores de parsing
          }
        }

        // Obtener peleas ganadas sin recibir daño (flawless)
        // Esto requiere analizar los steps más detalladamente, por ahora lo dejamos en 0
        // TODO: Implementar cálculo de flawless wins

        // Obtener participaciones en torneos
        const tournamentParticipations = await prisma.tournament.count({
          where: {
            participants: {
              some: {
                id: brute.id,
              },
            },
          },
        });

        // Obtener eventos participados
        const eventsParticipated = brute.eventId ? 1 : 0;
        // TODO: Contar eventos históricos si se guardan

        // Obtener habilidades y armas únicas usadas
        const allFights = await prisma.fight.findMany({
          where: {
            OR: [
              { brute1Id: brute.id },
              { brute2Id: brute.id },
            ],
          },
          select: {
            steps: true,
            fighters: true,
          },
        });

        const uniqueSkills = new Set<string>();
        const uniqueWeapons = new Set<string>();

        for (const fight of allFights) {
          try {
            const steps = JSON.parse(fight.steps) as Array<{ a: string; s?: unknown; w?: unknown }>;
            const fighters = JSON.parse(fight.fighters) as Array<{ id: string; index: number; type?: string }>;
            const bruteFighter = fighters.find((f) => f.id === brute.id && (f.type === 'brute' || !f.type));

            if (bruteFighter) {
              for (const step of steps) {
                // Habilidades
                if (step.a === 'SkillActivate' && step.s) {
                  const skill = step.s as { id?: string };
                  if (skill.id) {
                    uniqueSkills.add(skill.id);
                  }
                }
                // Armas (necesitaríamos analizar más pasos)
                // Por ahora usamos las armas del brute
              }
            }
          } catch {
            // Ignorar errores
          }
        }

        // Obtener armas únicas del brute (de sus datos)
        const fullBrute = await prisma.brute.findUnique({
          where: { id: brute.id },
        });

        if (fullBrute) {
          const calculatedBrute = getCalculatedBrute(fullBrute, modifiers);
          if (calculatedBrute.weapons) {
            Object.keys(calculatedBrute.weapons).forEach((weapon) => {
              uniqueWeapons.add(weapon);
            });
          }
        }

        // Obtener estadísticas de clanes
        let clanWarsParticipated = 0;
        let clanWarsWon = 0;
        let clanPointsContributed = 0;

        if (brute.clanId) {
          // Contar participaciones en guerras de clan
          const clanWarFighters = await prisma.clanWarFighters.findMany({
            where: {
              OR: [
                { attackers: { some: { id: brute.id } } },
                { defenders: { some: { id: brute.id } } },
              ],
            },
            include: {
              clanWar: {
                select: {
                  winnerId: true,
                  attackerId: true,
                  defenderId: true,
                },
              },
            },
          });

          clanWarsParticipated = clanWarFighters.length;
          clanWarsWon = clanWarFighters.filter((cwf) => {
            const war = cwf.clanWar;
            if (!war.winnerId) return false;
            const bruteClanId = brute.clanId;
            return (war.attackerId === bruteClanId && war.winnerId === war.attackerId)
              || (war.defenderId === bruteClanId && war.winnerId === war.defenderId);
          }).length;
        }

        const winRate = totalFights > 0 ? (victories / totalFights) * 100 : 0;
        const averageDamage = totalFights > 0 ? totalDamage / totalFights : 0;

        bruteStats.push({
          id: brute.id,
          name: brute.name,
          totalFights,
          victories,
          losses,
          winRate: Math.round(winRate * 100) / 100,
          maxWinStreak: maxStreak,
          currentWinStreak: currentStreak,
          totalDamage,
          maxDamage,
          averageDamage: Math.round(averageDamage * 100) / 100,
          flawlessWins: 0, // TODO: Implementar
          level: brute.level,
          totalXP: brute.xp,
          ascensions: brute.ascensions,
          resets: brute.resets,
          tournamentWins: brute.tournamentWins,
          tournamentParticipations,
          eventsParticipated,
          eventsFinalReached: 0, // TODO: Implementar
          eventsWon: 0, // TODO: Implementar
          clanWarsParticipated,
          clanWarsWon,
          clanPointsContributed: 0, // TODO: Implementar
          uniqueSkillsUsed: uniqueSkills.size,
          uniqueWeaponsUsed: uniqueWeapons.size,
          daysSinceCreation: Math.floor(
            (Date.now() - brute.createdAt.getTime()) / (1000 * 60 * 60 * 24),
          ),
          lastFightDate: brute.lastFight,
        });
      }

      // Calcular estadísticas generales (suma de todos los brutes)
      const totalFights = bruteStats.reduce((sum, b) => sum + b.totalFights, 0);
      const totalVictories = bruteStats.reduce((sum, b) => sum + b.victories, 0);
      const totalLosses = bruteStats.reduce((sum, b) => sum + b.losses, 0);
      const overallWinRate = totalFights > 0 ? (totalVictories / totalFights) * 100 : 0;
      const maxWinStreak = Math.max(...bruteStats.map((b) => b.maxWinStreak), 0);
      const totalDamage = bruteStats.reduce((sum, b) => sum + b.totalDamage, 0);
      const maxDamage = Math.max(...bruteStats.map((b) => b.maxDamage), 0);
      const averageDamage = totalFights > 0 ? totalDamage / totalFights : 0;
      const flawlessWins = bruteStats.reduce((sum, b) => sum + b.flawlessWins, 0);
      const maxLevel = Math.max(...bruteStats.map((b) => b.level), 0);
      const totalXP = bruteStats.reduce((sum, b) => sum + b.totalXP, 0);
      const totalAscensions = bruteStats.reduce((sum, b) => sum + b.ascensions, 0);
      const totalResets = bruteStats.reduce((sum, b) => sum + b.resets, 0);
      const totalTournamentWins = bruteStats.reduce((sum, b) => sum + b.tournamentWins, 0);
      const totalTournamentParticipations = bruteStats.reduce((sum, b) => sum + b.tournamentParticipations, 0);
      const totalEventsParticipated = bruteStats.reduce((sum, b) => sum + b.eventsParticipated, 0);
      const totalEventsFinalReached = bruteStats.reduce((sum, b) => sum + b.eventsFinalReached, 0);
      const totalEventsWon = bruteStats.reduce((sum, b) => sum + b.eventsWon, 0);
      const totalClanWarsParticipated = bruteStats.reduce((sum, b) => sum + b.clanWarsParticipated, 0);
      const totalClanWarsWon = bruteStats.reduce((sum, b) => sum + b.clanWarsWon, 0);
      const totalClanPointsContributed = bruteStats.reduce((sum, b) => sum + b.clanPointsContributed, 0);

      // Habilidades y armas únicas totales (unión de todos los brutes)
      const allUniqueSkills = new Set<string>();
      const allUniqueWeapons = new Set<string>();
      bruteStats.forEach((b) => {
        // Esto es aproximado, idealmente deberíamos calcularlo desde las peleas
        // Por ahora usamos los valores individuales
      });

      // Obtener todas las peleas del usuario para calcular habilidades/armas únicas
      const allUserFights = await prisma.fight.findMany({
        where: {
          OR: brutes.map((b) => [
            { brute1Id: b.id },
            { brute2Id: b.id },
          ]).flat(),
        },
        select: {
          steps: true,
          fighters: true,
        },
      });

      const bruteIdsSet = new Set(brutes.map((b) => b.id));

      for (const fight of allUserFights) {
        try {
          const steps = JSON.parse(fight.steps) as Array<{ a: string; s?: unknown; w?: unknown }>;
          const fighters = JSON.parse(fight.fighters) as Array<{ id: string; index: number; type?: string }>;

          for (const fighter of fighters) {
            if (bruteIdsSet.has(fighter.id) && (fighter.type === 'brute' || !fighter.type)) {
              for (const step of steps) {
                if (step.a === 'SkillActivate' && step.s) {
                  const skill = step.s as { id?: string };
                  if (skill.id) {
                    allUniqueSkills.add(skill.id);
                  }
                }
              }
            }
          }
        } catch {
          // Ignorar errores
        }
      }

        // Armas únicas de todos los brutes (obtener brutes completos)
        const fullBrutes = await prisma.brute.findMany({
          where: {
            userId: authed.id,
            deletedAt: null,
          },
        });

        for (const brute of fullBrutes) {
          const calculatedBrute = getCalculatedBrute(brute, modifiers);
          if (calculatedBrute.weapons) {
            Object.keys(calculatedBrute.weapons).forEach((weapon) => {
              allUniqueWeapons.add(weapon);
            });
          }
        }

      const totalBrutes = brutes.length;
      const activeBrutes = brutes.filter((b) => b.lastFight && 
        Date.now() - b.lastFight.getTime() < 7 * 24 * 60 * 60 * 1000).length;

      const firstBrute = brutes[0];
      const daysSinceFirstBrute = firstBrute
        ? Math.floor((Date.now() - firstBrute.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const user = await prisma.user.findUnique({
        where: { id: authed.id },
        select: {
          consecutiveDaysPlayed: true,
        },
      });

      res.send({
        totalFights,
        totalVictories,
        totalLosses,
        overallWinRate: Math.round(overallWinRate * 100) / 100,
        maxWinStreak,
        totalDamage,
        maxDamage,
        averageDamage: Math.round(averageDamage * 100) / 100,
        flawlessWins,
        maxLevel,
        totalXP,
        totalAscensions,
        totalResets,
        totalGold: (await prisma.user.findUnique({
          where: { id: authed.id },
          select: { gold: true },
        }))?.gold || 0,
        totalTournamentWins,
        totalTournamentParticipations,
        totalEventsParticipated,
        totalEventsFinalReached,
        totalEventsWon,
        totalClanWarsParticipated,
        totalClanWarsWon,
        totalClanPointsContributed,
        totalUniqueSkillsUsed: allUniqueSkills.size,
        totalUniqueWeaponsUsed: allUniqueWeapons.size,
        totalBrutes,
        activeBrutes,
        daysSinceFirstBrute,
        consecutiveDaysPlayed: user?.consecutiveDaysPlayed || 0,
        brutes: bruteStats,
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  /**
   * Obtener estadísticas de otro usuario por nombre de usuario
   */
  getByUsername: (prisma: PrismaClient) => async (
    req: Request<{ username: string }>,
    res: Response<UserStatistics & { userName: string }>,
  ) => {
    try {
      // Autenticar al usuario que hace la petición (para seguridad)
      await auth(prisma, req);

      const { username } = req.params;

      if (!username) {
        throw new ExpectedError('Nombre de usuario requerido');
      }

      // Buscar usuario por nombre
      const targetUser = await prisma.user.findFirst({
        where: {
          name: username,
          bannedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!targetUser) {
        throw new NotFoundError('Usuario no encontrado');
      }

      // Reutilizar la lógica de get pero para el usuario objetivo
      const brutes = await prisma.brute.findMany({
        where: {
          userId: targetUser.id,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          level: true,
          xp: true,
          victories: true,
          losses: true,
          ascensions: true,
          resets: true,
          tournamentWins: true,
          createdAt: true,
          lastFight: true,
          eventId: true,
          clanId: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const modifiers = await ServerState.getModifiers(prisma);

      const bruteStats: BruteStatistics[] = [];

      for (const brute of brutes) {
        const fights = await prisma.fight.findMany({
          where: {
            OR: [
              { brute1Id: brute.id },
              { brute2Id: brute.id },
            ],
          },
          select: {
            id: true,
            winner: true,
            steps: true,
            fighters: true,
            date: true,
          },
          orderBy: {
            date: 'asc',
          },
        });

        const totalFights = fights.length;
        let victories = 0;
        let losses = 0;
        let currentStreak = 0;
        let maxStreak = 0;
        let totalDamage = 0;
        let maxDamage = 0;

        for (const fight of fights) {
          const won = fight.winner === brute.name;
          if (won) {
            victories++;
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            losses++;
            currentStreak = 0;
          }
        }

        for (const fight of fights) {
          try {
            const steps = JSON.parse(fight.steps) as Array<{ a: string; f?: number; d?: number }>;
            const fighters = JSON.parse(fight.fighters) as Array<{ id: string; index: number; type?: string }>;
            const bruteFighter = fighters.find((f) => f.id === brute.id && (f.type === 'brute' || !f.type));

            if (bruteFighter) {
              let fightDamage = 0;
              for (const step of steps) {
                if (step.f === bruteFighter.index && typeof step.d === 'number') {
                  fightDamage += step.d;
                }
              }
              totalDamage += fightDamage;
              maxDamage = Math.max(maxDamage, fightDamage);
            }
          } catch {
            // Ignorar errores de parsing
          }
        }

        const tournamentParticipations = await prisma.tournament.count({
          where: {
            participants: {
              some: {
                id: brute.id,
              },
            },
          },
        });

        const eventsParticipated = brute.eventId ? 1 : 0;

        const allFights = await prisma.fight.findMany({
          where: {
            OR: [
              { brute1Id: brute.id },
              { brute2Id: brute.id },
            ],
          },
          select: {
            steps: true,
            fighters: true,
          },
        });

        const uniqueSkills = new Set<string>();
        const uniqueWeapons = new Set<string>();

        for (const fight of allFights) {
          try {
            const steps = JSON.parse(fight.steps) as Array<{ a: string; s?: unknown; w?: unknown }>;
            const fighters = JSON.parse(fight.fighters) as Array<{ id: string; index: number; type?: string }>;
            const bruteFighter = fighters.find((f) => f.id === brute.id && (f.type === 'brute' || !f.type));

            if (bruteFighter) {
              for (const step of steps) {
                if (step.a === 'SkillActivate' && step.s) {
                  const skill = step.s as { id?: string };
                  if (skill.id) {
                    uniqueSkills.add(skill.id);
                  }
                }
              }
            }
          } catch {
            // Ignorar errores
          }
        }

        const fullBrute = await prisma.brute.findUnique({
          where: { id: brute.id },
        });

        if (fullBrute) {
          const calculatedBrute = getCalculatedBrute(fullBrute, modifiers);
          if (calculatedBrute.weapons) {
            Object.keys(calculatedBrute.weapons).forEach((weapon) => {
              uniqueWeapons.add(weapon);
            });
          }
        }

        let clanWarsParticipated = 0;
        let clanWarsWon = 0;

        if (brute.clanId) {
          const clanWarFighters = await prisma.clanWarFighters.findMany({
            where: {
              OR: [
                { attackers: { some: { id: brute.id } } },
                { defenders: { some: { id: brute.id } } },
              ],
            },
            include: {
              clanWar: {
                select: {
                  winnerId: true,
                  attackerId: true,
                  defenderId: true,
                },
              },
            },
          });

          clanWarsParticipated = clanWarFighters.length;
          clanWarsWon = clanWarFighters.filter((cwf) => {
            const war = cwf.clanWar;
            if (!war.winnerId) return false;
            const bruteClanId = brute.clanId;
            return (war.attackerId === bruteClanId && war.winnerId === war.attackerId)
              || (war.defenderId === bruteClanId && war.winnerId === war.defenderId);
          }).length;
        }

        const winRate = totalFights > 0 ? (victories / totalFights) * 100 : 0;
        const averageDamage = totalFights > 0 ? totalDamage / totalFights : 0;

        bruteStats.push({
          id: brute.id,
          name: brute.name,
          totalFights,
          victories,
          losses,
          winRate: Math.round(winRate * 100) / 100,
          maxWinStreak: maxStreak,
          currentWinStreak: currentStreak,
          totalDamage,
          maxDamage,
          averageDamage: Math.round(averageDamage * 100) / 100,
          flawlessWins: 0,
          level: brute.level,
          totalXP: brute.xp,
          ascensions: brute.ascensions,
          resets: brute.resets,
          tournamentWins: brute.tournamentWins,
          tournamentParticipations,
          eventsParticipated,
          eventsFinalReached: 0,
          eventsWon: 0,
          clanWarsParticipated,
          clanWarsWon,
          clanPointsContributed: 0,
          uniqueSkillsUsed: uniqueSkills.size,
          uniqueWeaponsUsed: uniqueWeapons.size,
          daysSinceCreation: Math.floor(
            (Date.now() - brute.createdAt.getTime()) / (1000 * 60 * 60 * 24),
          ),
          lastFightDate: brute.lastFight,
        });
      }

      const totalFights = bruteStats.reduce((sum, b) => sum + b.totalFights, 0);
      const totalVictories = bruteStats.reduce((sum, b) => sum + b.victories, 0);
      const totalLosses = bruteStats.reduce((sum, b) => sum + b.losses, 0);
      const overallWinRate = totalFights > 0 ? (totalVictories / totalFights) * 100 : 0;
      const maxWinStreak = Math.max(...bruteStats.map((b) => b.maxWinStreak), 0);
      const totalDamage = bruteStats.reduce((sum, b) => sum + b.totalDamage, 0);
      const maxDamage = Math.max(...bruteStats.map((b) => b.maxDamage), 0);
      const averageDamage = totalFights > 0 ? totalDamage / totalFights : 0;
      const flawlessWins = bruteStats.reduce((sum, b) => sum + b.flawlessWins, 0);
      const maxLevel = Math.max(...bruteStats.map((b) => b.level), 0);
      const totalXP = bruteStats.reduce((sum, b) => sum + b.totalXP, 0);
      const totalAscensions = bruteStats.reduce((sum, b) => sum + b.ascensions, 0);
      const totalResets = bruteStats.reduce((sum, b) => sum + b.resets, 0);
      const totalTournamentWins = bruteStats.reduce((sum, b) => sum + b.tournamentWins, 0);
      const totalTournamentParticipations = bruteStats.reduce((sum, b) => sum + b.tournamentParticipations, 0);
      const totalEventsParticipated = bruteStats.reduce((sum, b) => sum + b.eventsParticipated, 0);
      const totalEventsFinalReached = bruteStats.reduce((sum, b) => sum + b.eventsFinalReached, 0);
      const totalEventsWon = bruteStats.reduce((sum, b) => sum + b.eventsWon, 0);
      const totalClanWarsParticipated = bruteStats.reduce((sum, b) => sum + b.clanWarsParticipated, 0);
      const totalClanWarsWon = bruteStats.reduce((sum, b) => sum + b.clanWarsWon, 0);
      const totalClanPointsContributed = bruteStats.reduce((sum, b) => sum + b.clanPointsContributed, 0);

      const allUserFights = await prisma.fight.findMany({
        where: {
          OR: brutes.map((b) => [
            { brute1Id: b.id },
            { brute2Id: b.id },
          ]).flat(),
        },
        select: {
          steps: true,
          fighters: true,
        },
      });

      const bruteIdsSet = new Set(brutes.map((b) => b.id));
      const allUniqueSkills = new Set<string>();
      const allUniqueWeapons = new Set<string>();

      for (const fight of allUserFights) {
        try {
          const steps = JSON.parse(fight.steps) as Array<{ a: string; s?: unknown; w?: unknown }>;
          const fighters = JSON.parse(fight.fighters) as Array<{ id: string; index: number; type?: string }>;

          for (const fighter of fighters) {
            if (bruteIdsSet.has(fighter.id) && (fighter.type === 'brute' || !fighter.type)) {
              for (const step of steps) {
                if (step.a === 'SkillActivate' && step.s) {
                  const skill = step.s as { id?: string };
                  if (skill.id) {
                    allUniqueSkills.add(skill.id);
                  }
                }
              }
            }
          }
        } catch {
          // Ignorar errores
        }
      }

      const fullBrutes = await prisma.brute.findMany({
        where: {
          userId: targetUser.id,
          deletedAt: null,
        },
      });

      for (const brute of fullBrutes) {
        const calculatedBrute = getCalculatedBrute(brute, modifiers);
        if (calculatedBrute.weapons) {
          Object.keys(calculatedBrute.weapons).forEach((weapon) => {
            allUniqueWeapons.add(weapon);
          });
        }
      }

      const totalBrutes = brutes.length;
      const activeBrutes = brutes.filter((b) => b.lastFight &&
        Date.now() - b.lastFight.getTime() < 7 * 24 * 60 * 60 * 1000).length;

      const firstBrute = brutes[0];
      const daysSinceFirstBrute = firstBrute
        ? Math.floor((Date.now() - firstBrute.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const user = await prisma.user.findUnique({
        where: { id: targetUser.id },
        select: {
          consecutiveDaysPlayed: true,
        },
      });

      res.send({
        totalFights,
        totalVictories,
        totalLosses,
        overallWinRate: Math.round(overallWinRate * 100) / 100,
        maxWinStreak,
        totalDamage,
        maxDamage,
        averageDamage: Math.round(averageDamage * 100) / 100,
        flawlessWins,
        maxLevel,
        totalXP,
        totalAscensions,
        totalResets,
        totalGold: (await prisma.user.findUnique({
          where: { id: targetUser.id },
          select: { gold: true },
        }))?.gold || 0,
        totalTournamentWins,
        totalTournamentParticipations,
        totalEventsParticipated,
        totalEventsFinalReached,
        totalEventsWon,
        totalClanWarsParticipated,
        totalClanWarsWon,
        totalClanPointsContributed,
        totalUniqueSkillsUsed: allUniqueSkills.size,
        totalUniqueWeaponsUsed: allUniqueWeapons.size,
        totalBrutes,
        activeBrutes,
        daysSinceFirstBrute,
        consecutiveDaysPlayed: user?.consecutiveDaysPlayed || 0,
        brutes: bruteStats,
        userName: targetUser.name,
      });
    } catch (error) {
      sendError(res, error);
    }
  },
};
