#!/usr/bin/env bash

set -eux

# Detectar si estamos en CI/Docker build
# CI=true se establece automáticamente en GitHub Actions
# YARN_ENABLE_SCRIPTS=false lo establecemos en Dockerfile
# Si estamos en Docker build, NO ejecutar nada (el build se hace manualmente en Dockerfile)
if [ "${CI:-false}" = "true" ] || [ "${YARN_ENABLE_SCRIPTS:-true}" = "false" ]; then
  echo "Skipping postinstall script in CI/Docker build environment"
  exit 0
fi

if [ "${NODE_ENV:-dev}" = "production" ]; then
  # Compile Typescript
  yarn run compile

  # Build client
  yarn run build:client
else
  # Generate schema types + Sync DB
  yarn run db:sync:dev

  # Compile Typescript
  yarn run compile

  # Seed DB
  yarn run db:seed
fi
