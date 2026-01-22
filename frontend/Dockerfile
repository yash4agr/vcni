# Frontend Dockerfile
# This is a Wix-based Astro project - uses Node adapter for Docker

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Wix (kept for compatibility)
ARG WIX_CLIENT_ID
ARG WIX_CLIENT_INSTANCE_ID=local-dev
ARG WIX_CLIENT_PUBLIC_KEY=local-dev
ARG WIX_CLIENT_SECRET=local-dev

# Set environment variables for build
ENV WIX_CLIENT_ID=$WIX_CLIENT_ID
ENV WIX_CLIENT_INSTANCE_ID=$WIX_CLIENT_INSTANCE_ID
ENV WIX_CLIENT_PUBLIC_KEY=$WIX_CLIENT_PUBLIC_KEY
ENV WIX_CLIENT_SECRET=$WIX_CLIENT_SECRET
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies + Node adapter
RUN npm ci && npm install @astrojs/node

# Copy source code
COPY . .

# Use Docker-specific config (with Node adapter)
COPY astro.config.docker.mjs astro.config.mjs

# Build the application with standard Astro (not wix build)
RUN npx astro build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 4321

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

# Run the application
CMD ["node", "./dist/server/entry.mjs"]
