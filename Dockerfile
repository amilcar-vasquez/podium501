# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

# Native deps needed for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Remove devDependencies to keep the final image lean
RUN npm prune --omit=dev

# ── Stage 2: production ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim

WORKDIR /app

COPY --from=builder /app/build        ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "build/index.js"]
