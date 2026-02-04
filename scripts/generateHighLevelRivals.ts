// Cargar variables de entorno (DATABASE_URL, etc.)
import * as dotenv from 'dotenv';
dotenv.config();

import {
  PrismaClient,
  Gender,
  Prisma,
  Brute,
  BruteStat,
  DestinyChoice,
  PetName,
  SkillName,
  WeaponName,
} from '@labrute/prisma';
import {
  FIGHTS_PER_DAY,
  createRandomBruteStats,
  getBruteToSave,
  getLevelUpChoices,
  getRandomBody,
  getRandomColors,
  applySkillModifiers,
  getCalculatedBrute,
  getFightsLeft,
  getHP,
  LevelUpChoice,
  pets,
} from '@labrute/core';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import {
  adjectives, animals, colors, languages, names, starWars, uniqueNamesGenerator,
} from 'unique-names-generator';

dayjs.extend(utc);

const prisma = new PrismaClient();

// Copia local de la lógica de updateBruteData (versión simplificada del servidor)
type BruteData = Pick<Brute, 'id' | 'level' | 'skills' | 'enduranceStat' | 'strengthStat'
  | 'agilityStat' | 'speedStat' | 'enduranceModifier' | 'strengthModifier'
  | 'agilityModifier' | 'speedModifier' | 'strengthValue' | 'agilityValue'
  | 'enduranceValue' | 'speedValue' | 'xp' | 'pets' | 'weapons' | 'hp' | 'fightsLeft' | 'lastFight' | 'eventId'>;

const updateStat = (brute: BruteData, stat: BruteStat, value: number) => {
  switch (stat) {
    case 'endurance':
      return { ...brute, enduranceStat: brute.enduranceStat + value };
    case 'strength':
      return { ...brute, strengthStat: brute.strengthStat + value };
    case 'agility':
      return { ...brute, agilityStat: brute.agilityStat + value };
    case 'speed':
      return { ...brute, speedStat: brute.speedStat + value };
    default:
      throw new Error('Invalid stat');
  }
};

const updateBruteData = (
  brute: BruteData,
  destinyChoice: DestinyChoice | LevelUpChoice,
) => {
  let updatedBrute = {
    ...brute,
    pets: [...brute.pets],
    skills: [...brute.skills],
    weapons: [...brute.weapons],
    xp: 0,
    level: brute.level + 1,
  };

  // New skill
  if (destinyChoice.type === 'skill') {
    const skillName = destinyChoice.skill;

    if (!skillName) {
      throw new Error('No skill provided');
    }

    const calculatedBrute = getCalculatedBrute(updatedBrute, {});

    // Handle +2 fights for `regeneration`
    if (skillName === SkillName.regeneration && !brute.eventId) {
      updatedBrute.fightsLeft = getFightsLeft(calculatedBrute) + 2;
    }

    calculatedBrute.skills[skillName] = calculatedBrute.skills[skillName]
      ? calculatedBrute.skills[skillName] + 1
      : 1;

    // STATS MODIFIERS
    applySkillModifiers(calculatedBrute, skillName, calculatedBrute.skills[skillName]);

    updatedBrute = getBruteToSave(calculatedBrute);
  } else if (destinyChoice.type === 'weapon') {
    // New weapon
    updatedBrute.weapons.push(destinyChoice.weapon as WeaponName);
  } else if (destinyChoice.type === 'pet') {
    // New pet
    const pet = destinyChoice.pet && pets[destinyChoice.pet];
    if (!pet) {
      throw new Error('Pet not found');
    }

    updatedBrute.pets.push(destinyChoice.pet as PetName);

    // Take into account the endurance malus from the pet
    if (updatedBrute.pets.filter((p) => p === destinyChoice.pet).length === 1) {
      // Only apply the malus if it's the first time we get this pet
      updatedBrute.enduranceStat -= pet.enduranceMalus;
    }
  } else if (destinyChoice.stat1 && !destinyChoice.stat2) {
    // +X stat
    const stat = destinyChoice.stat1;
    updatedBrute = updateStat(updatedBrute, stat, destinyChoice.stat1Value as number);
  } else {
    // +X/+X

    if (!destinyChoice.stat1 || !destinyChoice.stat2
      || !destinyChoice.stat1Value || !destinyChoice.stat2Value) {
      throw new Error('No stats provided');
    }

    updatedBrute = updateStat(
      updatedBrute,
      destinyChoice.stat1,
      destinyChoice.stat1Value,
    );
    updatedBrute = updateStat(
      updatedBrute,
      destinyChoice.stat2,
      destinyChoice.stat2Value,
    );
  }

  // Final stat values
  updatedBrute.enduranceValue = Math.floor(
    updatedBrute.enduranceStat * updatedBrute.enduranceModifier,
  );
  updatedBrute.strengthValue = Math.floor(
    updatedBrute.strengthStat * updatedBrute.strengthModifier,
  );
  updatedBrute.agilityValue = Math.floor(
    updatedBrute.agilityStat * updatedBrute.agilityModifier,
  );
  updatedBrute.speedValue = Math.floor(
    updatedBrute.speedStat * updatedBrute.speedModifier,
  );

  // Final HP
  updatedBrute.hp = getHP(updatedBrute.level, updatedBrute.enduranceValue);

  return updatedBrute;
};

// Genera un bruto NPC coherente para un nivel dado, reutilizando la lógica del seed
const generateBrute = (
  level: number,
  name: string,
): Prisma.BruteCreateInput => {
  if (level < 1) {
    throw new Error('Level must be at least 1');
  }

  // 50% de probabilidad de ser hombre/mujer
  const gender: Gender = Math.random() > 0.5 ? 'male' : 'female';

  // Level 1 stats (misma lógica que el seed)
  const data = {
    id: undefined,
    name,
    gender,
    body: getRandomBody(gender),
    colors: getRandomColors(gender),
    victories: 0,
    losses: 0,
    pupilsCount: 0,
    lastFight: dayjs.utc().toDate() as Date | null,
    fightsLeft: FIGHTS_PER_DAY,
    ...createRandomBruteStats(),
  };

  let bruteData = getBruteToSave(data);

  // Level the brute to desired level (misma lógica que el seed)
  for (let j = 1; j < level; j += 1) {
    // NOTE: Destiny is ignored for now

    // Get level up choices
    const levelUpChoices = getLevelUpChoices(bruteData);

    // Randomly choose one of the choices
    const levelUpChoice = Math.random() > 0.5 ? levelUpChoices[0] : levelUpChoices[1];

    // Update the brute data (misma lógica que en el seed)
    bruteData = {
      ...bruteData,
      ...updateBruteData(
        { ...bruteData, id: '', eventId: null },
        levelUpChoice,
      ),
      id: undefined,
    };
  }

  return bruteData;
};

// Genera un nombre bonito y (prácticamente) único
const generateNiceName = (alreadyUsed: Set<string>) => {
  let generatedName: string | null = null;

  // Reintentar hasta encontrar un nombre no usado en esta ejecución
  // (las colisiones con la DB son extremadamente poco probables)
  do {
    generatedName = uniqueNamesGenerator({
      dictionaries: [colors, adjectives, animals, names, languages, starWars],
      style: 'capital',
      separator: '',
      length: 2,
    }).replace(/\s/g, '').substring(0, 16);
  } while (!generatedName || alreadyUsed.has(generatedName));

  alreadyUsed.add(generatedName);
  return generatedName;
};

async function main() {
  console.log('🧪 Generando rivales NPC de alto nivel (50–100)...\n');

  const usedNames = new Set<string>();
  let created = 0;

  // 40 brutos por nivel del 50 al 100 inclusive
  for (let level = 50; level <= 100; level += 1) {
    console.log(`▶ Nivel ${level}: generando 40 brutos...`);

    for (let i = 0; i < 40; i += 1) {
      const name = generateNiceName(usedNames);

      const bruteData = generateBrute(level, name);

      await prisma.brute.create({
        data: bruteData,
      });

      created += 1;
    }

    console.log(`  ✅ Generados 40 NPCs para el nivel ${level}`);
  }

  console.log(`\n✨ Listo. Se generaron ${created} brutos NPC entre los niveles 50 y 100.`);
}

main()
  .catch((e) => {
    console.error('❌ Error generando rivales de alto nivel:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

