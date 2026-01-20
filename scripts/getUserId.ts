import { PrismaClient } from '@labrute/prisma';

/**
 * Script auxiliar para obtener el userId de una cuenta
 * 
 * Uso:
 *   npx ts-node scripts/getUserId.ts <nombreUsuario>  - Buscar por nombre
 *   npx ts-node scripts/getUserId.ts --list             - Listar todos los usuarios
 *   npx ts-node scripts/getUserId.ts --list --limit 10 - Listar primeros 10 usuarios
 */
async function main() {
  const prisma = new PrismaClient();

  try {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      console.log('\n📋 Script para obtener userId de cuentas\n');
      console.log('Uso:');
      console.log('  npx ts-node scripts/getUserId.ts <nombreUsuario>     - Buscar usuario por nombre');
      console.log('  npx ts-node scripts/getUserId.ts --list               - Listar todos los usuarios');
      console.log('  npx ts-node scripts/getUserId.ts --list --limit 10    - Listar primeros N usuarios');
      console.log('  npx ts-node scripts/getUserId.ts --help               - Mostrar esta ayuda\n');
      process.exit(0);
    }

    // Modo listar usuarios
    if (args[0] === '--list') {
      const limitArg = args.find(arg => arg.startsWith('--limit='));
      const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

      console.log('\n📋 Listando usuarios...\n');

      const users = await prisma.user.findMany({
        where: {
          bannedAt: null,
        },
        select: {
          id: true,
          name: true,
          gold: true,
          lastSeen: true,
          brutes: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          lastSeen: 'desc',
        },
        take: limit,
      });

      if (users.length === 0) {
        console.log('⚠️  No se encontraron usuarios');
        process.exit(0);
      }

      console.log(`✅ Encontrados ${users.length} usuario(s):\n`);
      console.log('─'.repeat(80));
      console.log(`${'Nombre'.padEnd(30)} ${'ID'.padEnd(40)} ${'Brutos'.padEnd(8)} ${'Última vez'}`);
      console.log('─'.repeat(80));

      for (const user of users) {
        const bruteCount = user.brutes.length;
        const lastSeen = user.lastSeen.toLocaleDateString('es-ES');
        console.log(
          `${user.name.padEnd(30)} ${user.id.padEnd(40)} ${bruteCount.toString().padEnd(8)} ${lastSeen}`
        );
      }

      console.log('─'.repeat(80));
      console.log(`\n💡 Para usar el bot de peleas, copia el ID de la cuenta deseada\n`);
      process.exit(0);
    }

    // Modo buscar por nombre
    const userName = args[0];

    console.log(`\n🔍 Buscando usuario: "${userName}"\n`);

    const user = await prisma.user.findFirst({
      where: {
        name: {
          equals: userName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        gold: true,
        lastSeen: true,
        bannedAt: true,
        brutes: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });

    if (!user) {
      console.error(`❌ Usuario "${userName}" no encontrado\n`);
      console.log('💡 Sugerencias:');
      console.log('   - Verifica que el nombre sea correcto');
      console.log('   - Usa --list para ver todos los usuarios disponibles');
      process.exit(1);
    }

    if (user.bannedAt) {
      console.log(`⚠️  Usuario encontrado pero está baneado (desde ${user.bannedAt.toLocaleDateString('es-ES')})\n`);
    }

    console.log('✅ Usuario encontrado:\n');
    console.log('─'.repeat(80));
    console.log(`Nombre:     ${user.name}`);
    console.log(`ID:         ${user.id}`);
    console.log(`Oro:        ${user.gold}`);
    console.log(`Última vez: ${user.lastSeen.toLocaleDateString('es-ES')}`);
    console.log(`Brutos:     ${user.brutes.length}`);
    console.log('─'.repeat(80));

    if (user.brutes.length > 0) {
      console.log('\n📋 Brutos de este usuario:');
      user.brutes.forEach((brute, index) => {
        console.log(`  ${index + 1}. ${brute.name} (Nivel ${brute.level})`);
      });
    }

    console.log('\n💡 Para ejecutar el bot de peleas, usa:');
    console.log(`   npx ts-node scripts/autoFightBot.ts ${user.id}\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
