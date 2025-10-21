#!/bin/bash

# ShellPoint Production Deployment Script
# Usage: ./deploy.sh [staging|production] [version]
# Example: ./deploy.sh production v1.2.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"
BACKUP_DIR="/opt/shellpoint/backups"
LOG_DIR="/opt/shellpoint/logs"
DATA_DIR="/opt/shellpoint/data"

# Default values
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
REGISTRY="docker.io"
IMAGE_NAME="cognitiolabs/shellpoint"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if .env.production exists
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
        log "Please create $ENV_FILE from .env.production.example"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Pull and verify image
pull_and_verify() {
    log "Pulling Docker image: $IMAGE_NAME:$VERSION"
    
    # Pull the image
    docker pull "$REGISTRY/$IMAGE_NAME:$VERSION"
    
    # Verify image was pulled
    if ! docker image inspect "$REGISTRY/$IMAGE_NAME:$VERSION" &> /dev/null; then
        error "Failed to pull image $REGISTRY/$IMAGE_NAME:$VERSION"
        exit 1
    fi
    
    success "Image pulled successfully"
}

# Create backup
create_backup() {
    local backup_name="shellpoint-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    log "Creating backup: $backup_name"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker volume inspect shellpoint-data &> /dev/null; then
        docker run --rm \
            -v shellpoint-data:/source:ro \
            -v "$BACKUP_DIR":/backup \
            alpine:latest \
            tar czf "/backup/$backup_name-data.tar.gz" -C /source .
    fi
    
    success "Backup created: $backup_path"
}

# Health check
health_check() {
    local max_attempts=30
    local attempt=1
    
    log "Performing health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:8080/health &> /dev/null; then
            success "Health check passed (attempt $attempt)"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Deploy application
deploy() {
    log "Deploying to $ENVIRONMENT with version $VERSION"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        warning "Deploying to PRODUCTION environment"
        read -p "Type 'confirm' to proceed: " confirm
        if [ "$confirm" != "confirm" ]; then
            error "Deployment cancelled"
            exit 1
        fi
    fi
    
    # Stop running containers
    log "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Pull new image
    pull_and_verify
    
    # Create backup (only for production)
    if [ "$ENVIRONMENT" = "production" ]; then
        create_backup
    fi
    
    # Start new containers
    log "Starting new containers..."
    IMAGE_TAG="$VERSION" docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for startup
    log "Waiting for application to start..."
    sleep 30
    
    # Health check
    if health_check; then
        success "Deployment completed successfully!"
        
        # Show status
        log "Container status:"
        docker-compose -f "$COMPOSE_FILE" ps
        
        # Show logs
        log "Recent application logs:"
        docker-compose -f "$COMPOSE_FILE" logs --tail=20 shellpoint
    else
        error "Deployment failed - initiating rollback..."
        rollback
        exit 1
    fi
}

# Rollback on failure
rollback() {
    log "Rolling back to previous version..."
    
    # Get previous container version (simplified)
    local prev_version=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep "$IMAGE_NAME" | head -2 | tail -1)
    
    if [ -n "$prev_version" ]; then
        log "Rolling back to $prev_version"
        IMAGE_TAG="$prev_version" docker-compose -f "$COMPOSE_FILE" up -d
        
        if health_check; then
            success "Rollback completed"
        else
            error "Rollback failed"
        fi
    else
        error "No previous version found for rollback"
    fi
}

# Cleanup old images
cleanup() {
    log "Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove old versions (keep last 3)
    docker images --format "table {{.Repository}}:{{.Tag}}" | \
        grep "$IMAGE_NAME" | \
        tail -n +4 | \
        head -n -3 | \
        xargs -r docker rmi
    
    success "Cleanup completed"
}

# Main script
main() {
    log "=== ShellPoint Deployment Script ==="
    log "Environment: $ENVIRONMENT"
    log "Version: $VERSION"
    log "Timestamp: $(date)"
    
    # Check permissions (only root or docker group)
    if [ "$EUID" -ne 0 ] && ! groups $USER | grep -q "docker"; then
        error "This script requires root privileges or docker group membership"
        exit 1
    fi
    
    # Run deployment
    check_prerequisites
    deploy
    cleanup
    
    success "Deployment process completed!"
    log "Application URL: http://localhost:8080"
    log "Health check: http://localhost:8080/health"
}

# Handle script interruption
trap 'error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"
