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

  # Caso específico: migración 20260119000000_add_shop_system quedó en estado \"failed\"
  # pero partes del SQL ya se aplicaron (el tipo ShopItemType ya existe).
  # En este caso NO queremos reintentar esa migración (siempre fallará),
  # sino marcarla como aplicada y dejar que la migración v2 (idempotente) repare el esquema.

  # Marcar la migración problemática como aplicada en el historial de Prisma
  yarn prisma migrate resolve --applied 20260119000000_add_shop_system || true

  # Segundo intento: ahora Prisma ya no volverá a ejecutar 20260119000000,
  # y podrá aplicar la migración v2 (20260120000000_add_shop_system_v2).
  yarn db:sync:prod
fi

cd ..

echo "Starting server..."
yarn start

