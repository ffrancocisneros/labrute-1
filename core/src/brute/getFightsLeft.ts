import dayjs from 'dayjs';
import { getMaxFightsPerDay } from './getMaxFightsPerDay';
import { CalculatedBrute, Modifiers } from '../types';

type BruteForFightsLeft = Pick<CalculatedBrute, 'id' | 'lastFight' | 'fightsLeft' | 'skills' | 'eventId'>;
type BruteForTotalFightsLeft = BruteForFightsLeft & {
  bonusFightsCount?: number | null;
  bonusFightsDate?: Date | string | null;
};

export const getFightsLeft = (
  brute: BruteForFightsLeft,
  modifiers: Modifiers = {},
) => (dayjs.utc(brute.lastFight).isSame(dayjs.utc(), 'day')
  ? brute.fightsLeft
  : getMaxFightsPerDay(brute, modifiers));

export const getTotalFightsLeft = (
  brute: BruteForTotalFightsLeft,
  modifiers: Modifiers = {},
): number => {
  const daily = getFightsLeft(brute, modifiers);
  const bonusDeHoy = brute.bonusFightsDate != null
    && dayjs.utc(brute.bonusFightsDate).isSame(dayjs.utc(), 'day')
    ? (brute.bonusFightsCount ?? 0)
    : 0;
  return daily + bonusDeHoy;
};
