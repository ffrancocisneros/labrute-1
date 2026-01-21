import { applySkillModifiers, getHP } from '@labrute/core';
import type { CalculatedBrute } from '@labrute/core';
import type { PrismaClient } from '@labrute/prisma';
import { enrichCalculatedBruteWithTemporaryWeapon } from './enrichCalculatedBruteWithTemporaryWeapon.js';

/**
 * Añade las habilidades temporales (p. ej. del pase de batalla) al bruto calculado.
 * Modifica brute.skills in-place.
 */
export const enrichCalculatedBruteWithTemporary = async (
  prisma: PrismaClient,
  brute: CalculatedBrute,
): Promise<void> => {
  const effects = await prisma.bruteTemporaryEffect.findMany({
    where: { bruteId: brute.id, expiresAt: { gt: new Date() } },
    select: { skillName: true },
  });
  for (const e of effects) {
    const v = brute.skills[e.skillName];
    if (v === undefined || v === 0) {
      brute.skills[e.skillName] = 1;
      // IMPORTANTE: para skills temporales, además de mostrarlas, hay que aplicar sus modificadores
      // al bruto calculado (si no, no afectan fuerza/daño/etc.)
      applySkillModifiers(brute, e.skillName, 1, false);
    }
  }

  // Recalcular enduranceValue/hp en caso de que alguna skill temporal modifique endurance.
  // applySkillModifiers no recalcula hp (solo strength/agility/speedValue), así que lo hacemos aquí.
  brute.enduranceValue = Math.floor(brute.enduranceStat * brute.enduranceModifier);
  brute.hp = getHP(brute.level, brute.enduranceValue);

  // También añadir armas temporales
  await enrichCalculatedBruteWithTemporaryWeapon(prisma, brute);
};
