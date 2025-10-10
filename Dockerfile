# ShellPoint - Professional SSH Client
# CognitioLabs (https://cognitiolabs.eu)

FROM node:20-alpine AS base

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    tini \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies from base stage
COPY --from=base /app/node_modules ./node_modules

# Copy application files
COPY --chown=nodejs:nodejs . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app/data

# Use non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    DB_PATH=/app/data/ssh-client.db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "server.js"]
