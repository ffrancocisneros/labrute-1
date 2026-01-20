#!/usr/bin/env bash
# Production start script for Railway
# Runs migrations/seed, then starts the server

set -e

echo "Running database migrations and seed..."
cd server

# First attempt
if yarn db:sync:prod; then
  echo "Database migrations completed."
else
  echo "Database migrations failed. Attempting automatic recovery..."

  # If we have a known failed migration in prod, Prisma blocks all further migrations (P3009).
  # Mark the failed migration as rolled back, then re-run deploy (which will apply the v2 repair migration).
  yarn prisma migrate resolve --rolled-back 20260119000000_add_shop_system || true

  # Second attempt
  yarn db:sync:prod
fi

cd ..

echo "Starting server..."
yarn start

