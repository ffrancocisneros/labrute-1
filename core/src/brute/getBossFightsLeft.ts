import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const BOSS_FIGHTS_PER_DAY = 2;

type BruteForBossFightsLeft = {
  lastBossFightDate?: Date | string | null;
  bossFightsToday?: number | null;
};

export const getBossFightsLeft = (
  brute: BruteForBossFightsLeft,
): number => {
  // Si nunca peleó contra el jefe o la última pelea fue otro día, tiene 2 intentos
  if (!brute.lastBossFightDate || !dayjs.utc(brute.lastBossFightDate).isSame(dayjs.utc(), 'day')) {
    return BOSS_FIGHTS_PER_DAY;
  }
  
  // Si peleó hoy, devolver los intentos restantes
  return brute.bossFightsToday ?? BOSS_FIGHTS_PER_DAY;
};
