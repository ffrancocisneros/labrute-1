import { PrismaClient } from '@labrute/prisma';

const prisma = new PrismaClient();

// Enum values
const ShopItemType = {
  COSMETIC: 'COSMETIC',
  BONUS_FIGHTS: 'BONUS_FIGHTS',
  TEMPORARY_WEAPON: 'TEMPORARY_WEAPON',
  TEMPORARY_SKILL: 'TEMPORARY_SKILL',
} as const;

// Precios basados en rareza (odds) y poder de armas
// odds más bajos = más raro = más caro
const weaponPrices: Record<string, number> = {
  // Ultra raras (odds 0.4-2): 800-1200 oro
  racquet: 1200, // odds 0.4, muy poderosa defensivamente
  trombone: 1100, // odds 0.4, alto daño y disarm
  keyboard: 1000, // odds 0.4, muy rápido y combo
  fryingPan: 950, // odds 0.4, buen bloqueo
  leek: 900, // odds 0.4, muy rápido y combo
  mug: 850, // odds 0.4, rápido y combo
  noodleBowl: 800, // odds 0.4, thrown rápido
  piopio: 800, // odds 0.4, thrown con disarm
  
  // Muy raras (odds 3-6): 500-700 oro
  sword: 700, // odds 4, muy alto daño
  axe: 650, // odds 3, alto daño
  whip: 600, // odds 3, largo alcance y evasión
  fan: 600, // odds 2, muy rápido y evasivo
  halbard: 600, // odds 2, largo alcance
  flail: 550, // odds 4, alto daño y combo
  morningStar: 550, // odds 6, alto daño
  sai: 500, // odds 6, buen disarm y combo
  scimitar: 500, // odds 6, buen combo
  
  // Raras (odds 8-20): 300-500 oro
  shuriken: 450, // odds 8, thrown muy rápido
  trident: 400, // odds 10, largo alcance
  mammothBone: 350, // odds 20, buen daño
  
  // Comunes (odds 40-100): 200-300 oro
  lance: 300, // odds 40, largo alcance
  hatchet: 280, // odds 40, crítico
  bumps: 250, // odds 50, alto daño pero lento
  baton: 200, // odds 70, común pero útil
  knife: 200, // odds 80, rápido y crítico
  broadsword: 200, // odds 100, muy común
};

// Precios basados en rareza (odds) y poder de habilidades
const skillPrices: Record<string, number> = {
  // Ultra raras (odds 0.14-1): 1000-1500 oro
  immortality: 1500, // odds 0.14, booster muy poderoso
  hammer: 1400, // odds 1, super muy poderoso
  reconnaissance: 1300, // odds 1, booster único
  untouchable: 1200, // odds 1, passive muy poderoso
  hypnosis: 1100, // odds 0.5, super poderoso
  flashFlood: 1100, // odds 0.5, super con muchos usos
  chef: 1000, // odds 1, talent único
  
  // Muy raras (odds 2.5-5): 600-900 oro
  thief: 900, // odds 2.5, super útil
  resistant: 800, // odds 3, passive defensivo fuerte
  regeneration: 750, // odds 3, talent útil
  spy: 700, // odds 3, talent útil
  saboteur: 700, // odds 3, talent útil
  sabotage: 650, // odds 3, passive útil
  hostility: 650, // odds 4, passive ofensivo
  shock: 650, // odds 4, passive útil
  relentless: 650, // odds 4, passive útil
  survival: 650, // odds 4, passive útil
  leadSkeleton: 650, // odds 4, passive defensivo
  balletShoes: 650, // odds 4, passive útil
  determination: 650, // odds 4, passive útil
  ironHead: 650, // odds 4, passive útil
  cryOfTheDamned: 650, // odds 4, super útil
  tamer: 650, // odds 4, super con muchos usos
  chaining: 600, // odds 5, passive útil
  fastMetabolism: 600, // odds 5, passive útil
  backup: 600, // odds 5, talent útil
  hideaway: 600, // odds 5, talent útil
  monk: 600, // odds 5, talent útil
  haste: 600, // odds 5, super útil
  
  // Raras (odds 6-20): 400-600 oro
  bomb: 550, // odds 6, super con múltiples usos
  tragicPotion: 500, // odds 8, super útil
  firstStrike: 500, // odds 8, passive útil
  weaponsMaster: 450, // odds 10, passive muy útil
  martialArts: 450, // odds 10, passive muy útil
  fistsOfFury: 450, // odds 10, passive útil
  shield: 450, // odds 10, passive defensivo
  counterAttack: 450, // odds 10, passive útil
  vampirism: 450, // odds 10, super útil
  repulse: 450, // odds 10, passive útil
  net: 400, // odds 16, super útil
  fierceBrute: 400, // odds 20, super útil
  treat: 400, // odds 20, super con muchos usos
  
  // Comunes (odds 30-60): 300-400 oro
  toughenedSkin: 350, // odds 30, passive defensivo común
  sixthSense: 300, // odds 20, passive común
  herculeanStrength: 300, // odds 60, booster común
  felineAgility: 300, // odds 60, booster común
  lightningBolt: 300, // odds 60, booster común
  vitality: 300, // odds 60, booster común
};

async function main() {
  console.log('🛒 Poblando items iniciales de la tienda...\n');

  // Verificar si ya existen items
  const existingItems = await (prisma as any).shopItem.count();
  if (existingItems > 0) {
    console.log(`⚠️  Ya existen ${existingItems} items en la tienda.`);
    console.log('Actualizando items existentes...\n');
  }

  let order = 0;

  // 1. TODAS LAS ARMAS TEMPORALES
  console.log('📦 Agregando armas temporales...');
  const allWeapons = [
    'fan', 'keyboard', 'knife', 'leek', 'mug', 'sai', 'racquet', 'axe',
    'bumps', 'flail', 'fryingPan', 'hatchet', 'mammothBone', 'morningStar',
    'trombone', 'baton', 'halbard', 'lance', 'trident', 'whip', 'noodleBowl',
    'piopio', 'shuriken', 'broadsword', 'scimitar', 'sword',
  ];

  for (const weapon of allWeapons) {
    const price = weaponPrices[weapon] || 300; // Default 300 si no está definido
    const existing = await (prisma as any).shopItem.findFirst({
      where: {
        type: ShopItemType.TEMPORARY_WEAPON,
        valueString: weapon,
      },
    });

    if (existing) {
      await (prisma as any).shopItem.update({
        where: { id: existing.id },
        data: {
          name: weapon,
          description: `Arma temporal por 24 horas`,
          price,
          available: true,
          order: order++,
        },
      });
    } else {
      await (prisma as any).shopItem.create({
        data: {
          type: ShopItemType.TEMPORARY_WEAPON,
          name: weapon,
          description: `Arma temporal por 24 horas`,
          price,
          valueString: weapon,
          available: true,
          order: order++,
        },
      });
    }
    console.log(`  ✅ ${weapon}: ${price} oro`);
  }

  // 2. TODAS LAS HABILIDADES TEMPORALES
  console.log('\n⚡ Agregando habilidades temporales...');
  const allSkills = [
    'herculeanStrength', 'felineAgility', 'lightningBolt', 'vitality',
    'immortality', 'reconnaissance', 'weaponsMaster', 'martialArts',
    'sixthSense', 'hostility', 'fistsOfFury', 'shield', 'armor',
    'toughenedSkin', 'untouchable', 'sabotage', 'shock', 'bodybuilder',
    'relentless', 'survival', 'leadSkeleton', 'balletShoes', 'determination',
    'firstStrike', 'resistant', 'counterAttack', 'ironHead', 'thief',
    'fierceBrute', 'tragicPotion', 'net', 'bomb', 'hammer', 'cryOfTheDamned',
    'hypnosis', 'flashFlood', 'tamer', 'regeneration', 'chef', 'spy',
    'saboteur', 'backup', 'hideaway', 'monk', 'vampirism', 'chaining',
    'haste', 'treat', 'repulse', 'fastMetabolism',
  ];

  for (const skill of allSkills) {
    const price = skillPrices[skill] || 400; // Default 400 si no está definido
    const existing = await (prisma as any).shopItem.findFirst({
      where: {
        type: ShopItemType.TEMPORARY_SKILL,
        valueString: skill,
      },
    });

    if (existing) {
      await (prisma as any).shopItem.update({
        where: { id: existing.id },
        data: {
          name: skill,
          description: `Habilidad temporal por 24 horas`,
          price,
          available: true,
          order: order++,
        },
      });
    } else {
      await (prisma as any).shopItem.create({
        data: {
          type: ShopItemType.TEMPORARY_SKILL,
          name: skill,
          description: `Habilidad temporal por 24 horas`,
          price,
          valueString: skill,
          available: true,
          order: order++,
        },
      });
    }
    console.log(`  ✅ ${skill}: ${price} oro`);
  }

  // 3. PELEAS EXTRA
  console.log('\n⚔️ Agregando peleas extra...');
  const bonusFights = [
    { count: 5, price: 600 },
    { count: 10, price: 1000 },
  ];

  for (const bonus of bonusFights) {
    const existing = await (prisma as any).shopItem.findFirst({
      where: {
        type: ShopItemType.BONUS_FIGHTS,
        valueInt: bonus.count,
      },
    });

    if (existing) {
      await (prisma as any).shopItem.update({
        where: { id: existing.id },
        data: {
          name: `${bonus.count} peleas extra`,
          description: `${bonus.count} peleas adicionales por 24 horas`,
          price: bonus.price,
          available: true,
          order: order++,
        },
      });
    } else {
      await (prisma as any).shopItem.create({
        data: {
          type: ShopItemType.BONUS_FIGHTS,
          name: `${bonus.count} peleas extra`,
          description: `${bonus.count} peleas adicionales por 24 horas`,
          price: bonus.price,
          valueInt: bonus.count,
          available: true,
          order: order++,
        },
      });
    }
    console.log(`  ✅ ${bonus.count} peleas: ${bonus.price} oro`);
  }

  console.log(`\n✨ ¡Completado! Se crearon/actualizaron ${order} items en la tienda.`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
