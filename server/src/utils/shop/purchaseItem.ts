import type { PrismaClient, ShopItemType, SkillName, WeaponName } from '@labrute/prisma';
import dayjs from 'dayjs';
import { ExpectedError, LimitError, NotFoundError } from '@labrute/core';
import { createUserLog } from '../createUserLog.js';
import { UserLogType } from '@labrute/prisma';

interface PurchaseItemParams {
  prisma: PrismaClient;
  userId: string;
  itemId: string;
  bruteId?: string;
}

export const purchaseItem = async ({
  prisma,
  userId,
  itemId,
  bruteId,
}: PurchaseItemParams): Promise<void> => {
  // Obtener el item de la tienda
  const item = await prisma.shopItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new NotFoundError('Item no encontrado');
  }

  if (!item.available) {
    throw new ExpectedError('Este item no está disponible');
  }

  // Obtener el usuario
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, gold: true },
  });

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Verificar que tenga suficiente oro
  if (user.gold < item.price) {
    throw new LimitError('No tienes suficiente oro');
  }

  // Validaciones específicas por tipo
  if ((item.type === 'TEMPORARY_WEAPON' || item.type === 'TEMPORARY_SKILL') && !bruteId) {
    throw new ExpectedError('Debes elegir un bruto para este item');
  }

  if (bruteId) {
    const brute = await prisma.brute.findFirst({
      where: { id: bruteId, userId, deletedAt: null },
    });
    if (!brute) {
      throw new NotFoundError('Bruto no encontrado');
    }
  }

  // Procesar la compra según el tipo
  const today = dayjs.utc().startOf('day').toDate();

  switch (item.type) {
    case 'COSMETIC':
      if (item.valueInt == null) {
        throw new ExpectedError('Item de cosmético inválido');
      }
      // Verificar que no lo tenga ya desbloqueado
      const existingCosmetic = await prisma.userUnlockedCosmetic.findUnique({
        where: {
          userId_cosmeticPresetId: { userId, cosmeticPresetId: item.valueInt },
        },
      });
      if (existingCosmetic) {
        throw new ExpectedError('Ya tienes este cosmético desbloqueado');
      }
      // Desbloquear el cosmético
      await prisma.userUnlockedCosmetic.create({
        data: {
          userId,
          cosmeticPresetId: item.valueInt,
        },
      });
      break;

    case 'BONUS_FIGHTS':
      if (item.valueInt == null || item.valueInt <= 0) {
        throw new ExpectedError('Item de peleas extra inválido');
      }
      // Obtener estado actual de peleas bonus
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { bonusFightsCount: true, bonusFightsDate: true },
      });
      const isToday = u?.bonusFightsDate
        && dayjs.utc(u.bonusFightsDate).isSame(dayjs.utc(), 'day');
      // Agregar peleas extra (igual que pase de batalla)
      await prisma.user.update({
        where: { id: userId },
        data: isToday
          ? { bonusFightsCount: { increment: item.valueInt } }
          : { bonusFightsCount: item.valueInt, bonusFightsDate: today },
      });
      break;

    case 'TEMPORARY_WEAPON':
      if (!item.valueString || !bruteId) {
        throw new ExpectedError('Item de arma temporal inválido');
      }
      // Crear arma temporal (24 horas)
      const weaponExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.bruteTemporaryWeapon.create({
        data: {
          bruteId,
          weaponName: item.valueString as WeaponName,
          expiresAt: weaponExpiresAt,
        },
      });
      break;

    case 'TEMPORARY_SKILL':
      if (!item.valueString || !bruteId) {
        throw new ExpectedError('Item de habilidad temporal inválido');
      }
      // Crear habilidad temporal (24 horas)
      const skillExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.bruteTemporaryEffect.create({
        data: {
          bruteId,
          skillName: item.valueString as SkillName,
          expiresAt: skillExpiresAt,
        },
      });
      break;

    default:
      throw new ExpectedError('Tipo de item no soportado');
  }

  // Descontar el oro
  await prisma.user.update({
    where: { id: userId },
    data: { gold: { decrement: item.price } },
  });

  // Registrar en logs
  createUserLog(prisma, {
    type: UserLogType.GOLD_LOSS,
    userId,
    gold: item.price,
  });
};
