import type { PrismaClient, ShopItem } from '@labrute/prisma';
import type { Request, Response } from 'express';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { purchaseItem } from '../utils/shop/purchaseItem.js';

export interface ShopGetResponse {
  items: ShopItem[];
}

export const Shop = {
  get: (prisma: PrismaClient) => async (
    req: Request,
    res: Response<ShopGetResponse>,
  ) => {
    try {
      await auth(prisma, req);

      const items = await prisma.shopItem.findMany({
        where: { available: true },
        orderBy: [
          { type: 'asc' },
          { order: 'asc' },
        ],
      });

      res.send({ items });
    } catch (e) {
      sendError(res, e);
    }
  },

  purchase: (prisma: PrismaClient) => async (
    req: Request<never, unknown, { itemId: string; bruteId?: string }>,
    res: Response<{ success: boolean }>,
  ) => {
    try {
      const user = await auth(prisma, req);
      const { itemId, bruteId } = req.body ?? {};

      if (!itemId) {
        throw new Error('Item ID requerido');
      }

      await purchaseItem({
        prisma,
        userId: user.id,
        itemId,
        bruteId,
      });

      res.send({ success: true });
    } catch (e) {
      sendError(res, e);
    }
  },
};
