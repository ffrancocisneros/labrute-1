# LaBrute - Railway Deployment Guide

This guide explains how to deploy a private instance of LaBrute on Railway with local authentication (no Eternal-Twin required).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Railway Service                     │
│  ┌─────────────────────────────────────────────────┐│
│  │               Express Server                     ││
│  │  ┌─────────────┐    ┌─────────────────────────┐ ││
│  │  │  /api/*     │    │  Static Files           │ ││
│  │  │  (Backend)  │    │  (client/build)         │ ││
│  │  └─────────────┘    └─────────────────────────┘ ││
│  └─────────────────────────────────────────────────┘│
│                         │                            │
│                         ▼                            │
│              ┌─────────────────────┐                │
│              │  PostgreSQL Plugin  │                │
│              └─────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

- **Single service**: The server serves both the API and the React frontend
- **No CORS issues**: Everything runs on the same domain
- **Local auth**: Username + shared secret instead of Eternal-Twin OAuth

## Quick Start

### 1. Create Railway Project

1. Go to [Railway](https://railway.app/) and create a new project
2. Connect your GitHub repository (fork of labrute)
3. Add a **PostgreSQL** plugin to the project

### 2. Configure Environment Variables

In Railway dashboard, go to your service's **Variables** tab and add:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Auto-set by Railway when you link PostgreSQL | (automatic) |
| `NODE_ENV` | Must be "production" | `production` |
| `SELF_URL` | Your Railway URL with trailing slash | `https://your-app.up.railway.app/` |
| `COOKIE_SECRET` | Random 32+ character string | `abc123...` |
| `CSRF_SECRET` | Random 32+ character string | `xyz789...` |
| `LOCAL_AUTH_SECRET` | Shared password for your group | `my-secret-password` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `50380` (Railway sets this) |
| `CORS_REGEX` | CORS origin regex | `.*` |
| `OTEL_ENABLED` | Enable OpenTelemetry | `false` |
| `NODE_OPTIONS` | Node.js options | - |

### 3. Deploy Configuration

Railway should auto-detect the configuration from `nixpacks.toml` and `railway.json`.

**Build Command** (handled by nixpacks.toml):
```bash
corepack enable && yarn install --immutable && yarn compile && yarn build:client
```

**Start Command** (from railway.json):
```bash
bash scripts/start-production.sh
```

The start script runs migrations and seeds before starting the server.

### 4. First Deployment

1. Push your code to trigger a deployment
2. Wait for the build to complete (may take 5-10 minutes)
3. The first run will execute database migrations and seed data
4. Access your app at the Railway-provided URL

## Authentication

With `LOCAL_AUTH_SECRET` set, the app uses local authentication:

1. Users go to `/login`
2. Enter their username and the shared secret
3. If the user doesn't exist, they're created automatically
4. Users are logged in with a rotating session token

**No changes to the database schema** - uses the existing `User.connexionToken` field.

## Troubleshooting

### Out of Memory (OOM) during build

If you see OOM errors during build:

1. **Temporarily upgrade** your Railway plan to get more RAM (1GB+)
2. Add `NODE_OPTIONS=--max_old_space_size=1536` to environment variables
3. After successful deploy, you can downgrade the plan

### Database connection issues

1. Verify `DATABASE_URL` is set correctly (Railway auto-links this)
2. Check that PostgreSQL plugin is running
3. Try restarting the service

### Assets not loading

All assets are served from the same domain. If images aren't loading:

1. Verify the build completed successfully
2. Check that `client/build` exists in the deployment
3. Look at browser console for 404 errors

## Files Changed for Railway Support

### New Files
- `nixpacks.toml` - Nixpacks build configuration
- `railway.json` - Railway service configuration
- `scripts/start-production.sh` - Production start script
- `server/src/controllers/LocalAuth.ts` - Local authentication controller

### Modified Files
- `server/src/config.ts` - Added `otelEnabled`, `localAuthEnabled`, `localAuthSecret`
- `server/src/main.ts` - Made OpenTelemetry optional
- `server/src/routes.ts` - Added local auth routes, conditional OAuth
- `server/src/server.ts` - Serve static files in production
- `client/src/utils/cookies.ts` - Host-only cookies for Railway compatibility
- `client/src/utils/Server.ts` - Added auth mode detection
- `client/src/routes.tsx` - Added `/login` route
- `client/src/views/SimpleLoginView.tsx` - Login UI (new)
- `client/src/views/HomeView.tsx` - Updated login button
- `client/src/layouts/Main.tsx` - Updated login button
- `client/src/components/Cell/CellMain.tsx` - Updated login button

## Reverting to Eternal-Twin OAuth

To use Eternal-Twin OAuth instead of local auth:

1. Remove `LOCAL_AUTH_SECRET` from environment variables
2. Set `ETERNALTWIN_URL`, `ETERNALTWIN_CLIENT_REF`, `ETERNALTWIN_SECRET`, etc.
3. Optionally set `OTEL_ENABLED=true` for tracing
4. Redeploy

The app will automatically detect the auth mode and use OAuth.

