# ShellPoint - Deployment Guide

This guide covers various deployment scenarios for ShellPoint, from local development to production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Reverse Proxy Configuration](#reverse-proxy-configuration)
- [Environment Variables](#environment-variables)
- [Backup and Restore](#backup-and-restore)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Local Development

**Prerequisites:**
- Node.js >= 20.x
- npm >= 9.x

**Steps:**

```bash
# 1. Clone repository
git clone https://github.com/cognitiolabs/shellpoint.git
cd shellpoint

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" > .jwt_secret
# Copy the output and set it as JWT_SECRET in .env

# 5. Start in development mode (with auto-reload)
npm run dev
```

Visit: http://localhost:8080

---

## Docker Deployment

### Using Docker Compose (Recommended)

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  shellpoint:
    image: ghcr.io/cognitiolabs/shellpoint:latest
    container_name: shellpoint
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
      - PORT=8080
    volumes:
      - shellpoint-data:/app/data
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  shellpoint-data:
```

**Deployment:**

```bash
# 1. Create .env file with JWT_SECRET
echo "JWT_SECRET=$(openssl rand -hex 64)" > .env

# 2. Start container
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Stop container
docker-compose down

# 5. Stop and remove data
docker-compose down -v
```

### Using Docker CLI

```bash
# 1. Generate JWT secret
export JWT_SECRET=$(openssl rand -hex 64)

# 2. Run container
docker run -d \
  --name shellpoint \
  -p 8080:8080 \
  -e JWT_SECRET="${JWT_SECRET}" \
  -e NODE_ENV=production \
  -v shellpoint-data:/app/data \
  --restart unless-stopped \
  ghcr.io/cognitiolabs/shellpoint:latest

# 3. View logs
docker logs -f shellpoint

# 4. Stop container
docker stop shellpoint

# 5. Remove container
docker rm shellpoint

# 6. Remove data volume
docker volume rm shellpoint-data
```

### Building Custom Image

```bash
# Clone repository
git clone https://github.com/cognitiolabs/shellpoint.git
cd shellpoint

# Build image
docker build -t shellpoint:custom .

# Run custom image
docker run -d \
  --name shellpoint \
  -p 8080:8080 \
  -e JWT_SECRET="your-secret-here" \
  -v shellpoint-data:/app/data \
  shellpoint:custom
```

---

## Production Deployment

### Prerequisites

✅ **Required:**
- HTTPS/TLS certificate (Let's Encrypt recommended)
- Reverse proxy (Nginx, Traefik, Caddy)
- Firewall configuration
- Strong JWT_SECRET (64 bytes, cryptographically random)

⚠️ **Recommended:**
- Rate limiting on auth endpoints
- Automated backups
- Monitoring and alerting
- Log aggregation
- Fail2ban or similar for brute force protection

### Production Checklist

```bash
# ✅ Environment
export NODE_ENV=production
export JWT_SECRET="$(openssl rand -hex 64)"

# ✅ Security
# - Enable HTTPS (reverse proxy)
# - Set secure cookies (automatic in production)
# - Configure firewall (allow 443, 8080 from reverse proxy only)
# - Set up fail2ban

# ✅ Monitoring
# - Configure health checks
# - Set up log rotation
# - Enable error alerting

# ✅ Backups
# - Schedule database backups
# - Test restore procedures
```

### Systemd Service (Linux)

Create `/etc/systemd/system/shellpoint.service`:

```ini
[Unit]
Description=ShellPoint SSH Client
After=network.target

[Service]
Type=simple
User=shellpoint
WorkingDirectory=/opt/shellpoint
Environment="NODE_ENV=production"
Environment="JWT_SECRET=your-secret-here"
Environment="PORT=8080"
ExecStart=/usr/bin/node /opt/shellpoint/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=shellpoint

[Install]
WantedBy=multi-user.target
```

**Usage:**

```bash
# Create user
sudo useradd -r -s /bin/false shellpoint

# Install application
sudo mkdir -p /opt/shellpoint
sudo chown shellpoint:shellpoint /opt/shellpoint
cd /opt/shellpoint
git clone https://github.com/cognitiolabs/shellpoint.git .
npm ci --production

# Create environment file
sudo nano /opt/shellpoint/.env

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable shellpoint
sudo systemctl start shellpoint

# View logs
sudo journalctl -u shellpoint -f

# Restart service
sudo systemctl restart shellpoint
```

---

## Cloud Deployment

### AWS (Elastic Beanstalk)

**Dockerfile:**
```dockerfile
FROM ghcr.io/cognitiolabs/shellpoint:latest
```

**Dockerrun.aws.json:**
```json
{
  "AWSEBDockerrunVersion": "1",
  "Ports": [
    {
      "ContainerPort": 8080
    }
  ]
}
```

**Deploy:**
```bash
eb init -p docker shellpoint
eb create shellpoint-env
eb deploy
```

### Google Cloud Platform (Cloud Run)

```bash
# Deploy to Cloud Run
gcloud run deploy shellpoint \
  --image ghcr.io/cognitiolabs/shellpoint:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "JWT_SECRET=${JWT_SECRET}" \
  --set-env-vars "NODE_ENV=production"
```

### Azure (Container Instances)

```bash
# Create resource group
az group create --name shellpoint-rg --location eastus

# Deploy container
az container create \
  --resource-group shellpoint-rg \
  --name shellpoint \
  --image ghcr.io/cognitiolabs/shellpoint:latest \
  --dns-name-label shellpoint-app \
  --ports 8080 \
  --environment-variables \
    'JWT_SECRET'='your-secret-here' \
    'NODE_ENV'='production'
```

### DigitalOcean (App Platform)

**app.yaml:**
```yaml
name: shellpoint
services:
  - name: web
    image:
      registry_type: GHCR
      registry: ghcr.io
      repository: cognitiolabs/shellpoint
      tag: latest
    envs:
      - key: JWT_SECRET
        value: ${JWT_SECRET}
      - key: NODE_ENV
        value: production
    http_port: 8080
    instance_count: 1
    instance_size_slug: basic-xxs
```

```bash
doctl apps create --spec app.yaml
```

### Kubernetes

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shellpoint
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shellpoint
  template:
    metadata:
      labels:
        app: shellpoint
    spec:
      containers:
      - name: shellpoint
        image: ghcr.io/cognitiolabs/shellpoint:latest
        ports:
        - containerPort: 8080
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: shellpoint-secrets
              key: jwt-secret
        - name: NODE_ENV
          value: "production"
        volumeMounts:
        - name: data
          mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: shellpoint-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: shellpoint
spec:
  selector:
    app: shellpoint
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

**Create secret:**
```bash
kubectl create secret generic shellpoint-secrets \
  --from-literal=jwt-secret=$(openssl rand -hex 64)
```

**Deploy:**
```bash
kubectl apply -f deployment.yaml
```

---

## Reverse Proxy Configuration

### Nginx

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name shellpoint.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS + WebSocket
server {
    listen 443 ssl http2;
    server_name shellpoint.example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/shellpoint.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shellpoint.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # WebSocket support
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Rate limiting for auth endpoints
    location ~ ^/api/auth/(login|register) {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Rate limit zone (add to http block)
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
```

### Caddy

```caddyfile
shellpoint.example.com {
    reverse_proxy localhost:8080 {
        # WebSocket support is automatic
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
    }

    # TLS
    tls {
        protocols tls1.2 tls1.3
    }
}
```

### Traefik

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - --providers.docker=true
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.email=admin@example.com
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - traefik-letsencrypt:/letsencrypt

  shellpoint:
    image: ghcr.io/cognitiolabs/shellpoint:latest
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    volumes:
      - shellpoint-data:/app/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.shellpoint.rule=Host(`shellpoint.example.com`)"
      - "traefik.http.routers.shellpoint.entrypoints=websecure"
      - "traefik.http.routers.shellpoint.tls.certresolver=letsencrypt"

volumes:
  traefik-letsencrypt:
  shellpoint-data:
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Cryptographically secure random key for JWT signing (64 bytes recommended) |
| `PORT` | No | `8080` | Port to listen on |
| `NODE_ENV` | No | `development` | Environment mode (`development` or `production`) |
| `DB_PATH` | No | `./ssh-client.db` | Path to SQLite database file |

**Generate JWT_SECRET:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL
openssl rand -hex 64

# Python
python3 -c "import secrets; print(secrets.token_hex(64))"
```

---

## Backup and Restore

### Database Backup

```bash
# Manual backup
cp ssh-client.db ssh-client.db.backup-$(date +%Y%m%d-%H%M%S)

# Docker volume backup
docker run --rm \
  -v shellpoint-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/shellpoint-backup-$(date +%Y%m%d).tar.gz /data

# Automated backup (cron)
0 2 * * * docker run --rm -v shellpoint-data:/data -v /backups:/backup alpine tar czf /backup/shellpoint-$(date +\%Y\%m\%d).tar.gz /data
```

### Restore from Backup

```bash
# Extract backup
tar xzf shellpoint-backup-20251010.tar.gz

# Docker volume restore
docker run --rm \
  -v shellpoint-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/shellpoint-backup-20251010.tar.gz --strip 1"
```

---

## Monitoring

### Health Check

```bash
# HTTP health check
curl -f http://localhost:8080 || exit 1

# With Docker
docker inspect --format='{{.State.Health.Status}}' shellpoint
```

### Logging

```bash
# Docker logs
docker logs -f shellpoint

# Systemd logs
journalctl -u shellpoint -f

# Export logs
docker logs shellpoint > shellpoint.log 2>&1
```

### Metrics to Monitor

- CPU usage (should be < 50% under normal load)
- Memory usage (~50MB base + 10-20MB per active session)
- Active SSH connections
- WebSocket connection count
- Database size growth
- Response times for API endpoints

---

## Troubleshooting

### Common Issues

**Problem: "JWT_SECRET is not defined"**
```bash
# Solution: Set environment variable
export JWT_SECRET=$(openssl rand -hex 64)
# Or add to .env file
```

**Problem: WebSocket connection fails**
```bash
# Check if reverse proxy supports WebSocket
# Nginx: Requires "Upgrade" and "Connection" headers
# Check browser console for WebSocket errors
```

**Problem: Database locked**
```bash
# Solution: SQLite doesn't support concurrent writes
# Ensure only one instance accesses the database
# Or migrate to PostgreSQL for multi-instance deployments
```

**Problem: SSH connection timeout**
```bash
# Check firewall rules
# Verify SSH port is accessible
# Test with: ssh user@host -p port
# Check server logs for errors
```

**Problem: Container won't start**
```bash
# Check logs
docker logs shellpoint

# Verify environment variables
docker inspect shellpoint | grep -A 10 "Env"

# Check volume permissions
docker run --rm -v shellpoint-data:/data alpine ls -la /data
```

### Debug Mode

```bash
# Enable verbose logging
export DEBUG=*
node server.js

# Docker with debug
docker run -e DEBUG=* shellpoint:latest
```

---

## Performance Tuning

### Node.js Tuning

```bash
# Increase memory limit (if needed)
node --max-old-space-size=4096 server.js

# Cluster mode (not recommended for WebSocket)
# Use a load balancer with sticky sessions instead
```

### Database Optimization

```sql
-- Create indexes (run once)
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_ssh_keys_user_id ON ssh_keys(user_id);

-- Vacuum database (maintenance)
VACUUM;
```

---

## Security Hardening

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

### Fail2Ban

**/etc/fail2ban/jail.d/shellpoint.conf:**
```ini
[shellpoint]
enabled = true
port = http,https
filter = shellpoint
logpath = /var/log/shellpoint/access.log
maxretry = 5
bantime = 3600
```

**/etc/fail2ban/filter.d/shellpoint.conf:**
```ini
[Definition]
failregex = ^<HOST> .* "POST /api/auth/(login|register) .* 401
ignoreregex =
```

---

## Next Steps

- [Security Policy](SECURITY.md)
- [API Documentation](API.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Contributing Guidelines](CONTRIBUTING.md)

---

*For support, visit [https://cognitiolabs.eu](https://cognitiolabs.eu) or open an issue on GitHub.*
