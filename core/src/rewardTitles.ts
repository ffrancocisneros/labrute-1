/**
 * Nombres de títulos que otorgan misiones y logros.
 * rewardValue en Mission/PermanentAchievement es el id del título.
 * Debe mantenerse en sync con server/src/constants/titles.ts
 */
export const REWARD_TITLES: Record<number, string> = {
  1: 'Ascendido',
  2: 'Último hombre en pie',
  3: 'Insistente',
  4: 'Victorioso',
  5: 'Campeón experimentado',
  6: 'Rey de la Racha',
  7: 'Exterminador',
  8: 'Cliente recurrente',
  9: 'Tyler Durden',
  10: 'Asquerosamente rico',
  11: 'Caruso Lombardi',
  12: 'Napoleón Bonaparte',
  13: 'Siempre al pie del cañón',
  14: 'Experto en Eventos',
};

export const getRewardTitleName = (id: number | null | undefined): string | null => {
  if (id == null) return null;
  return REWARD_TITLES[id] ?? null;
};
