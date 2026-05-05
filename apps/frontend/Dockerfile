FROM node:22-bookworm-slim

# Build context = racine du repo (cf. compose.yml).
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/

RUN npm install --workspace=apps/frontend --include-workspace-root --no-audit --no-fund

# Note : le purge des NULL bytes WSL2/NTFS est fait par `make clean-null`
# cote hote avant le build (cf. Makefile racine).
COPY packages/shared/ ./packages/shared/
COPY apps/frontend/ ./apps/frontend/

# NEXT_PUBLIC_* doivent etre presents au moment du `next build` car Next.js
# les inline dans le bundle client. On les recoit en ARG (cf. compose.yml)
# et on les promote en ENV pour que le build les voie.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_DEFAULT_LOCALE
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_PUBLIC_DEFAULT_LOCALE=$NEXT_PUBLIC_DEFAULT_LOCALE

WORKDIR /app/apps/frontend
RUN npm run build

CMD ["npm", "run", "start"]
