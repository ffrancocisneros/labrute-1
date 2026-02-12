/**
 * Devuelve la clave de i18n para la regla especial del torneo.
 * Centralizado para usar en desktop y mobile.
 */
export const getSpecialTournamentRuleKey = (rule?: string | null) => {
  if (!rule) return null;

  const map: Record<string, string> = {
    NO_PETS: 'noPets',
    LIGHT_WEAPONS_ONLY: 'lightWeapons',
    HEAVY_WEAPONS_ONLY: 'heavyWeapons',
    THROWN_WEAPONS_ONLY: 'thrownWeapons',
    DOUBLE_STRENGTH: 'doubleStrength',
    DOUBLE_HP: 'doubleHp',
    RANDOM_STATS: 'randomStats',
    RANDOM_WEAPONS: 'randomWeapons',
    NO_WEAPONS_NO_PETS: 'noWeaponsNoPets',
  };

  const key = map[rule];

  if (!key && process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn('[specialTournament] Regla especial desconocida recibida:', rule);
  }

  return key ?? null;
};
