# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

ENV NODE_ENV=production

COPY . .
# Ensure svelte.config.js is set to adapter-node before building
RUN npm run build
RUN npm prune --omit=dev

# ── Stage 2: production ────────────────────────────────────────────────────────
FROM node:22-bookworm-slim

WORKDIR /app

COPY --from=builder /app/build        ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV PORT=3000

# Run as non-root for better security
USER node

EXPOSE 3000

CMD ["node", "build/index.js"]