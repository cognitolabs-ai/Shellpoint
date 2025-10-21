# ShellPoint - Professional SSH Client
# Production-ready multi-stage Docker build
# CognitioLabs (https://cognitiolabs.eu)

FROM node:20-alpine AS base

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ gcc musl-dev linux-headers

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and clean cache in single layer
RUN npm ci --only=production && \
    npm cache clean --force

# Production stage - minimal runtime image
FROM node:20-alpine AS production

# Install only essential runtime dependencies
RUN apk add --no-cache \
    tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from base stage
COPY --from=base /app/node_modules ./node_modules

# Copy application files with correct ownership
COPY --chown=nodejs:nodejs server.js package*.json ./
COPY --chown=nodejs:nodejs public/ ./public/

# Create necessary directories with proper permissions
RUN mkdir -p /app/data/logs && \
    chown -R nodejs:nodejs /app/data

# Security: Remove unnecessary npm packages and reduce attack surface
RUN npm cache clean --force && \
    rm -rf /tmp/* /var/tmp/* /root/.npm

# Use non-root user for security
USER nodejs

# Expose port
EXPOSE 8080

# Production environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    DB_PATH=/app/data/ssh-client.db \
    LOG_LEVEL=info \
    MAX_CONNECTIONS=100

# Improved health check with endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Use tini for proper signal handling and zombie process cleanup
ENTRYPOINT ["/sbin/tini", "--"]

# Start application with graceful shutdown capability
CMD ["node", "--abort-on-uncaught-exception", "server.js"]
