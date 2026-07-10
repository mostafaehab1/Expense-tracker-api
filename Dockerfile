# ---- Build stage: compile TypeScript to JS ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (incl. dev) so we can run tsc.
COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage: ship only what we need to run ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies in the final image.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output from the build stage.
COPY --from=builder /app/dist ./dist

# Run as the built-in non-root `node` user.
USER node

EXPOSE 4000

# Simple liveness check against the /health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
