FROM node:22-bookworm-slim

# Build context = racine du repo (cf. compose.yml). On reproduit la structure
# du monorepo pour que npm workspaces lie packages/shared en symlink.
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Layer cache : manifests d'abord (root + workspaces).
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

RUN npm install --workspace=apps/backend --include-workspace-root --no-audit --no-fund

# Code partage avant le code applicatif.
# Note : le purge des NULL bytes WSL2/NTFS est fait par `make clean-null`
# cote hote avant le build (cf. Makefile racine).
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

WORKDIR /app/apps/backend
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npm run build

CMD ["npm", "run", "start:prod"]
