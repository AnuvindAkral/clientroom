# ---- build ----
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Native module (better-sqlite3) needs a toolchain when no prebuilt binary
# matches the platform.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.server.json vite.config.ts ./
COPY src ./src
COPY web ./web

RUN npm run build \
 && npm prune --omit=dev

# ---- runtime ----
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/package.json ./package.json

# Railway mounts the volume at /data. The directory is created here so a local
# run without a mount still works.
RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "dist/index.js"]
