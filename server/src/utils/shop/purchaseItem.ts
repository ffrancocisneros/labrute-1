import type { PrismaClient, ShopItemType, SkillName, WeaponName } from '@labrute/prisma';
import dayjs from 'dayjs';
import { ExpectedError, LimitError, NotFoundError } from '@labrute/core';
import { UserLogType } from '@labrute/prisma';
import { translate } from '../translate.js';

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
    select: { id: true, gold: true, lang: true },
  });

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Verificar que tenga suficiente oro
  if (user.gold < item.price) {
    throw new LimitError('No tienes suficiente oro');
  }

  // Validaciones específicas por tipo
  if ((item.type === 'TEMPORARY_WEAPON' || item.type === 'TEMPORARY_SKILL' || item.type === 'BONUS_FIGHTS') && !bruteId) {
    throw new ExpectedError('Debes elegir un bruto para este item');
  }

  const now = new Date();
  const dayStart = dayjs.utc().startOf('day').toDate();
  const dayEnd = dayjs.utc().add(1, 'day').startOf('day').toDate();

  // Si hay bruteId, cargar el bruto una sola vez (para contar tiers y validar ownership)
  const brute = bruteId ? await prisma.brute.findFirst({
    where: { id: bruteId, userId, deletedAt: null },
    select: {
      id: true,
      skills: true,
      weapons: true,
    },
  }) : null;

  if (bruteId) {
    if (!brute) {
      throw new NotFoundError('Bruto no encontrado');
    }
  }

  // Procesar la compra según el tipo (transacción: ítem + descuento oro + log)
  const today = dayjs.utc().startOf('day').toDate();

  await prisma.$transaction(async (tx) => {
    switch (item.type) {
      case 'COSMETIC':
        if (item.valueInt == null) {
          throw new ExpectedError('Item de cosmético inválido');
        }
        // Verificar que no lo tenga ya desbloqueado
        const existingCosmetic = await tx.userUnlockedCosmetic.findUnique({
          where: {
            userId_cosmeticPresetId: { userId, cosmeticPresetId: item.valueInt },
          },
        });
        if (existingCosmetic) {
          throw new ExpectedError('Ya tienes este cosmético desbloqueado');
        }
        // Desbloquear el cosmético
        await tx.userUnlockedCosmetic.create({
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
        if (!bruteId || !brute) {
          throw new ExpectedError('Debes elegir un bruto para comprar peleas extra');
        }
        // Obtener estado actual de peleas bonus del bruto
        const bruteWithBonus = await tx.brute.findUnique({
          where: { id: bruteId },
          select: { bonusFightsCount: true, bonusFightsDate: true },
        });
        const isToday = bruteWithBonus?.bonusFightsDate
          && dayjs.utc(bruteWithBonus.bonusFightsDate).isSame(dayjs.utc(), 'day');
        // Agregar peleas extra al bruto
        await tx.brute.update({
          where: { id: bruteId },
          data: isToday
            ? { bonusFightsCount: { increment: item.valueInt } }
            : { bonusFightsCount: item.valueInt, bonusFightsDate: today },
        });
        break;

      case 'TEMPORARY_WEAPON':
        if (!item.valueString || !bruteId) {
          throw new ExpectedError('Item de arma temporal inválido');
        }
        if (!brute) {
          throw new NotFoundError('Bruto no encontrado');
        }

        // Límite: 1 compra por día UTC por bruto+arma
        const alreadyBoughtWeaponToday = await tx.bruteTemporaryWeapon.findFirst({
          where: {
            bruteId,
            weaponName: item.valueString as WeaponName,
            createdAt: { gte: dayStart, lt: dayEnd },
          },
          select: { id: true },
        });
        if (alreadyBoughtWeaponToday) {
          throw new LimitError(translate('shop.tempAlreadyBoughtTodayWeapon', user));
        }

        // Calcular tier actual (permanente + temporales activos)
        const permWeaponTier = brute.weapons.filter((w) => w === item.valueString).length;
        const activeTempWeaponTier = await tx.bruteTemporaryWeapon.count({
          where: {
            bruteId,
            weaponName: item.valueString as WeaponName,
            expiresAt: { gt: now },
          },
        });
        const currentWeaponTier = permWeaponTier + activeTempWeaponTier;
        if (currentWeaponTier >= 3) {
          throw new LimitError(translate('shop.tempTier3Weapon', user));
        }

        // Crear arma temporal (24 horas)
        const weaponExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await tx.bruteTemporaryWeapon.create({
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
        if (!brute) {
          throw new NotFoundError('Bruto no encontrado');
        }

        // Límite: 1 compra por día UTC por bruto+habilidad
        const alreadyBoughtSkillToday = await tx.bruteTemporaryEffect.findFirst({
          where: {
            bruteId,
            skillName: item.valueString as SkillName,
            createdAt: { gte: dayStart, lt: dayEnd },
          },
          select: { id: true },
        });
        if (alreadyBoughtSkillToday) {
          throw new LimitError(translate('shop.tempAlreadyBoughtTodaySkill', user));
        }

        // Calcular tier actual (permanente + temporales activos)
        const permSkillTier = brute.skills.filter((s) => s === item.valueString).length;
        const activeTempSkillTier = await tx.bruteTemporaryEffect.count({
          where: {
            bruteId,
            skillName: item.valueString as SkillName,
            expiresAt: { gt: now },
          },
        });
        const currentSkillTier = permSkillTier + activeTempSkillTier;
        if (currentSkillTier >= 3) {
          throw new LimitError(translate('shop.tempTier3Skill', user));
        }

        // Crear habilidad temporal (24 horas)
        const skillExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await tx.bruteTemporaryEffect.create({
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
    await tx.user.update({
      where: { id: userId },
      data: { gold: { decrement: item.price } },
    });

    // Registrar en logs (parte de la transacción)
    await tx.userLog.create({
      data: {
        type: UserLogType.GOLD_LOSS,
        userId,
        gold: item.price,
      },
    });
  });
};
