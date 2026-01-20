FROM node:20-bookworm-slim AS build

WORKDIR /app

# Build stage env: producción y sin scripts de postinstall (db:sync, seed, etc.)
ENV NODE_ENV=production YARN_ENABLE_SCRIPTS=false

# Prisma engines may require openssl to be present for libssl detection
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Enable Yarn via Corepack
RUN corepack enable

# Copy manifests first for better caching
COPY package.json yarn.lock ./
COPY .yarnrc.yml ./
COPY .yarn/ .yarn/
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY core/package.json ./core/
COPY prisma/package.reference.json ./prisma/

# Prepare prisma workspace package.json and temporarily remove postinstall script
# Yarn 4 still tries to execute workspace scripts even with YARN_ENABLE_SCRIPTS=false
RUN cp prisma/package.reference.json prisma/package.json && \
    node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('package.json')); delete pkg.scripts.postinstall; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));" && \
    yarn install --immutable && \
    node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('package.json')); pkg.scripts.postinstall='bash ./scripts/postInstall.sh'; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));"

# Copy the rest of the repo
COPY . .

# Build backend + shared libs, then frontend
RUN yarn compile
RUN yarn build:client

# Runtime image
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Prisma engines may require openssl to be present for libssl detection
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy everything we need to run (includes node_modules, build artifacts, server/lib, client/build, prisma client)
COPY --from=build /app /app

CMD ["bash", "scripts/start-production.sh"]

