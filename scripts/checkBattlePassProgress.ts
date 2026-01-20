import { PrismaClient } from '@labrute/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { getBattlePassXpForLevel } from '@labrute/core';

dayjs.extend(utc);

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] || 'Mampara';

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

    console.log(`✅ Usuario: ${user.name} (ID: ${user.id})\n`);

    // Obtener temporada actual
    const today = dayjs.utc().startOf('day').toDate();
    const season = await prisma.battlePassSeason.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    if (!season) {
      console.error('❌ No hay temporada activa');
      process.exit(1);
    }

    console.log(`📅 Temporada: ${season.name} (ID: ${season.id})`);

    // Obtener progreso del usuario
    const progress = await prisma.userBattlePassProgress.findUnique({
      where: {
        userId_seasonId: { userId: user.id, seasonId: season.id },
      },
    });

    if (!progress) {
      console.log('❌ No hay progreso registrado para este usuario');
    } else {
      console.log(`\n📊 Progreso del usuario:`);
      console.log(`   Total XP: ${progress.totalXp}`);
      console.log(`   Niveles reclamados: [${progress.claimedLevels.join(', ') || 'ninguno'}]`);
      
      // Calcular nivel actual
      let currentLevel = 0;
      for (let i = 1; i <= 40; i++) {
        if (progress.totalXp >= i * 300) currentLevel = i;
      }
      console.log(`   Nivel actual calculado: ${currentLevel}`);
      console.log(`   XP necesario para nivel ${currentLevel + 1}: ${getBattlePassXpForLevel(currentLevel + 1)}`);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
