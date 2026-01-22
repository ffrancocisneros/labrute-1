import { applySkillModifiers, getHP } from '@labrute/core';
import type { CalculatedBrute } from '@labrute/core';
import type { PrismaClient, SkillName, WeaponName } from '@labrute/prisma';

export interface TemporaryEffectsCache {
  skills: string[];
  weapons: string[];
}

/**
 * Añade las habilidades temporales (p. ej. del pase de batalla) al bruto calculado.
 * Modifica brute.skills in-place.
 * 
 * @param prisma - Cliente de Prisma
 * @param brute - Bruto calculado a enriquecer
 * @param cache - Cache opcional de efectos temporales (para optimización)
 */
export const enrichCalculatedBruteWithTemporary = async (
  prisma: PrismaClient,
  brute: CalculatedBrute,
  cache?: TemporaryEffectsCache,
): Promise<void> => {
  let effects: { skillName: string }[];
  let weapons: { weaponName: string }[];

  if (cache) {
    // Usar cache si está disponible
    effects = cache.skills.map((skillName) => ({ skillName }));
    weapons = cache.weapons.map((weaponName) => ({ weaponName }));
  } else {
    // Cargar desde DB si no hay cache
    [effects, weapons] = await Promise.all([
      prisma.bruteTemporaryEffect.findMany({
        where: { bruteId: brute.id, expiresAt: { gt: new Date() } },
        select: { skillName: true },
      }),
      prisma.bruteTemporaryWeapon.findMany({
        where: { bruteId: brute.id, expiresAt: { gt: new Date() } },
        select: { weaponName: true },
      }),
    ]);
  }

  for (const e of effects) {
    const skillName = e.skillName as unknown as SkillName;
    const v = brute.skills[skillName];
    if (v === undefined || v === 0) {
      brute.skills[skillName] = 1;
      // IMPORTANTE: para skills temporales, además de mostrarlas, hay que aplicar sus modificadores
      // al bruto calculado (si no, no afectan fuerza/daño/etc.)
      applySkillModifiers(brute, skillName, 1, false);
    }
  }

  // Recalcular enduranceValue/hp en caso de que alguna skill temporal modifique endurance.
  // applySkillModifiers no recalcula hp (solo strength/agility/speedValue), así que lo hacemos aquí.
  brute.enduranceValue = Math.floor(brute.enduranceStat * brute.enduranceModifier);
  brute.hp = getHP(brute.level, brute.enduranceValue);

  // También añadir armas temporales
  for (const w of weapons) {
    // CalculatedBrute.weapons es un Partial<Record<WeaponName, number>>
    // Incrementar el tier si ya existe, o establecerlo en 1 si no existe
    const weaponName = w.weaponName as unknown as WeaponName;
    brute.weapons[weaponName] = (brute.weapons[weaponName] || 0) + 1;
  }
};
