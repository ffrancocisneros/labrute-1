import express = require('express');

import { Version } from '@labrute/core';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { doubleCsrf } from 'csrf-csrf';
import path from 'path';
import { fileURLToPath } from 'url';
import schedule from 'node-schedule';
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
  app.use(doubleCsrfProtection);

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

    // Trigger daily job
    dailyJob(cx.prisma)().catch((error: Error) => {
      cx.discord.sendError(error);
    });

    // Initialize daily scheduler
    schedule.scheduleJob('0 0 * * *', dailyJob(cx.prisma));
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
