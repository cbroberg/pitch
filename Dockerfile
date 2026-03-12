FROM node:20-slim AS base

# deps stage: compile native modules for linux/amd64
FROM base AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci

# builder stage: compile Next.js app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# runner stage: minimal production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Install Chromium + fonts for thumbnail generation
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Explicitly copy better-sqlite3 native module compiled for linux/amd64.
# Next.js standalone does not reliably carry .node binaries — copy directly
# from the deps stage to guarantee the correct platform binary is used.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# sharp (native image processing for thumbnails)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

# playwright-core (browser automation API — uses system chromium)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/playwright-core ./node_modules/playwright-core

RUN mkdir -p data && chown nextjs:nodejs data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
