# ── Stage 1: install dependencies ──────────────────────────────────────────
FROM node:20.14.0-alpine3.20 AS deps
WORKDIR /app

ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_factor=2 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000

COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile --no-audit --no-fund

# ── Stage 2: build the Next.js application ──────────────────────────────────
FROM node:20.14.0-alpine3.20 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Enable standalone output for a minimal runtime image
ENV NEXT_OUTPUT=standalone

RUN npm run build

# ── Stage 3: production runtime (minimal image) ─────────────────────────────
FROM node:20.14.0-alpine3.20 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as non-root for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the standalone server + static assets produced by the build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p /app/public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

