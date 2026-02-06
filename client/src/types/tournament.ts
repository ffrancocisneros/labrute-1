/**
 * Active special tournament rule from API.
 * Defined locally to avoid type resolution issues with @labrute/core.
 */
export type ActiveSpecialRule = {
  rule: string;
  nameKey: string;
  descKey: string;
  emoji: string;
  nextChangeAt: string;
};
