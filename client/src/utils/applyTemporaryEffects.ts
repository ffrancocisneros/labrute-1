import { applySkillModifiers, CalculatedBrute, getHP, TemporarySkillEffect, TemporaryWeaponEffect } from '@labrute/core';

/**
 * Aplica habilidades y armas temporales a un bruto calculado, modificando sus stats.
 * Similar a enrichCalculatedBruteWithTemporary del servidor, pero para el cliente.
 */
export const applyTemporaryEffects = (
  brute: CalculatedBrute,
  temporarySkills?: TemporarySkillEffect[],
  temporaryWeapons?: TemporaryWeaponEffect[],
): CalculatedBrute => {
  const enriched = { ...brute };

  // Aplicar skills temporales
  if (temporarySkills && temporarySkills.length > 0) {
    for (const { skillName } of temporarySkills) {
      const currentTier = enriched.skills[skillName] ?? 0;

      // Si no tiene el skill o está en tier 0, añadirlo como tier 1
      if (currentTier === 0) {
        enriched.skills[skillName] = 1;
        // Aplicar modificadores de stats (fuerza, agilidad, etc.)
        applySkillModifiers(enriched, skillName, 1, false);
      }
    }
  }

  // Aplicar armas temporales
  if (temporaryWeapons && temporaryWeapons.length > 0) {
    for (const { weaponName } of temporaryWeapons) {
      const currentTier = enriched.weapons[weaponName] ?? 0;

      // Si no tiene el arma o está en tier 0, añadirla como tier 1
      if (currentTier === 0) {
        enriched.weapons[weaponName] = 1;
      }
    }
  }

  // Recalcular enduranceValue/hp en caso de que alguna skill temporal modifique endurance.
  // applySkillModifiers no recalcula hp (solo strength/agility/speedValue), así que lo hacemos aquí.
  enriched.enduranceValue = Math.floor(enriched.enduranceStat * enriched.enduranceModifier);
  enriched.hp = getHP(enriched.level, enriched.enduranceValue);

  return enriched;
};
