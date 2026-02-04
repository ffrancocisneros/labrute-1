import {
  ExpectedError,
  GoldTransactionsListRequest,
  GoldTransactionsListResponse,
} from '@labrute/core';
import { PrismaClient } from '@labrute/prisma';
import type { Request, Response } from 'express';
import { auth } from '../utils/auth.js';
import { sendError } from '../utils/sendError.js';
import { translate } from '../utils/translate.js';

export const GoldTransactions = {
  list: (prisma: PrismaClient) => async (
    req: Request<never, unknown, GoldTransactionsListRequest>,
    res: Response<GoldTransactionsListResponse>,
  ) => {
    try {
      const user = await auth(prisma, req);

      if (!req.body.page || Number.isNaN(+req.body.page)) {
        throw new ExpectedError(translate('invalidParameters', user));
      }

      const page = +req.body.page;
      const limit = req.body.limit ? +req.body.limit : 20;

      if (page < 1 || limit < 1 || limit > 100) {
        throw new ExpectedError(translate('invalidParameters', user));
      }

      // Get total count
      const total = await prisma.goldTransaction.count({
        where: { userId: user.id },
      });

      // Get transactions
      const transactions = await prisma.goldTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      });

      res.status(200).send({
        transactions: transactions.map((t) => ({
          id: t.id,
          userId: t.userId,
          amount: t.amount,
          source: t.source,
          sourceData: t.sourceData,
          bruteId: t.bruteId,
          createdAt: t.createdAt,
        })) as GoldTransactionsListResponse['transactions'],
        total,
      });
    } catch (error) {
      sendError(res, error);
    }
  },
};
