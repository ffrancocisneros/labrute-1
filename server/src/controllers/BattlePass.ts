import { getBattlePassXpForLevel } from '@labrute/core';
import type {
  BattlePassMission,
  BattlePassReward,
  BattlePassSeason,
  PrismaClient,
  SkillName,
  WeaponName,
} from '@labrute/prisma';
import type { Request, Response } from 'express';
import { ExpectedError, getGameDay, toGameDay, LimitError, NotFoundError } from '@labrute/core';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { getCurrentSeason } from '../utils/battlePass/getCurrentSeason.js';
import { LOGGER } from '../context.js';
import { createGoldTransaction } from '../utils/createGoldTransaction.js';

export interface BattlePassLevelInfo {
  level: number;
  xpRequired: number;
  rewards: { type: string; valueInt: number | null; valueString: string | null }[];
  claimed: boolean;
}

export interface BattlePassGetResponse {
  season: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  levels: BattlePassLevelInfo[];
  userProgress: { totalXp: number; claimedLevels: number[] } | null;
  missions: (BattlePassMission & { userProgress: number; completedAt: Date | null })[];
}

export const BattlePass = {
  get: (prisma: PrismaClient) => async (
    req: Request,
    res: Response<BattlePassGetResponse>,
  ) => {
    try {
      const user = await auth(prisma, req);
      const season = await getCurrentSeason(prisma);

      if (!season) {
        return res.send({
          season: null,
          levels: [],
          userProgress: null,
          missions: [],
        });
      }

      // Eliminar duplicados antes de procesar (protección en tiempo real)
      const { removeDuplicateRewards } = await import('../utils/battlePass/ensureNextSeason.js');
      await removeDuplicateRewards(prisma).catch(() => {
        // Silenciar errores, no queremos interrumpir la respuesta
      });

      // Recargar la temporada después de limpiar duplicados
      const updatedSeason = await getCurrentSeason(prisma);
      const finalSeason = updatedSeason || season;

      const [progress, missionProgress] = await Promise.all([
        prisma.userBattlePassProgress.findUnique({
          where: { userId_seasonId: { userId: user.id, seasonId: finalSeason.id } },
        }),
        prisma.userBattlePassMissionProgress.findMany({
          where: {
            userId: user.id,
            mission: { seasonId: finalSeason.id },
          },
          select: { missionId: true, progress: true, completedAt: true },
        }),
      ]);

      const claimedSet = new Set(progress?.claimedLevels ?? []);
      const missionById = new Map(missionProgress.map((m) => [m.missionId, m]));

      const levels: BattlePassLevelInfo[] = [];
      for (let l = 1; l <= 40; l++) {
        // Filtrar por nivel y eliminar duplicados por tipo/valor (solo mantener el primero)
        const levelRewards = (finalSeason.rewards as BattlePassReward[])
          .filter((r) => r.level === l);
        
        // Eliminar duplicados exactos (mismo tipo, mismo valor)
        const seen = new Set<string>();
        const uniqueRewards = levelRewards.filter((r) => {
          const key = `${r.rewardType}-${r.valueInt ?? 'n'}-${r.valueString ?? 'n'}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const rewards = uniqueRewards.map((r) => ({
          type: r.rewardType,
          valueInt: r.valueInt,
          valueString: r.valueString,
        }));
        
        levels.push({
          level: l,
          xpRequired: getBattlePassXpForLevel(l),
          rewards,
          claimed: claimedSet.has(l),
        });
      }

      const missions = (finalSeason.missions as BattlePassMission[]).map((m) => {
        const up = missionById.get(m.id);
        return {
          ...m,
          userProgress: up?.progress ?? 0,
          completedAt: up?.completedAt ?? null,
        };
      });

      const userProgressResponse = progress
        ? { totalXp: progress.totalXp, claimedLevels: progress.claimedLevels }
        : { totalXp: 0, claimedLevels: [] };

      // Log para debugging
      LOGGER.log(`Battle Pass get - User ID: ${user.id}, XP: ${userProgressResponse.totalXp}, Claimed: [${userProgressResponse.claimedLevels.join(', ')}]`);

      res.send({
        season: {
          id: finalSeason.id,
          name: finalSeason.name,
          startDate: finalSeason.startDate.toISOString().slice(0, 10),
          endDate: finalSeason.endDate.toISOString().slice(0, 10),
        },
        levels,
        userProgress: userProgressResponse,
        missions,
      });
    } catch (e) {
      sendError(res, e);
    }
  },

  claimLevel: (prisma: PrismaClient) => async (
    req: Request<never, unknown, { level: number; bruteId?: string }>,
    res: Response,
  ) => {
    try {
      const user = await auth(prisma, req);
      const { level, bruteId } = req.body ?? {};

      if (typeof level !== 'number' || level < 1 || level > 40) {
        throw new ExpectedError('Nivel inválido');
      }

      const season = await getCurrentSeason(prisma);
      if (!season) throw new NotFoundError('No hay temporada activa');

      let progress = await prisma.userBattlePassProgress.findUnique({
        where: { userId_seasonId: { userId: user.id, seasonId: season.id } },
      });
      if (!progress) {
        progress = await prisma.userBattlePassProgress.create({
          data: { userId: user.id, seasonId: season.id, totalXp: 0 },
        });
      }

      const xpRequired = getBattlePassXpForLevel(level);
      if (progress.totalXp < xpRequired) {
        throw new LimitError('Aún no has alcanzado este nivel');
      }
      const claimedLevels = progress.claimedLevels ?? [];
      if (claimedLevels.includes(level)) {
        throw new ExpectedError('Ya reclamaste esta recompensa');
      }

      const rewards = (season.rewards as BattlePassReward[]).filter((r) => r.level === level);
      const tempSkillRewards = rewards.filter((r) => r.rewardType === 'TEMPORARY_SKILL');
      const tempWeaponRewards = rewards.filter((r) => r.rewardType === 'TEMPORARY_WEAPON');
      const bonusFightRewards = rewards.filter((r) => r.rewardType === 'BONUS_FIGHTS');

      if ((tempSkillRewards.length > 0 || tempWeaponRewards.length > 0 || bonusFightRewards.length > 0) && !bruteId) {
        throw new ExpectedError('Debes elegir un bruto para esta recompensa');
      }

      let targetBruteId: string | null = null;
      if (bruteId) {
        const brute = await prisma.brute.findFirst({
          where: { id: bruteId, userId: user.id, deletedAt: null },
          select: { id: true },
        });
        if (!brute) throw new NotFoundError('Bruto no encontrado');
        targetBruteId = brute.id;
      }

      const today = getGameDay().toDate();

      for (const r of rewards) {
        switch (r.rewardType) {
          case 'GOLD':
            if (r.valueInt != null && r.valueInt > 0) {
              await prisma.user.update({
                where: { id: user.id },
                data: { gold: { increment: r.valueInt } },
              });
              createGoldTransaction(prisma, {
                userId: user.id,
                amount: r.valueInt,
                source: 'battle_pass',
                sourceData: JSON.stringify({ level, seasonId: season.id }),
              });
            }
            break;
          case 'TITLE':
            if (r.valueInt != null) {
              const u = await prisma.user.findUnique({
                where: { id: user.id },
                select: { unlockedTitleIds: true },
              });
              const ids = u?.unlockedTitleIds ?? [];
              if (!ids.includes(r.valueInt)) {
                await prisma.user.update({
                  where: { id: user.id },
                  data: { unlockedTitleIds: { set: [...ids, r.valueInt] } },
                });
              }
            }
            break;
          case 'COSMETIC':
            if (r.valueInt != null) {
              await prisma.userUnlockedCosmetic.upsert({
                where: {
                  userId_cosmeticPresetId: { userId: user.id, cosmeticPresetId: r.valueInt },
                },
                create: { userId: user.id, cosmeticPresetId: r.valueInt },
                update: {},
              });
            }
            break;
          case 'BONUS_FIGHTS':
            if (r.valueInt != null && r.valueInt > 0) {
              if (!targetBruteId) {
                throw new ExpectedError('Debes elegir un bruto para las peleas extra');
              }

              const brute = await prisma.brute.findUnique({
                where: { id: targetBruteId },
                select: { bonusFightsCount: true, bonusFightsDate: true },
              });

              const isToday = brute?.bonusFightsDate
                && toGameDay(brute.bonusFightsDate).isSame(today, 'day');

              await prisma.brute.update({
                where: { id: targetBruteId },
                data: isToday
                  ? { bonusFightsCount: { increment: r.valueInt } }
                  : { bonusFightsCount: r.valueInt, bonusFightsDate: today },
              });
            }
            break;
          case 'TEMPORARY_SKILL':
            if (r.valueString && targetBruteId) {
              const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
              await prisma.bruteTemporaryEffect.create({
                data: {
                  bruteId: targetBruteId,
                  skillName: r.valueString as SkillName,
                  expiresAt,
                },
              });
            }
            break;
          case 'TEMPORARY_WEAPON':
            if (r.valueString && targetBruteId) {
              const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
              await prisma.bruteTemporaryWeapon.create({
                data: {
                  bruteId: targetBruteId,
                  weaponName: r.valueString as WeaponName,
                  expiresAt,
                },
              });
            }
            break;
          default:
            break;
        }
      }

      await prisma.userBattlePassProgress.update({
        where: { userId_seasonId: { userId: user.id, seasonId: season.id } },
        data: {
          claimedLevels: { push: level },
        },
      });

      res.send({ success: true });
    } catch (e) {
      sendError(res, e);
    }
  },
};
