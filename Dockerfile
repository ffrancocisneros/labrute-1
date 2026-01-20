FROM node:20-bookworm-slim AS build

WORKDIR /app

# Enable Yarn via Corepack
RUN corepack enable

# Copy manifests first for better caching
COPY package.json yarn.lock ./
COPY .yarnrc.yml ./
COPY .yarn/ .yarn/
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY core/package.json ./core/
COPY prisma/package.json ./prisma/

# Install monorepo dependencies
RUN yarn install --immutable

# Copy the rest of the repo
COPY . .

# Build backend + shared libs, then frontend
RUN yarn compile
RUN yarn build:client

# Runtime image
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Copy everything we need to run (includes node_modules, build artifacts, server/lib, client/build, prisma client)
COPY --from=build /app /app

CMD ["bash", "scripts/start-production.sh"]

