import { getGameDay, toGameDay } from '../utils/date';

const BOSS_FIGHTS_PER_DAY = 2;

type BruteForBossFightsLeft = {
  lastBossFightDate?: Date | string | null;
  bossFightsToday?: number | null;
};

export const getBossFightsLeft = (
  brute: BruteForBossFightsLeft,
): number => {
  if (!brute.lastBossFightDate || !toGameDay(brute.lastBossFightDate).isSame(getGameDay(), 'day')) {
    return BOSS_FIGHTS_PER_DAY;
  }

  return brute.bossFightsToday ?? BOSS_FIGHTS_PER_DAY;
};
