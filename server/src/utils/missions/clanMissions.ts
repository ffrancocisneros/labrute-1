import { getGameDay } from '@labrute/core';
import {
  ClanMissionCadence,
  ClanMissionType,
  PrismaClient,
} from '@labrute/prisma';
import dayjs from 'dayjs';
import { getWeekStart } from '../objectives/generateObjectives.js';

const getToday = () => getGameDay().toDate();

const getWeekRange = () => {
  const start = dayjs.utc(getWeekStart()).startOf('day');
  const end = start.add(6, 'day');
  return {
    start: start.toDate(),
    end: end.toDate(),
  };
};

// Configuración fija inicial de misiones de clan (se puede tunear luego)
const DAILY_CLAN_MISSIONS: {
  type: ClanMissionType;
  target: number;
  rewardGold: number;
  rewardXp: number;
}[] = [
  // Misión diaria 1: "Desafiar al jefe" (X peleas)
  {
    type: ClanMissionType.DAILY_BOSS_FIGHTS,
    target: 10,
    rewardGold: 10,
    rewardXp: 1,
  },
  // Misión diaria 2: "Victoria de clan" (1 guerra ganada en día de torneo)
  {
    type: ClanMissionType.DAILY_CLAN_WAR_WIN,
    target: 1,
    rewardGold: 15,
    rewardXp: 1,
  },
  // La misión DAILY_BOSS_DAMAGE se deja definida en el enum para futuro uso,
  // pero no se genera aún para simplificar el primer release.
];

const WEEKLY_CLAN_MISSIONS: {
  type: ClanMissionType;
  target: number;
  rewardGold: number;
  rewardXp: number;
}[] = [
  // Misión semanal 1: "Derrotar al jefe"
  {
    type: ClanMissionType.WEEKLY_BOSS_KILL,
    target: 1,
    rewardGold: 50,
    rewardXp: 3,
  },
  // Misión semanal 2: "Participar en torneos de clan"
  {
    type: ClanMissionType.WEEKLY_TOURNAMENTS_PLAYED,
    target: 2,
    rewardGold: 75,
    rewardXp: 4,
  },
  // Misión semanal 3: "Duelos ganados"
  {
    type: ClanMissionType.WEEKLY_DUELS_WON,
    target: 30,
    rewardGold: 100,
    rewardXp: 5,
  },
];

/**
 * Genera misiones diarias de clan para todos los clanes activos si no existen para hoy.
 */
export const ensureDailyClanMissions = async (prisma: PrismaClient): Promise<void> => {
  const today = getToday();

  // Obtener clanes activos
  const clans = await prisma.clan.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  if (!clans.length) return;

  for (const clan of clans) {
    // Comprobar si ya hay misiones diarias generadas para hoy
    const existing = await prisma.clanMission.findMany({
      where: {
        clanId: clan.id,
        cadence: ClanMissionCadence.DAILY,
        startDate: today,
        endDate: today,
      },
      select: { type: true },
    });

    const existingTypes = new Set(existing.map((e) => e.type));

    const toCreate = DAILY_CLAN_MISSIONS.filter((config) => !existingTypes.has(config.type));

    if (!toCreate.length) continue;

    // Crear misiones para hoy
    await prisma.clanMission.createMany({
      data: toCreate.map((config) => ({
        clanId: clan.id,
        cadence: ClanMissionCadence.DAILY,
        type: config.type,
        target: config.target,
        rewardGold: config.rewardGold,
        rewardXp: config.rewardXp,
        startDate: today,
        endDate: today,
      })),
      skipDuplicates: true,
    });
  }
};

/**
 * Genera misiones semanales de clan para todos los clanes activos si no existen para la semana actual.
 */
export const ensureWeeklyClanMissions = async (prisma: PrismaClient): Promise<void> => {
  const { start, end } = getWeekRange();

  const clans = await prisma.clan.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  if (!clans.length) return;

  for (const clan of clans) {
    const existing = await prisma.clanMission.findMany({
      where: {
        clanId: clan.id,
        cadence: ClanMissionCadence.WEEKLY,
        startDate: start,
        endDate: end,
      },
      select: { type: true },
    });

    const existingTypes = new Set(existing.map((e) => e.type));

    const toCreate = WEEKLY_CLAN_MISSIONS.filter((config) => !existingTypes.has(config.type));

    if (!toCreate.length) continue;

    await prisma.clanMission.createMany({
      data: toCreate.map((config) => ({
        clanId: clan.id,
        cadence: ClanMissionCadence.WEEKLY,
        type: config.type,
        target: config.target,
        rewardGold: config.rewardGold,
        rewardXp: config.rewardXp,
        startDate: start,
        endDate: end,
      })),
      skipDuplicates: true,
    });
  }
};

/**
 * Premia una misión de clan completada, otorgando oro/EXP a todos los brutos del clan.
 * La recompensa se modela igual que otras fuentes de torneo: TournamentXp y TournamentGold.
 */
const awardClanMissionRewards = async (
  prisma: PrismaClient,
  missionId: string,
): Promise<void> => {
  const mission = await prisma.clanMission.findUnique({
    where: { id: missionId },
    select: {
      id: true,
      clanId: true,
      rewardGold: true,
      rewardXp: true,
    },
  });

  if (!mission) return;
  if (!mission.rewardGold && !mission.rewardXp) return;

  const today = getToday();

  const brutes = await prisma.brute.findMany({
    where: {
      clanId: mission.clanId,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!brutes.length) return;

  // XP por bruto
  if (mission.rewardXp) {
    await prisma.tournamentXp.createMany({
      data: brutes.map((b) => ({
        bruteId: b.id,
        date: today,
        xp: mission.rewardXp,
      })),
      skipDuplicates: false,
    });
  }

  // Oro por usuario (agregando por userId)
  if (mission.rewardGold) {
    const goldByUser: Record<string, number> = {};

    for (const brute of brutes) {
      if (!brute.userId) continue;
      goldByUser[brute.userId] = (goldByUser[brute.userId] ?? 0) + mission.rewardGold;
    }

    const entries = Object.entries(goldByUser);
    if (entries.length) {
      await prisma.tournamentGold.createMany({
        data: entries.map(([userId, gold]) => ({
          userId,
          date: today,
          gold,
          source: 'clan_mission',
        })),
        skipDuplicates: false,
      });
    }
  }
};

/**
 * Incrementa el progreso de una misión de clan concreta (por clan y tipo).
 * Si alguna misión pasa de no completada a completada, dispara la recompensa.
 */
export const incrementClanMission = async (
  prisma: PrismaClient,
  clanId: string,
  type: ClanMissionType,
  amount: number,
): Promise<void> => {
  if (amount <= 0) return;

  const today = getToday();
  const { start, end } = getWeekRange();

  // Obtener misiones activas (diarias o semanales) de este tipo
  const missions = await prisma.clanMission.findMany({
    where: {
      clanId,
      type,
      completed: false,
      OR: [
        // Diarias activas hoy
        {
          cadence: ClanMissionCadence.DAILY,
          startDate: today,
          endDate: today,
        },
        // Semanales activas en la semana actual
        {
          cadence: ClanMissionCadence.WEEKLY,
          startDate: start,
          endDate: end,
        },
      ],
    },
  });

  if (!missions.length) return;

  for (const mission of missions) {
    const newProgress = Math.min(mission.progress + amount, mission.target);
    const justCompleted = !mission.completed && newProgress >= mission.target;

    await prisma.clanMission.update({
      where: { id: mission.id },
      data: {
        progress: newProgress,
        completed: newProgress >= mission.target,
        completedAt: justCompleted ? new Date() : mission.completedAt,
        updatedAt: new Date(),
      },
    });

    if (justCompleted) {
      // Lanzar recompensas una única vez al completarse
      // eslint-disable-next-line no-await-in-loop
      await awardClanMissionRewards(prisma, mission.id);
    }
  }
};

