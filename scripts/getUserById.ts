import { PrismaClient } from '@labrute/prisma';

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Uso: npx ts-node scripts/getUserById.ts <userId>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      console.error(`❌ Usuario con ID "${userId}" no encontrado`);
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.name} (ID: ${user.id})`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
