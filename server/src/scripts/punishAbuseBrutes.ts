import { GLOBAL, ServerContext } from '../context.js';
import { resetBrute } from '../utils/brute/resetBrute.js';

const TARGET_BRUTE_NAMES = [
  'ElroloPuente',
  'KPKITUNIOR',
  'aParteniendo',
  'Honey',
] as const;

const LOWEST_RANKING = 11; // "Cortador de pan" (ver client i18n: lvl_11)

function isPreviewMode() {
  const v = (process.env.PREVIEW ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

async function main(cx: ServerContext) {
  const preview = isPreviewMode();
  cx.logger.info(`punishAbuseBrutes: start (preview=${preview})`);

  const brutes = await cx.prisma.brute.findMany({
    where: {
      deletedAt: null,
      name: { in: [...TARGET_BRUTE_NAMES] },
    },
    select: {
      id: true,
      name: true,
      userId: true,
      ranking: true,
      canRankUpSince: true,
      destinyPath: true,
      previousDestinyPath: true,
      level: true,
      xp: true,
      eventId: true,
      ascensions: true,
      ascendedWeapons: true,
      ascendedSkills: true,
      ascendedPets: true,
    },
  });

  const foundNames = new Set(brutes.map((b) => b.name));
  const missing = TARGET_BRUTE_NAMES.filter((n) => !foundNames.has(n));
  if (missing.length) {
    cx.logger.warn(`Missing brutes (not found or deleted): ${missing.join(', ')}`);
  }

  // Stable order for logs
  const sorted = brutes.slice().sort((a, b) => a.name.localeCompare(b.name));

  for (const brute of sorted) {
    cx.logger.info(
      `Target ${brute.name} (${brute.id}) before: level=${brute.level} xp=${brute.xp} ranking=${brute.ranking} destinyPathLen=${brute.destinyPath.length}`,
    );

    // Safety: resetBrute requires the "first bonus" destinyChoice (path = [])
    const hasFirstBonus = await cx.prisma.destinyChoice.findFirst({
      where: { bruteId: brute.id, path: { equals: [] } },
      select: { id: true },
    });
    if (!hasFirstBonus) {
      cx.logger.error(
        `Skipping ${brute.name}: missing first bonus destinyChoice (path=[]). Run retrieveFirstBonus first.`,
      );
      continue;
    }

    if (preview) {
      cx.logger.info(`Preview: would resetBrute(rankUp=true) and set ranking=${LOWEST_RANKING}`);
      continue;
    }

    // 1) Reset identical to "rank up" flow: level 1 equivalent + destiny preserved in previousDestinyPath
    await resetBrute({
      prisma: cx.prisma,
      brute,
      free: true,
      rankUp: true,
    });

    // 2) Force lowest ranking ("Cortador de pan") regardless of current rank
    const updated = await cx.prisma.brute.update({
      where: { id: brute.id },
      data: {
        ranking: LOWEST_RANKING,
        // Belt & suspenders: ensure it's truly in a post-rankUp reset state
        canRankUpSince: null,
        tournamentWins: 0,
      },
      select: {
        id: true,
        name: true,
        level: true,
        xp: true,
        ranking: true,
        destinyPath: true,
        previousDestinyPath: true,
      },
    });

    cx.logger.info(
      `Target ${updated.name} (${updated.id}) after: level=${updated.level} xp=${updated.xp} ranking=${updated.ranking} destinyPathLen=${updated.destinyPath.length} prevDestinyLen=${updated.previousDestinyPath.length}`,
    );
  }

  cx.logger.info('punishAbuseBrutes: done');
}

/**
 * Initialize the global context, then run `main`
 */
async function mainWrapper() {
  await using context = GLOBAL;
  await main(context);
}

await mainWrapper();

