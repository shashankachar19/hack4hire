# ==============================================================================
# DispatchGrid — Production Container
# Multi-stage Docker build for deterministic zero-LLM scheduling engine & UI
# ==============================================================================

# Stage 1: Build Frontend SPA
FROM node:20-alpine AS client-builder
WORKDIR /app/client

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install client dependencies
COPY client/package.json client/pnpm-lock.yaml* ./
RUN pnpm install

# Copy source and build static bundle
COPY client/ ./
RUN pnpm build

# Stage 2: Production Runtime
FROM node:20-alpine AS production
WORKDIR /app

# Install openssl for Prisma SQLite engine
RUN apk add --no-cache openssl libc6-compat

# Install server dependencies
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install

# Copy Prisma schema and generate client
COPY server/prisma ./prisma
RUN npx prisma generate

# Copy server application code
COPY server/src ./src
COPY server/tsconfig.json ./
COPY server/jest.config.js ./

# Copy compiled frontend from Stage 1 into server client-dist
COPY --from=client-builder /app/client/dist /app/client-dist

# Configure runtime environment
ENV NODE_ENV=production
ENV PORT=3001
ENV CLIENT_DIST=/app/client-dist
ENV DATABASE_URL="file:/app/server/prisma/dispatchgrid.db"

EXPOSE 3001

# Entrypoint script ensures DB push and pristine seed on initial start
RUN printf '#!/bin/sh\nset -e\necho "==> Syncing SQLite database schema with Prisma..."\nnpx prisma db push --skip-generate\necho "==> Seeding pristine workforce & job dataset..."\nnpx tsx src/seed.ts\necho "==> DispatchGrid engine online on port 3001!"\nexec npx tsx src/index.ts\n' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

