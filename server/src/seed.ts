/* eslint-disable no-console */
import {
  FIGHTS_PER_DAY,
  NPC_BRUTES_PER_LEVEL,
  NPC_MAX_LEVEL,
  createRandomBruteStats,
  getBruteToSave,
  getLevelUpChoices, getRandomBody,
  getRandomColors,
} from '@labrute/core';
import { Gender, Prisma } from '@labrute/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import {
  adjectives, animals, colors, languages, names, starWars, uniqueNamesGenerator,
} from 'unique-names-generator';
import { GLOBAL, ServerContext } from './context.js';
import { updateBruteData } from './utils/brute/updateBruteData.js';

dayjs.extend(utc);

const generateBrute = (
  level: number,
  name: string,
): Prisma.BruteCreateInput => {
  if (level < 1) {
    throw new Error('Level must be at least 1');
  }

  // 50% change male
  const gender: Gender = Math.random() > 0.5 ? 'male' : 'female';

  // Level 1 stats
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

  // Level the brute to desired level
  for (let j = 1; j < level; j++) {
    // NOTE: Destiny is ignored for now

    // Get level up choices
    const levelUpChoices = getLevelUpChoices(bruteData);

    // Randomly choose one of the choices
    const levelUpChoice = Math.random() > 0.5 ? levelUpChoices[0] : levelUpChoices[1];

    // Update the brute data
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

async function main(cx: ServerContext) {
  const totalNPCs = NPC_BRUTES_PER_LEVEL * NPC_MAX_LEVEL;

  // Check if DB is already seeded
  const count = await cx.prisma.brute.count({
    where: { userId: null, deletedAt: null },
  });

  if (count >= totalNPCs) {
    return;
  }

  // Setting old generated brutes as deleted
  await cx.prisma.brute.updateMany({
    where: { userId: null },
    data: { deletedAt: dayjs.utc().toDate() },
  });

  // Generate NPC brutes: 30 per level, from level 1 to 50
  cx.logger.log(`DB only contains ${count} NPC brutes, regenerating ${totalNPCs} (${NPC_BRUTES_PER_LEVEL} per level, levels 1-${NPC_MAX_LEVEL})...`);
  const nicks: string[] = [];

  for (let level = 1; level <= NPC_MAX_LEVEL; level++) {
    for (let i = 0; i < NPC_BRUTES_PER_LEVEL; i++) {
      let generatedName;

      // Reroll if name already exists
      while (!generatedName || nicks.includes(generatedName)) {
        generatedName = uniqueNamesGenerator({
          dictionaries: [colors, adjectives, animals, names, languages, starWars],
          style: 'capital',
          separator: '',
          length: 2,
        }).replace(/\s/g, '').substring(0, 16);
      }

      nicks.push(generatedName);

      await cx.prisma.brute.create({
        data: generateBrute(level, generatedName),
      });
    }

    cx.logger.log(`Generated ${NPC_BRUTES_PER_LEVEL} NPCs for level ${level}`);
  }

  cx.logger.log(`Finished generating ${totalNPCs} NPC brutes`);
}

/**
 * Initialize the global context, then run `main`
 */
async function mainWrapper() {
  await using context = GLOBAL;
  await main(context);
}

await mainWrapper();
