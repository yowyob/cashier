# Frontend caisse (Next.js 16 + Prisma/SQLite). Build multi-stage.
FROM node:22-bookworm AS build
WORKDIR /app

# Dépendances (better-sqlite3 = module natif → outils de build présents dans l'image)
COPY package.json package-lock.json ./
RUN npm ci

# Code + génération Prisma + build Next
COPY . .
# DATABASE_URL factice requis par Prisma 7 au build (generate/build n'ouvrent pas la vraie DB).
ENV DATABASE_URL=file:/tmp/build.db
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Données locales SQLite persistées via volume
ENV DATABASE_URL=file:/app/data/dev.db

COPY --from=build /app ./

# Au démarrage : applique les migrations Prisma puis lance Next
RUN printf '#!/bin/sh\nset -e\nmkdir -p /app/data\nnpx prisma migrate deploy\nexec npm run start -- -p 3000 -H 0.0.0.0\n' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
