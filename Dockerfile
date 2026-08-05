# syntax=docker/dockerfile:1

# ---- Build stage: install all deps and compile TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies against the lockfile for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci

# Compile src -> dist.
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Production deps stage: prune to runtime-only dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Runtime stage: minimal image with compiled output ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Bind to all interfaces so the container is reachable; override PORT/HOST as needed.
ENV HOST=0.0.0.0 \
    PORT=3333

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Run as the built-in non-root node user.
USER node

EXPOSE 3333

# MCP_SERVICE_TOKEN must be supplied at runtime (e.g. -e or --env-file), never baked in.
CMD ["node", "dist/index.js"]
