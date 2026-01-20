import { MissionCategory, MissionRewardType, MissionType, PrismaClient } from '@labrute/prisma';

export interface MissionConfig {
  category: MissionCategory;
  type: MissionType;
  title: string;
  description: string;
  target: number;
  rewardType: MissionRewardType;
  rewardValue: number;
  order: number;
}

// Configuraciones de misiones generales por categoría
export const GENERAL_MISSIONS_CONFIG: MissionConfig[] = [
  // COMBATE — Ganar peleas (1, 10, 25, 50)
  { category: MissionCategory.COMBAT, type: MissionType.WIN_FIGHTS, title: 'Primera Victoria', description: 'Gana tu primera pelea', target: 1, rewardType: MissionRewardType.GOLD, rewardValue: 50, order: 1 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_FIGHTS, title: 'Combatiente', description: 'Gana 10 peleas', target: 10, rewardType: MissionRewardType.GOLD, rewardValue: 200, order: 2 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_FIGHTS, title: 'Guerrero', description: 'Gana 25 peleas', target: 25, rewardType: MissionRewardType.GOLD, rewardValue: 350, order: 3 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_FIGHTS, title: 'Campeón', description: 'Gana 50 peleas', target: 50, rewardType: MissionRewardType.GOLD, rewardValue: 500, order: 4 },
  // Racha de victorias (5, 10, 15, 30)
  { category: MissionCategory.COMBAT, type: MissionType.WIN_FIGHTS_STREAK, title: 'Racha de 5', description: 'Gana 5 peleas consecutivas', target: 5, rewardType: MissionRewardType.GOLD, rewardValue: 300, order: 5 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_FIGHTS_STREAK, title: 'Racha de 10', description: 'Gana 10 peleas consecutivas', target: 10, rewardType: MissionRewardType.GOLD, rewardValue: 500, order: 6 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_FIGHTS_STREAK, title: 'Racha de 15', description: 'Gana 15 peleas consecutivas', target: 15, rewardType: MissionRewardType.GOLD, rewardValue: 700, order: 7 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_FIGHTS_STREAK, title: 'Racha de 30', description: 'Gana 30 peleas consecutivas', target: 30, rewardType: MissionRewardType.GOLD, rewardValue: 1200, order: 8 },
  // Torneos diarios (1, 3, 5, 10, 30)
  { category: MissionCategory.COMBAT, type: MissionType.WIN_TOURNAMENT, title: 'Campeón del Día', description: 'Gana un torneo diario', target: 1, rewardType: MissionRewardType.GOLD, rewardValue: 500, order: 9 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_TOURNAMENT, title: 'Triple Corona', description: 'Gana 3 torneos diarios', target: 3, rewardType: MissionRewardType.GOLD, rewardValue: 1200, order: 10 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_TOURNAMENT, title: 'Pentacampeón', description: 'Gana 5 torneos diarios', target: 5, rewardType: MissionRewardType.GOLD, rewardValue: 2000, order: 11 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_TOURNAMENT, title: 'Decacampeón', description: 'Gana 10 torneos diarios', target: 10, rewardType: MissionRewardType.GOLD, rewardValue: 4000, order: 12 },
  { category: MissionCategory.COMBAT, type: MissionType.WIN_TOURNAMENT, title: 'Leyenda del Torneo', description: 'Gana 30 torneos diarios', target: 30, rewardType: MissionRewardType.GOLD, rewardValue: 10000, order: 13 },
  // Daño causado (1000, 2000, 5000)
  { category: MissionCategory.COMBAT, type: MissionType.DEAL_DAMAGE, title: 'Destructor', description: 'Causa 1000 de daño en total', target: 1000, rewardType: MissionRewardType.GOLD, rewardValue: 400, order: 14 },
  { category: MissionCategory.COMBAT, type: MissionType.DEAL_DAMAGE, title: 'Devastador', description: 'Causa 2000 de daño en total', target: 2000, rewardType: MissionRewardType.GOLD, rewardValue: 700, order: 15 },
  { category: MissionCategory.COMBAT, type: MissionType.DEAL_DAMAGE, title: 'Aniquilador', description: 'Causa 5000 de daño en total', target: 5000, rewardType: MissionRewardType.GOLD, rewardValue: 1500, order: 16 },
  { category: MissionCategory.COMBAT, type: MissionType.PARTICIPATE_CLAN_WAR, title: 'Soldado de Clan', description: 'Participa en una guerra de clan', target: 1, rewardType: MissionRewardType.GOLD, rewardValue: 300, order: 17 },

  // PROGRESIÓN — Nivel (10, 20, 30, 40, 50, 60)
  { category: MissionCategory.PROGRESSION, type: MissionType.REACH_LEVEL, title: 'Principiante', description: 'Llega al nivel 10', target: 10, rewardType: MissionRewardType.GOLD, rewardValue: 200, order: 1 },
  { category: MissionCategory.PROGRESSION, type: MissionType.REACH_LEVEL, title: 'Experimentado', description: 'Llega al nivel 20', target: 20, rewardType: MissionRewardType.GOLD, rewardValue: 400, order: 2 },
  { category: MissionCategory.PROGRESSION, type: MissionType.REACH_LEVEL, title: 'Veterano', description: 'Llega al nivel 30', target: 30, rewardType: MissionRewardType.GOLD, rewardValue: 600, order: 3 },
  { category: MissionCategory.PROGRESSION, type: MissionType.REACH_LEVEL, title: 'Élite', description: 'Llega al nivel 40', target: 40, rewardType: MissionRewardType.GOLD, rewardValue: 800, order: 4 },
  { category: MissionCategory.PROGRESSION, type: MissionType.REACH_LEVEL, title: 'Maestro', description: 'Llega al nivel 50', target: 50, rewardType: MissionRewardType.GOLD, rewardValue: 1000, order: 5 },
  { category: MissionCategory.PROGRESSION, type: MissionType.REACH_LEVEL, title: 'Supremo', description: 'Llega al nivel 60', target: 60, rewardType: MissionRewardType.GOLD, rewardValue: 1500, order: 6 },
  // Ascensiones (1 a 10)
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Ascendido', description: 'Asciende por primera vez', target: 1, rewardType: MissionRewardType.TITLE, rewardValue: 1, order: 7 },
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Doble Ascenso', description: 'Asciende 2 veces', target: 2, rewardType: MissionRewardType.GOLD, rewardValue: 400, order: 8 },
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Triple Ascenso', description: 'Asciende 3 veces', target: 3, rewardType: MissionRewardType.GOLD, rewardValue: 600, order: 9 },
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Cuádruple Ascenso', description: 'Asciende 4 veces', target: 4, rewardType: MissionRewardType.GOLD, rewardValue: 800, order: 10 },
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Quintuple Ascenso', description: 'Asciende 5 veces', target: 5, rewardType: MissionRewardType.GOLD, rewardValue: 1000, order: 11 },
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Sextuple Ascenso', description: 'Asciende 6 veces', target: 6, rewardType: MissionRewardType.GOLD, rewardValue: 1200, order: 12 },
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Séptuple Ascenso', description: 'Asciende 7 veces', target: 7, rewardType: MissionRewardType.GOLD, rewardValue: 1400, order: 13 },
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Óctuple Ascenso', description: 'Asciende 8 veces', target: 8, rewardType: MissionRewardType.GOLD, rewardValue: 1600, order: 14 },
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Nónuple Ascenso', description: 'Asciende 9 veces', target: 9, rewardType: MissionRewardType.GOLD, rewardValue: 1800, order: 15 },
  { category: MissionCategory.PROGRESSION, type: MissionType.ASCEND, title: 'Décuple Ascenso', description: 'Asciende 10 veces', target: 10, rewardType: MissionRewardType.GOLD, rewardValue: 2500, order: 16 },
  // Peleas completadas (100, 250, 350, 500, 750, 1000, 1500, 2000, 2500, 3500, 5000)
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Luchador', description: 'Completa 100 peleas', target: 100, rewardType: MissionRewardType.GOLD, rewardValue: 500, order: 17 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Gladiador', description: 'Completa 250 peleas', target: 250, rewardType: MissionRewardType.GOLD, rewardValue: 900, order: 18 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Batallador', description: 'Completa 350 peleas', target: 350, rewardType: MissionRewardType.GOLD, rewardValue: 1100, order: 19 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Combatiente incansable', description: 'Completa 500 peleas', target: 500, rewardType: MissionRewardType.GOLD, rewardValue: 1500, order: 20 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Veterano de arena', description: 'Completa 750 peleas', target: 750, rewardType: MissionRewardType.GOLD, rewardValue: 2000, order: 21 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Maestro de la arena', description: 'Completa 1000 peleas', target: 1000, rewardType: MissionRewardType.GOLD, rewardValue: 2500, order: 22 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Leyenda en formación', description: 'Completa 1500 peleas', target: 1500, rewardType: MissionRewardType.GOLD, rewardValue: 3500, order: 23 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Leyenda', description: 'Completa 2000 peleas', target: 2000, rewardType: MissionRewardType.GOLD, rewardValue: 4500, order: 24 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Mito', description: 'Completa 2500 peleas', target: 2500, rewardType: MissionRewardType.GOLD, rewardValue: 5500, order: 25 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Titán', description: 'Completa 3500 peleas', target: 3500, rewardType: MissionRewardType.GOLD, rewardValue: 7000, order: 26 },
  { category: MissionCategory.PROGRESSION, type: MissionType.COMPLETE_FIGHTS, title: 'Inmortal', description: 'Completa 5000 peleas', target: 5000, rewardType: MissionRewardType.GOLD, rewardValue: 10000, order: 27 },
  // XP ganada (500, 1000, 1500, 2000)
  { category: MissionCategory.PROGRESSION, type: MissionType.GAIN_XP, title: 'Experiencia', description: 'Gana 500 XP', target: 500, rewardType: MissionRewardType.GOLD, rewardValue: 300, order: 28 },
  { category: MissionCategory.PROGRESSION, type: MissionType.GAIN_XP, title: 'Aprendizaje', description: 'Gana 1000 XP', target: 1000, rewardType: MissionRewardType.GOLD, rewardValue: 500, order: 29 },
  { category: MissionCategory.PROGRESSION, type: MissionType.GAIN_XP, title: 'Evolución', description: 'Gana 1500 XP', target: 1500, rewardType: MissionRewardType.GOLD, rewardValue: 700, order: 30 },
  { category: MissionCategory.PROGRESSION, type: MissionType.GAIN_XP, title: 'Maestría', description: 'Gana 2000 XP', target: 2000, rewardType: MissionRewardType.GOLD, rewardValue: 900, order: 31 },

  // SOCIAL
  { category: MissionCategory.SOCIAL, type: MissionType.FOLLOW_BRUTES, title: 'Seguidor', description: 'Sigue a 5 brutes', target: 5, rewardType: MissionRewardType.GOLD, rewardValue: 200, order: 1 },
  { category: MissionCategory.SOCIAL, type: MissionType.JOIN_CLAN, title: 'Miembro de Clan', description: 'Únete a un clan', target: 1, rewardType: MissionRewardType.GOLD, rewardValue: 300, order: 2 },
  { category: MissionCategory.SOCIAL, type: MissionType.PARTICIPATE_CLAN_WARS, title: 'Guerrero de Clan', description: 'Participa en 5 guerras de clan', target: 5, rewardType: MissionRewardType.GOLD, rewardValue: 500, order: 3 },

  // EVENTOS
  { category: MissionCategory.EVENTS, type: MissionType.PARTICIPATE_EVENT, title: 'Participante', description: 'Participa en un Battle Royale', target: 1, rewardType: MissionRewardType.GOLD, rewardValue: 400, order: 1 },
  { category: MissionCategory.EVENTS, type: MissionType.REACH_EVENT_FINAL, title: 'Finalista', description: 'Llega a la final de un Battle Royale', target: 1, rewardType: MissionRewardType.GOLD, rewardValue: 1000, order: 2 },
  { category: MissionCategory.EVENTS, type: MissionType.WIN_EVENT, title: 'Último hombre en pie', description: 'Gana un Battle Royale', target: 1, rewardType: MissionRewardType.TITLE, rewardValue: 2, order: 3 },

  // ESPECIALES
  { category: MissionCategory.SPECIAL, type: MissionType.CREATE_BRUTES, title: 'Creador', description: 'Crea 3 brutes diferentes', target: 3, rewardType: MissionRewardType.GOLD, rewardValue: 300, order: 1 },
  { category: MissionCategory.SPECIAL, type: MissionType.TRY_DIFFERENT_SKILLS, title: 'Versátil', description: 'Usa 10 habilidades diferentes', target: 10, rewardType: MissionRewardType.GOLD, rewardValue: 400, order: 2 },
];

/**
 * Genera todas las misiones generales para un usuario
 */
export const generateGeneralMissions = async (
  prisma: PrismaClient,
  userId: string,
): Promise<void> => {
  // Verificar qué misiones ya tiene el usuario (por type + target)
  const existingMissions = await prisma.mission.findMany({
    where: { userId },
    select: { type: true, target: true },
  });

  const existingKeys = new Set(
    existingMissions.map((m) => `${m.type}_${m.target}`),
  );

  // Crear solo las misiones que no existen (misma type y target)
  const missionsToCreate = GENERAL_MISSIONS_CONFIG
    .filter((config) => !existingKeys.has(`${config.type}_${config.target}`))
    .map((config) => ({
      userId,
      category: config.category,
      type: config.type,
      title: config.title,
      description: config.description,
      target: config.target,
      rewardType: config.rewardType,
      rewardValue: config.rewardValue,
      order: config.order,
    }));

  if (missionsToCreate.length > 0) {
    await prisma.mission.createMany({
      data: missionsToCreate,
    });
  }
};
