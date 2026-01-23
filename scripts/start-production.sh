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

  # Casos específicos: migraciones que quedaron en estado "failed" pero partes del SQL ya se aplicaron.
  # En estos casos NO queremos reintentar esas migraciones (siempre fallarán),
  # sino marcarlas como aplicadas y dejar que las migraciones v2 (idempotentes) reparen el esquema.

  # Migración 20260119000000_add_shop_system: el tipo ShopItemType ya existe
  yarn prisma migrate resolve --applied 20260119000000_add_shop_system || true

  # Migración 20260116000000_add_bonus_fights_to_brute: las columnas bonusFightsCount y bonusFightsDate ya existen
  yarn prisma migrate resolve --applied 20260116000000_add_bonus_fights_to_brute || true

  # Segundo intento: ahora Prisma ya no volverá a ejecutar las migraciones problemáticas,
  # y podrá aplicar las migraciones v2 (idempotentes) que reparan el esquema.
  yarn db:sync:prod
fi

cd ..

echo "Starting server..."
yarn start

