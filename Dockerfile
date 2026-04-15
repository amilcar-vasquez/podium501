# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

# Native deps needed for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

ENV NODE_ENV=production
ENV DATABASE_URL=/data/sqlite.db

COPY . .
# Ensure svelte.config.js is set to adapter-node before building
RUN npm run build
RUN npm prune --omit=dev

# ── Stage 2: production ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim

WORKDIR /app

# 1. Create a directory for the SQLite database and set permissions
# Azure will mount the persistent volume here.
RUN mkdir -p /data && chown -R node:node /data

COPY --from=builder /app/build        ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 2. Set the environment variable so your app knows where to find the DB
ENV DATABASE_URL=/data/podium501.db
ENV PORT=3000

# 3. Run as non-root for better security
USER node

EXPOSE 3000

CMD ["node", "build/index.js"]