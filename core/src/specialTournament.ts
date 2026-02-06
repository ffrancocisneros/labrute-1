import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { SpecialTournamentRule } from './constants';
import { randomBetween } from './utils';

dayjs.extend(utc);

/** Fecha de inicio para calcular ciclos */
const CYCLE_START = dayjs.utc('2025-01-01').startOf('day');

const shuffleWithSeed = <T>(arr: T[], seed: number): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomBetween(0, i, `special-rule-${seed}-${i}`, true);
    const tmp = result[i];
    const jItem = result[j];
    if (typeof tmp !== 'undefined' && typeof jItem !== 'undefined') {
      result[i] = jItem;
      result[j] = tmp;
    }
  }
  return result;
};

/**
 * Obtiene la regla especial activa para una fecha dada.
 * Rotación aleatoria sin repeticiones: cada ciclo de 9 días usa cada regla exactamente una vez.
 */
export const getSpecialRuleForDate = (date: Date | dayjs.Dayjs): SpecialTournamentRule => {
  const d = dayjs.utc(date).startOf('day');
  const daysSinceStart = d.diff(CYCLE_START, 'day');
  const dayInCycle = ((daysSinceStart % 9) + 9) % 9;
  const cycleNumber = Math.floor(daysSinceStart / 9);

  const allRules = Object.values(SpecialTournamentRule);
  const shuffledRules = shuffleWithSeed(allRules, cycleNumber);
  const rule = shuffledRules[dayInCycle];

  return rule ?? SpecialTournamentRule.NO_PETS;
};

/** Metadata para mostrar en UI */
export const SPECIAL_RULE_META: Record<
  SpecialTournamentRule,
  { nameKey: string; descKey: string; emoji: string }
> = {
  [SpecialTournamentRule.NO_PETS]: {
    nameKey: 'specialTournament.noPets',
    descKey: 'specialTournament.noPets.desc',
    emoji: '🐾',
  },
  [SpecialTournamentRule.LIGHT_WEAPONS_ONLY]: {
    nameKey: 'specialTournament.lightWeapons',
    descKey: 'specialTournament.lightWeapons.desc',
    emoji: '⚡',
  },
  [SpecialTournamentRule.HEAVY_WEAPONS_ONLY]: {
    nameKey: 'specialTournament.heavyWeapons',
    descKey: 'specialTournament.heavyWeapons.desc',
    emoji: '🔨',
  },
  [SpecialTournamentRule.THROWN_WEAPONS_ONLY]: {
    nameKey: 'specialTournament.thrownWeapons',
    descKey: 'specialTournament.thrownWeapons.desc',
    emoji: '🎯',
  },
  [SpecialTournamentRule.DOUBLE_STRENGTH]: {
    nameKey: 'specialTournament.doubleStrength',
    descKey: 'specialTournament.doubleStrength.desc',
    emoji: '💪',
  },
  [SpecialTournamentRule.DOUBLE_HP]: {
    nameKey: 'specialTournament.doubleHp',
    descKey: 'specialTournament.doubleHp.desc',
    emoji: '❤️',
  },
  [SpecialTournamentRule.RANDOM_STATS]: {
    nameKey: 'specialTournament.randomStats',
    descKey: 'specialTournament.randomStats.desc',
    emoji: '🎲',
  },
  [SpecialTournamentRule.RANDOM_WEAPONS]: {
    nameKey: 'specialTournament.randomWeapons',
    descKey: 'specialTournament.randomWeapons.desc',
    emoji: '🎰',
  },
  [SpecialTournamentRule.NO_WEAPONS_NO_PETS]: {
    nameKey: 'specialTournament.noWeaponsNoPets',
    descKey: 'specialTournament.noWeaponsNoPets.desc',
    emoji: '✊',
  },
};
