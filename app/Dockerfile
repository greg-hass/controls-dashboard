# Control D Home - Dockerfile
# Multi-stage build for production

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build production bundle
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

LABEL org.opencontainers.image.source="https://github.com/greg-hass/controls-dashboard"
LABEL org.opencontainers.image.description="Self-hosted Control D dashboard"

# Copy built files to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
