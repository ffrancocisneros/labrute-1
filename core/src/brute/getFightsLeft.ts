import { getMaxFightsPerDay } from './getMaxFightsPerDay';
import { CalculatedBrute, Modifiers } from '../types';
import { getGameDay, toGameDay } from '../utils/date';

type BruteForFightsLeft = Pick<CalculatedBrute, 'id' | 'lastFight' | 'fightsLeft' | 'skills' | 'eventId'>;
type BruteForTotalFightsLeft = BruteForFightsLeft & {
  bonusFightsCount?: number | null;
  bonusFightsDate?: Date | string | null;
};

export const getFightsLeft = (
  brute: BruteForFightsLeft,
  modifiers: Modifiers = {},
) => (brute.lastFight && toGameDay(brute.lastFight).isSame(getGameDay(), 'day')
  ? brute.fightsLeft
  : getMaxFightsPerDay(brute, modifiers));

export const getTotalFightsLeft = (
  brute: BruteForTotalFightsLeft,
  modifiers: Modifiers = {},
): number => {
  const daily = getFightsLeft(brute, modifiers);
  const today = getGameDay();
  const bonusDeHoy = brute.bonusFightsDate != null
    && toGameDay(brute.bonusFightsDate).isSame(today, 'day')
    ? (brute.bonusFightsCount ?? 0)
    : 0;
  return daily + bonusDeHoy;
};
