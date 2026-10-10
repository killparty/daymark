# syntax=docker/dockerfile:1

# ---- Build the web app -------------------------------------------------------
FROM oven/bun:1.4-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# ---- Production dependencies only --------------------------------------------
FROM oven/bun:1.4-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---- Runtime -----------------------------------------------------------------
FROM oven/bun:1.4-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATA_DIR=/data \
    STATIC_DIR=/app/dist/web

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist/web ./dist/web
COPY package.json ./
COPY drizzle ./drizzle
COPY src/server ./src/server
COPY src/shared ./src/shared

RUN mkdir -p /data && chown bun:bun /data
USER bun
VOLUME /data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["bun", "src/server/index.ts"]
