import { PrismaClient } from '@labrute/prisma';
import { DISCORD } from '../context.js';

/**
 * Crea una transacción de oro de forma asíncrona (fire-and-forget)
 * No bloquea el flujo principal para no afectar la latencia
 */
export const createGoldTransaction = (
  prisma: PrismaClient,
  data: {
    userId: string;
    amount: number;
    source: string;
    sourceData?: string | null;
    bruteId?: string | null;
  },
) => {
  prisma.goldTransaction.create({
    data,
  }).catch((error: unknown) => {
    if (error instanceof Error) {
      DISCORD().sendError(error);
    }
  });
};
