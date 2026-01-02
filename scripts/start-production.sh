#!/usr/bin/env bash
# Production start script for Railway
# Runs migrations/seed, then starts the server

set -e

echo "Running database migrations and seed..."
cd server
yarn db:sync:prod
cd ..

echo "Starting server..."
yarn start

