// Cargar variables de entorno primero
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, LogType, FightModifier } from '@labrute/prisma';
import {
  canLevelUp,
  getCalculatedBrute,
  getFightsLeft,
  getTieredSkills,
  getXPNeeded,
  isWinner,
  randomBetween,
  FightLogTemplateCount,
  isUuid,
} from '@labrute/core';
// Importaciones dinámicas para manejar ES modules
// Importamos directamente desde los archivos TypeScript del servidor

const MAX_BRUTES = 10;

/**
 * Bot para pelear automáticamente con los brutos de un usuario
 * 
 * Uso: 
 *   npx ts-node scripts/autoFightBot.ts <userId>
 *   npx ts-node scripts/autoFightBot.ts <nombreUsuario>
 * 
 * Características:
 * - Pelea con hasta 10 brutos del usuario
 * - Verifica peleas disponibles dinámicamente (12 normal, +2 por habilidad, x2 por evento)
 * - Si un bruto puede subir de nivel, lo salta y pasa al siguiente
 * - Va bruto por bruto
 */
async function main() {
  // Importaciones dinámicas para manejar ES modules
  const { getOpponents } = await import('../server/src/utils/brute/getOpponents.js');
  const serverStateModule = await import('../server/src/utils/ServerState.js');
  const { generateFight } = await import('../server/src/utils/fight/generateFight.js');
  const { ilike } = await import('../server/src/utils/ilike.js');
  
  // Usar ServerState directamente sin inicializar el contexto completo
  const ServerState = serverStateModule.ServerState;

  const userIdentifier = process.argv[2];

  if (!userIdentifier) {
    console.error('❌ Error: Debes proporcionar un userId o nombre de usuario como argumento\n');
    console.error('Uso:');
    console.error('  npx ts-node scripts/autoFightBot.ts <userId>');
    console.error('  npx ts-node scripts/autoFightBot.ts <nombreUsuario>\n');
    console.error('💡 Para obtener el userId de una cuenta, usa:');
    console.error('  npx ts-node scripts/getUserId.ts <nombreUsuario>');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log(`\n🤖 Iniciando bot de peleas automáticas...\n`);

    // Determinar si es un UUID o un nombre de usuario
    let user;
    if (isUuid(userIdentifier)) {
      // Buscar por ID
      user = await prisma.user.findFirst({
        where: { id: userIdentifier },
        select: { id: true, name: true },
      });
    } else {
      // Buscar por nombre
      user = await prisma.user.findFirst({
        where: {
          name: {
            equals: userIdentifier,
            mode: 'insensitive',
          },
        },
        select: { id: true, name: true },
      });
    }

    if (!user) {
      console.error(`❌ Error: Usuario "${userIdentifier}" no encontrado\n`);
      console.error('💡 Sugerencias:');
      console.error('   - Verifica que el nombre o ID sea correcto');
      console.error('   - Usa: npx ts-node scripts/getUserId.ts --list  para ver todos los usuarios');
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.name} (ID: ${user.id})\n`);

    // Obtener los brutos del usuario (hasta 10) con todos los campos necesarios
    const brutes = await prisma.brute.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      orderBy: [
        { favorite: 'desc' },
        { createdAt: 'asc' },
      ],
      take: MAX_BRUTES,
      include: {
        opponents: {
          select: { name: true },
        },
      },
    });

    if (brutes.length === 0) {
      console.log('⚠️  No se encontraron brutos para este usuario');
      process.exit(0);
    }

    console.log(`📋 Encontrados ${brutes.length} bruto(s):\n`);
    brutes.forEach((brute, index) => {
      console.log(`  ${index + 1}. ${brute.name} (Nivel ${brute.level})`);
    });
    console.log('');

    // Obtener modificadores actuales
    const modifiers = await ServerState.getModifiers(prisma);

    // Procesar cada bruto
    for (let i = 0; i < brutes.length; i++) {
      const brute = brutes[i];
      
      if (!brute) {
        continue;
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🥊 Procesando bruto ${i + 1}/${brutes.length}: ${brute.name}`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        // Obtener bruto calculado con modificadores (getCalculatedBrute espera el bruto completo)
        const calculatedBrute = getCalculatedBrute(brute, modifiers);

        // Verificar si puede subir de nivel
        if (canLevelUp(calculatedBrute)) {
          console.log(`⚠️  ${brute.name} puede subir de nivel. Saltando al siguiente bruto...\n`);
          continue;
        }

        // Obtener peleas disponibles
        const fightsLeft = getFightsLeft(calculatedBrute, modifiers);

        if (fightsLeft <= 0) {
          console.log(`⚠️  ${brute.name} no tiene peleas disponibles. Saltando...\n`);
          continue;
        }

        console.log(`✅ ${brute.name} tiene ${fightsLeft} pelea(s) disponible(s)\n`);

        // Verificar si necesitamos regenerar oponentes
        const needsNewOpponents = !brute.opponentsGeneratedAt
          || new Date(brute.opponentsGeneratedAt).toDateString() !== new Date().toDateString()
          || brute.opponents.length < 6;

        // Obtener oponentes (siempre obtenerlos completos desde getOpponents)
        let opponents: Awaited<ReturnType<typeof getOpponents>>;
        
        if (needsNewOpponents) {
          console.log(`🔄 Obteniendo nuevos oponentes para ${brute.name}...`);
          opponents = await getOpponents(prisma, brute);
          
          // Guardar oponentes
          await prisma.brute.update({
            where: { id: brute.id },
            data: {
              opponents: {
                set: opponents.map((o) => ({ id: o.id })),
              },
              opponentsGeneratedAt: new Date(),
            },
          });
          console.log(`✅ ${opponents.length} oponente(s) obtenido(s)\n`);
        } else {
          // Si ya tenemos oponentes, obtenerlos completos por nombre
          const opponentNames = brute.opponents.map(o => o.name);
          const fullOpponents = await Promise.all(
            opponentNames.map(name => 
              prisma.brute.findFirst({
                where: { name: ilike(name), deletedAt: null },
                select: {
                  id: true,
                  name: true,
                  ranking: true,
                  gender: true,
                  level: true,
                  hp: true,
                  enduranceStat: true,
                  enduranceModifier: true,
                  enduranceValue: true,
                  strengthStat: true,
                  strengthModifier: true,
                  strengthValue: true,
                  speedStat: true,
                  speedModifier: true,
                  speedValue: true,
                  agilityStat: true,
                  agilityModifier: true,
                  agilityValue: true,
                  deletedAt: true,
                  body: true,
                  colors: true,
                  skills: true,
                  weapons: true,
                  pets: true,
                  eventId: true,
                },
              })
            )
          );
          opponents = fullOpponents.filter((o): o is NonNullable<typeof o> => o !== null);
          console.log(`✅ Usando oponentes existentes (${opponents.length})\n`);
        }

        if (opponents.length === 0) {
          console.log(`⚠️  No hay oponentes disponibles para ${brute.name}. Saltando...\n`);
          continue;
        }

        // Pelear hasta agotar las peleas disponibles
        let currentFightsLeft = fightsLeft;

        while (currentFightsLeft > 0) {
          // Si no hay oponentes disponibles, obtener nuevos
          if (opponents.length === 0) {
            console.log(`⚠️  No hay más oponentes disponibles. Obteniendo nuevos...`);
            const newOpponents = await getOpponents(prisma, brute);
            
            if (newOpponents.length === 0) {
              console.log(`⚠️  No se pudieron obtener más oponentes. Finalizando...\n`);
              break;
            }

            // Actualizar oponentes
            await prisma.brute.update({
              where: { id: brute.id },
              data: {
                opponents: {
                  set: newOpponents.map((o) => ({ id: o.id })),
                },
                opponentsGeneratedAt: new Date(),
              },
            });

            opponents = newOpponents;
          }

          // Seleccionar un oponente aleatorio de la lista
          const randomIndex = Math.floor(Math.random() * opponents.length);
          const opponent = opponents[randomIndex];

          if (!opponent) {
            // Si el oponente seleccionado no existe, removerlo y continuar
            opponents = opponents.filter((o, i) => i !== randomIndex);
            continue;
          }

          console.log(`  🥊 Pelea ${fightsLeft - currentFightsLeft + 1}/${fightsLeft}: ${brute.name} vs ${opponent.name}`);

          try {
            // Obtener el bruto actualizado antes de pelear
            const updatedBrute = await prisma.brute.findFirst({
              where: {
                id: brute.id,
                deletedAt: null,
              },
              include: {
                opponents: {
                  select: { name: true },
                },
              },
            });

            if (!updatedBrute) {
              console.log(`  ❌ Bruto ${brute.name} no encontrado. Saltando...\n`);
              break;
            }

            // Verificar nuevamente si puede subir de nivel
            const updatedCalculatedBrute = getCalculatedBrute(updatedBrute, modifiers);

            if (canLevelUp(updatedCalculatedBrute)) {
              console.log(`  ⚠️  ${brute.name} puede subir de nivel ahora. Saltando al siguiente bruto...\n`);
              break;
            }

            // Verificar peleas restantes
            const updatedFightsLeft = getFightsLeft(updatedCalculatedBrute, modifiers);
            if (updatedFightsLeft <= 0) {
              console.log(`  ⚠️  ${brute.name} no tiene más peleas disponibles.\n`);
              break;
            }

            // Obtener el oponente completo de la base de datos
            const opponentBrute = await prisma.brute.findFirst({
              where: {
                name: ilike(opponent.name),
                deletedAt: null,
              },
            });

            if (!opponentBrute) {
              console.log(`  ⚠️  Oponente ${opponent.name} no encontrado. Removiendo de la lista...\n`);
              // Remover el oponente que no existe y continuar con otro aleatorio
              opponents = opponents.filter((o) => o.id !== opponent.id);
              continue;
            }

            // Generar la pelea
            const opponentCalculatedBrute = getCalculatedBrute(opponentBrute, modifiers);
            const fightData = await generateFight({
              prisma,
              team1: { brutes: [updatedCalculatedBrute] },
              team2: { brutes: [opponentCalculatedBrute] },
              modifiers,
              backups: !updatedBrute.eventId,
              achievements: true,
            });

            // Guardar la pelea
            const fight = await prisma.fight.create({
              data: fightData.data,
            });

            // Determinar ganador
            const brute1Won = isWinner(updatedBrute, fightData.data);
            
            // Calcular XP ganado
            const levelDifference = updatedBrute.level - opponentBrute.level;
            const event = await ServerState.getCurrentEvent(prisma);
            
            let xpGained = brute1Won
              ? updatedBrute.eventId
                ? updatedBrute.level >= (event?.maxLevel ?? 999)
                  ? 0
                  : getXPNeeded(updatedBrute.level + 1)
                : levelDifference > 10 ? 0 : levelDifference > 2 ? 1 : 2
              : updatedBrute.eventId
                ? updatedBrute.level >= (event?.maxLevel ?? 999)
                  ? 0
                  : Math.ceil(getXPNeeded(updatedBrute.level + 1) / 2)
                : levelDifference > 10 ? 0 : 1;

            // Double XP modifier
            if (modifiers[FightModifier.doubleXP]) {
              xpGained *= 2;
            }

            // Actualizar bruto
            const updatedBruteAfterFight = await prisma.brute.update({
              where: { id: updatedBrute.id },
              data: {
                lastFight: new Date(),
                fightsLeft: updatedFightsLeft - 1,
                xp: { increment: xpGained },
                victories: { increment: brute1Won ? 1 : 0 },
                losses: { increment: brute1Won ? 0 : 1 },
              },
            });

            // Crear logs
            await prisma.log.create({
              data: {
                currentBrute: { connect: { id: updatedBrute.id } },
                type: brute1Won ? LogType.win : LogType.lose,
                brute: opponentBrute.name,
                fight: { connect: { id: fight.id } },
                xp: xpGained,
                template: randomBetween(0, FightLogTemplateCount - 1).toString(),
              },
            });

            const opponentWon = isWinner(opponentBrute, fightData.data);
            await prisma.log.create({
              data: {
                currentBrute: { connect: { id: opponentBrute.id } },
                type: opponentWon ? LogType.win : LogType.lose,
                brute: updatedBrute.name,
                fight: { connect: { id: fight.id } },
                template: randomBetween(0, FightLogTemplateCount - 1).toString(),
              },
            });

            // Los oponentes se regeneran después de cada pelea (ver más abajo)

            console.log(`  ✅ Pelea completada: ${brute1Won ? 'Victoria' : 'Derrota'} (+${xpGained} XP)`);

            currentFightsLeft--;

            // Regenerar oponentes después de cada pelea para tener opciones frescas
            // Esto asegura que siempre haya oponentes aleatorios disponibles
            const freshOpponents = await getOpponents(prisma, updatedBruteAfterFight);
            if (freshOpponents.length > 0) {
              opponents = freshOpponents;
              await prisma.brute.update({
                where: { id: updatedBruteAfterFight.id },
                data: {
                  opponents: {
                    set: opponents.map((o) => ({ id: o.id })),
                  },
                  opponentsGeneratedAt: new Date(),
                },
              });
            }

            // Pequeña pausa entre peleas
            await new Promise((resolve) => setTimeout(resolve, 500));

          } catch (error) {
            console.error(`  ❌ Error en la pelea: ${error instanceof Error ? error.message : String(error)}`);
            // Remover el oponente que causó el error y continuar con otro aleatorio
            opponents = opponents.filter((o) => o.id !== opponent.id);
            continue;
          }
        }

        console.log(`\n✅ ${brute.name} completado\n`);

      } catch (error) {
        console.error(`❌ Error procesando ${brute.name}: ${error instanceof Error ? error.message : String(error)}\n`);
        continue;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Bot completado exitosamente');
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n❌ Error fatal: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
