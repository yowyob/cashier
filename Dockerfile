# Frontend caisse (Next.js 16 + Prisma/SQLite). Build multi-stage.
FROM node:22-bookworm AS build
WORKDIR /app

# Dépendances (better-sqlite3 = module natif → outils de build présents dans l'image)
COPY package.json package-lock.json ./
RUN npm ci

# Code + génération Prisma + build Next
COPY . .
# Valeurs factices requises au build (Prisma generate + prerender Next lisent ces env).
# Les vraies valeurs sont injectées au runtime.
RUN DATABASE_URL=file:/tmp/build.db \
    AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    npx prisma generate && \
    DATABASE_URL=file:/tmp/build.db \
    AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Données locales SQLite persistées via volume
ENV DATABASE_URL=file:/app/data/dev.db

# Prisma a besoin d'OpenSSL au runtime. L'installation explicite évite sa
# détection de secours vers une ABI incompatible.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app ./

# Au démarrage : applique les migrations Prisma puis lance Next
RUN printf '#!/bin/sh\nset -e\nmkdir -p /app/data\nnpx prisma migrate deploy\nexec npm run start -- -p 3000 -H 0.0.0.0\n' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
