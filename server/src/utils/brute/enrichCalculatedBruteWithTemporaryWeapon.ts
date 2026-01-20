import type { CalculatedBrute } from '@labrute/core';
import type { PrismaClient } from '@labrute/prisma';

/**
 * Añade las armas temporales (p. ej. del pase de batalla) al bruto calculado.
 * Modifica brute.weapons in-place agregando las armas temporales.
 */
export const enrichCalculatedBruteWithTemporaryWeapon = async (
  prisma: PrismaClient,
  brute: CalculatedBrute,
): Promise<void> => {
  const weapons = await prisma.bruteTemporaryWeapon.findMany({
    where: { bruteId: brute.id, expiresAt: { gt: new Date() } },
    select: { weaponName: true },
  });
  for (const w of weapons) {
    // CalculatedBrute.weapons es un Partial<Record<WeaponName, number>>
    // Incrementar el tier si ya existe, o establecerlo en 1 si no existe
    brute.weapons[w.weaponName] = (brute.weapons[w.weaponName] || 0) + 1;
  }
};
