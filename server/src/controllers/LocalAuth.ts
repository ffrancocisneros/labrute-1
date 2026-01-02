import {
  ExpectedError,
  ForbiddenError,
  UsersAuthenticateResponse,
  Version,
} from '@labrute/core';
import { InventoryItemType, PrismaClient, UserLogType } from '@labrute/prisma';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { Config } from '../config.js';
import { createUserLog } from '../utils/createUserLog.js';
import { sendError } from '../utils/sendError.js';
import { ServerState } from '../utils/ServerState.js';
import { translate } from '../utils/translate.js';

interface SimpleLoginRequest {
  username: string;
  secret: string;
}

/**
 * Local authentication controller for private deployments.
 * Uses a shared secret (LOCAL_AUTH_SECRET) instead of Eternal-Twin OAuth.
 */
export class LocalAuth {
  #config: Config;

  #prisma: PrismaClient;

  public constructor(config: Config, prisma: PrismaClient) {
    this.#config = config;
    this.#prisma = prisma;
  }

  /**
   * Simple login with username + shared secret.
   * Creates user if not exists, rotates connexionToken on each login.
   */
  public async login(
    req: Request<never, unknown, SimpleLoginRequest>,
    res: Response<UsersAuthenticateResponse>,
  ) {
    try {
      const { username, secret } = req.body;

      // Validate input
      if (!username || typeof username !== 'string') {
        throw new ExpectedError('Username is required');
      }
      if (!secret || typeof secret !== 'string') {
        throw new ExpectedError('Secret is required');
      }

      // Validate username format (basic sanitation)
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 2 || trimmedUsername.length > 255) {
        throw new ExpectedError('Username must be between 2 and 255 characters');
      }

      // Validate shared secret
      if (secret !== this.#config.localAuthSecret) {
        throw new ForbiddenError('Invalid secret');
      }

      // Get user's IP for security checks
      const ip = req.headers['x-forwarded-for']?.toString().split(', ')[0]
        || req.headers['x-real-ip']?.toString().split(', ')[0]
        || req.socket.remoteAddress;

      if (ip) {
        // Check if the IP is banned
        const bannedIp = await ServerState.isIpBanned(this.#prisma, ip);
        if (bannedIp) {
          throw new ForbiddenError(translate('ipBanned', null));
        }
      }

      // Generate new connexionToken for this session
      const newToken = randomUUID();

      // Try to find existing user by name
      let user = await this.#prisma.user.findFirst({
        where: { name: trimmedUsername },
        include: {
          brutes: {
            where: { deletedAt: null },
            orderBy: [
              { favorite: 'desc' },
              { createdAt: 'asc' },
            ],
          },
          following: {
            select: { id: true },
          },
          notifications: {
            where: { read: false },
          },
        },
      });

      if (user) {
        // User exists - check if banned
        if (user.bannedAt) {
          throw new ForbiddenError(
            translate('bannedAccount', user, {
              reason: translate(`banReason.${user.banReason || ''}`, user),
            }),
          );
        }

        // Rotate connexionToken
        user = await this.#prisma.user.update({
          where: { id: user.id },
          data: { connexionToken: newToken },
          include: {
            brutes: {
              where: { deletedAt: null },
              orderBy: [
                { favorite: 'desc' },
                { createdAt: 'asc' },
              ],
            },
            following: {
              select: { id: true },
            },
            notifications: {
              where: { read: false },
            },
          },
        });
      } else {
        // Create new user
        const newUserId = randomUUID();

        user = await this.#prisma.user.create({
          data: {
            id: newUserId,
            connexionToken: newToken,
            name: trimmedUsername,
            // Give 5 free favorite fights to new users
            inventory: {
              create: {
                type: InventoryItemType.favoriteFight,
                count: 5,
              },
            },
          },
          include: {
            brutes: {
              where: { deletedAt: null },
              orderBy: [
                { favorite: 'desc' },
                { createdAt: 'asc' },
              ],
            },
            following: {
              select: { id: true },
            },
            notifications: {
              where: { read: false },
            },
          },
        });
      }

      // Update user's IP if not already stored
      if (ip && !user.ips.includes(ip)) {
        await this.#prisma.user.update({
          where: { id: user.id },
          data: {
            ips: { push: ip },
          },
        });
      }

      // Create login log
      createUserLog(this.#prisma, {
        type: UserLogType.CONNECT,
        userId: user.id,
      });

      res.send({
        user,
        modifiers: await ServerState.getModifiers(this.#prisma),
        currentEvent: await ServerState.getCurrentEvent(this.#prisma),
        version: Version,
      });
    } catch (error) {
      sendError(res, error);
    }
  }
}

