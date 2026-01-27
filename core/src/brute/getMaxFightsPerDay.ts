import { FightModifier, SkillName } from '@labrute/prisma';
import { EventFightsPerDay, FIGHTS_PER_DAY } from '../constants';
import { CalculatedBrute, Modifiers } from '../types';

export const getMaxFightsPerDay = (
  brute: Pick<CalculatedBrute, 'id' | 'skills' | 'eventId'>,
  modifiers: Modifiers = {},
) => {
  let base = brute.eventId ? EventFightsPerDay : FIGHTS_PER_DAY;

  // Double fights modifier
  if (modifiers[FightModifier.doubleFights]) {
    base *= 2;
  }

  // Crazy day modifier: x10 fights
  if (modifiers[FightModifier.crazyDay]) {
    base *= 10;
  }

  return (brute.skills[SkillName.regeneration]
    ? base + 2
    : base);
};
