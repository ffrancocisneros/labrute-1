import { PrismaClient } from '@labrute/prisma';
import { getBattlePassXpForLevel, getGameDay } from '@labrute/core';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);

const prisma = new PrismaClient();

// Función para obtener la temporada actual (copiada de getCurrentSeason.ts)
async function getCurrentSeason(prisma: PrismaClient) {
  const today = getGameDay().toDate();
  const row = await prisma.battlePassSeason.findFirst({
    where: {
      startDate: { lte: today },
      endDate: { gte: today },
    },
    include: {
      rewards: { orderBy: { level: 'asc' } },
      missions: true,
    },
  });
  return row;
}

async function main() {
  const username = process.argv[2];
  const levels = parseInt(process.argv[3] || '3', 10);

  if (!username) {
    console.error('Uso: npx ts-node scripts/giveBattlePassLevels.ts <username> [levels]');
    process.exit(1);
  }

  try {
    // Buscar usuario
    const user = await prisma.user.findFirst({
      where: {
        name: {
          equals: username,
          mode: 'insensitive',
        },
      },
      select: { id: true, name: true },
    });

    if (!user) {
      console.error(`❌ Usuario "${username}" no encontrado`);
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.name} (ID: ${user.id})`);

    // Obtener temporada actual
    const season = await getCurrentSeason(prisma);
    if (!season) {
      console.error('❌ No hay temporada activa del pase de batalla');
      process.exit(1);
    }

    console.log(`📅 Temporada: ${season.name}`);

    // Calcular XP necesario para el nivel solicitado
    const xpNeeded = getBattlePassXpForLevel(levels);
    console.log(`🎯 XP necesario para nivel ${levels}: ${xpNeeded}`);

    // Obtener o crear progreso del usuario
    let progress = await prisma.userBattlePassProgress.findUnique({
      where: {
        userId_seasonId: { userId: user.id, seasonId: season.id },
      },
    });

    if (!progress) {
      progress = await prisma.userBattlePassProgress.create({
        data: {
          userId: user.id,
          seasonId: season.id,
          totalXp: xpNeeded,
        },
      });
      console.log(`✨ Progreso creado con ${xpNeeded} XP`);
    } else {
      // Actualizar para asegurar que tenga al menos el XP necesario
      const currentXp = progress.totalXp;
      if (currentXp < xpNeeded) {
        await prisma.userBattlePassProgress.update({
          where: {
            userId_seasonId: { userId: user.id, seasonId: season.id },
          },
          data: {
            totalXp: xpNeeded,
          },
        });
        console.log(`📈 XP actualizado: ${currentXp} → ${xpNeeded}`);
      } else {
        console.log(`ℹ️  El usuario ya tiene ${currentXp} XP (suficiente para nivel ${levels})`);
      }
    }

    console.log(`\n✅ Usuario "${user.name}" ahora tiene nivel ${levels} del pase de batalla`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
