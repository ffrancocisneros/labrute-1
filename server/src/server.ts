import express = require('express');

import { getGameDay, Version } from '@labrute/core';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { doubleCsrf } from 'csrf-csrf';
import dayjs from 'dayjs';
import path from 'path';
import { fileURLToPath } from 'url';
import schedule from 'node-schedule';
import { TournamentType } from '@labrute/prisma';
import { GLOBAL, ServerContext } from './context.js';
import { dailyJob } from './dailyJob.js';
import './i18n.js';
import { initRoutes } from './routes.js';
import { lockMiddleware } from './utils/middlewares/locks.js';
import { readyCheck } from './utils/middlewares/readyCheck.js';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function main(cx: ServerContext) {
  cx.logger.info(`Server started (v${Version})`);

  const app = express();
  const { port } = cx.config;

  // Cookie parser
  app.use(cookieParser(cx.config.cookieSecret));

  // CORS
  app.use(cors({
    origin: cx.config.corsRegex,
    credentials: true,
  }));

  // CSRF config
  const {
    generateToken,
    doubleCsrfProtection,
  } = doubleCsrf({
    getSecret: () => cx.config.csrfSecret,
    cookieName: 'csrfToken',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
    // CSRF should only protect state-changing requests.
    // Note: We also explicitly skip safe methods in `skipCsrfProtection` to avoid environment-specific behavior.
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    // Disable CSRF for read-only/health routes:
    // - Allow SPA/asset loads (GET/HEAD/OPTIONS)
    // - Allow health checks (/api/is-ready) so Railway can mark the service healthy
    // - Allow /api/user/:userId/done since it's used externally by other games
    skipCsrfProtection: (req) => (
      req.method === 'GET'
      || req.method === 'HEAD'
      || req.method === 'OPTIONS'
      || req.path === '/api/is-ready'
      || req.path === '/api/is-ready/'
      || (req.path.startsWith('/api/user/') && req.path.endsWith('/done'))
    ),
  });

  // CSRF getter
  app.get('/api/csrf', (req, res) => {
    const csrfToken = generateToken(req, res);

    res.json({ csrfToken });
  });

  // CSRF middleware
  // Only protect API routes with CSRF. Never block the SPA root or static assets.
  app.use('/api', doubleCsrfProtection);

  // Silence CSRF errors
  const csrfErrorSilencer: express.ErrorRequestHandler = (err: Error, _req, res, next) => {
    if (err && err.name === 'ForbiddenError' && err.message === 'invalid csrf token') {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    return next(err);
  };

  app.use(csrfErrorSilencer);

  app.use(bodyParser.json());
  app.use(
    bodyParser.urlencoded({
      extended: true,
    }),
  );
  app.use(lockMiddleware);
  app.use(readyCheck);

  app.listen(port, () => {
    cx.logger.info(`Server listening on port ${port}`);

    const dailyJobFn = dailyJob(cx.prisma);

    // Trigger daily job
    dailyJobFn().catch((error: Error) => {
      cx.discord.sendError(error);
    });

    // Actualizar recompensas del pase de batalla al iniciar
    import('./utils/battlePass/ensureNextSeason.js').then(({ updateCurrentSeasonRewards }) => {
      updateCurrentSeasonRewards(cx.prisma).catch((error: Error) => {
        cx.logger.error(`updateCurrentSeasonRewards error: ${error.message}`);
      });
    });

    // Daily job: 21:00 UTC = 18:00 Argentina (UTC-3, no DST).
    schedule.scheduleJob('0 21 * * *', dailyJobFn);

    // Fallback: every 15 min after 21:00 UTC, check if today's daily
    // tournaments exist (using the game-day calendar). If missing, re-run.
    schedule.scheduleJob('*/15 * * * *', async () => {
      if (dayjs.utc().hour() < 21) {
        return;
      }

      try {
        const today = getGameDay();
        const tomorrow = today.add(1, 'day');

        const todayDailyTournaments = await cx.prisma.tournament.count({
          where: {
            type: TournamentType.DAILY,
            date: {
              gte: today.toDate(),
              lt: tomorrow.toDate(),
            },
          },
        });

        if (todayDailyTournaments > 0) {
          return;
        }

        cx.logger.info('Safety scheduler: running daily job because no daily tournaments found for today');
        await dailyJobFn();
      } catch (error) {
        if (error instanceof Error) {
          cx.logger.error(`Safety scheduler error: ${error.message}`);
        } else {
          cx.logger.error('Safety scheduler error (non-Error value)');
        }
      }
    });
  });

  initRoutes(app, cx.config, cx.prisma);

  // Serve static files from client build (production)
  if (cx.config.isProduction) {
    // Trust proxy for correct IP detection behind Railway/nginx
    app.set('trust proxy', 1);

    // Path to client build folder (relative to server/lib/)
    const clientBuildPath = path.resolve(__dirname, '../../client/build');

    // Serve static files
    app.use(express.static(clientBuildPath));

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'Not found' });
      }
      return res.sendFile(path.join(clientBuildPath, 'index.html'));
    });

    cx.logger.info(`Serving static files from ${clientBuildPath}`);
  }
}

/**
 * Initialize the global context, then run `main`
 */
export function mainWrapper() {
  // Note: We don't dispose the global context since the server is expected to
  // run forever
  main(GLOBAL);
}
