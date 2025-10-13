# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in ShellPoint, please report it by emailing:

**security@cognitiolabs.eu**

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond to security reports within **48 hours** and will keep you informed throughout the resolution process.

---

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Security Features

### Current Implementation

ShellPoint implements the following security measures:

#### Authentication & Authorization
- ✅ **JWT-based authentication** with 7-day token expiration
- ✅ **bcrypt password hashing** with 10 salt rounds
- ✅ **httpOnly cookies** to prevent XSS attacks
- ✅ **sameSite: 'strict'** to prevent CSRF attacks
- ✅ **Password strength validation** (minimum 8 characters, letter + number required)

#### Input Validation
- ✅ **Port range validation** (1-65535)
- ✅ **Host format validation** (alphanumeric, dots, dashes)
- ✅ **SQL injection prevention** via prepared statements
- ✅ **Input sanitization** on all user-provided data

#### Secure Communication
- ✅ **SSH2 library** for secure SSH protocol implementation
- ✅ **WebSocket authentication** via JWT cookie validation
- ✅ **Secure cookie flags** in production mode

#### Infrastructure Security
- ✅ **Docker non-root user** (nodejs:nodejs)
- ✅ **Minimal Alpine base image** (reduced attack surface)
- ✅ **Health checks** for container monitoring
- ✅ **Graceful shutdown handling** (SIGTERM, SIGINT)

---

## Known Security Limitations

### Critical (Requires Attention for Production)

⚠️ **1. Plain Text Credential Storage**
- **Issue**: SSH keys, passwords, and passphrases are stored in plain text in SQLite database
- **Risk**: Database compromise = complete credential theft
- **Mitigation**:
  - Encrypt database at rest using filesystem-level encryption
  - Implement application-level encryption before v2.0
- **Impact**: HIGH
- **Status**: Documented, planned for v2.0

⚠️ **2. No Rate Limiting**
- **Issue**: No rate limiting on authentication endpoints
- **Risk**: Brute force attacks on login/registration
- **Mitigation**:
  - Implement reverse proxy rate limiting (see [DEPLOYMENT.md](DEPLOYMENT.md))
  - Use fail2ban for IP blocking
  - Planned application-level rate limiting in v2.0
- **Impact**: MEDIUM
- **Status**: Documented, workaround available

⚠️ **3. HTTP in Development Mode**
- **Issue**: Development mode allows HTTP connections
- **Risk**: JWT tokens and credentials transmitted in plain text
- **Mitigation**:
  - **Always use HTTPS in production**
  - Reverse proxy with valid SSL certificate required
- **Impact**: HIGH (only if used in production without HTTPS)
- **Status**: Documented in README

### Medium Priority

⚠️ **4. No Session Timeout/Refresh**
- **Issue**: JWT tokens valid for 7 days without refresh mechanism
- **Risk**: Stolen token remains valid until expiration
- **Mitigation**:
  - Keep JWT_SECRET secure
  - Rotate JWT_SECRET if compromise suspected
  - Planned refresh token implementation in v2.0
- **Impact**: MEDIUM
- **Status**: Accepted risk for v1.0

⚠️ **5. No 2FA/MFA Support**
- **Issue**: Only username/password authentication
- **Risk**: Single factor compromise = full access
- **Mitigation**:
  - Use strong passwords
  - Planned 2FA support in future release
- **Impact**: MEDIUM
- **Status**: Planned feature

⚠️ **6. No Audit Logging**
- **Issue**: No audit trail for user actions
- **Risk**: Difficult to investigate security incidents
- **Mitigation**:
  - Application logs provide basic information
  - Planned audit logging in v2.0
- **Impact**: LOW
- **Status**: Planned feature

### Low Priority

⚠️ **7. SQLite Single Writer**
- **Issue**: SQLite doesn't support concurrent writes well
- **Risk**: Database locking under high load
- **Mitigation**:
  - Use PostgreSQL for production multi-instance deployments
  - Not a security issue, but affects availability
- **Impact**: LOW
- **Status**: Documented

---

## Security Best Practices for Deployment

### Production Deployment Checklist

#### Required

- [ ] **HTTPS Enabled**: Use valid SSL/TLS certificate (Let's Encrypt recommended)
- [ ] **Strong JWT_SECRET**: Generate using cryptographically secure random (64+ bytes)
- [ ] **Environment Variables**: Never commit `.env` file to version control
- [ ] **Firewall Rules**: Restrict access to application port (8080) from reverse proxy only
- [ ] **Regular Updates**: Keep Node.js, npm, and dependencies up to date
- [ ] **Database Backup**: Implement automated backup strategy

#### Recommended

- [ ] **Rate Limiting**: Configure at reverse proxy level (Nginx, Traefik, Caddy)
- [ ] **Fail2Ban**: Install and configure for SSH and application endpoints
- [ ] **Security Headers**: Configure CSP, HSTS, X-Frame-Options via reverse proxy
- [ ] **Monitoring**: Set up alerting for suspicious activity
- [ ] **Log Rotation**: Implement log rotation to prevent disk exhaustion
- [ ] **Least Privilege**: Run application as non-root user

#### Optional (Enhanced Security)

- [ ] **Database Encryption**: Encrypt SQLite database at filesystem level
- [ ] **VPN/Bastion**: Place ShellPoint behind VPN or bastion host
- [ ] **IP Whitelist**: Restrict access to known IP ranges
- [ ] **WAF**: Use Web Application Firewall (Cloudflare, AWS WAF)
- [ ] **Security Scanning**: Regular vulnerability scanning (Trivy, Snyk)
- [ ] **Penetration Testing**: Periodic security audits

---

## Security Configuration Examples

### Generate Secure JWT Secret

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL
openssl rand -hex 64

# Python
python3 -c "import secrets; print(secrets.token_hex(64))"
```

### Nginx Rate Limiting

```nginx
# In http block
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

# In location block for auth endpoints
location ~ ^/api/auth/(login|register) {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://localhost:8080;
}

# In location block for other API endpoints
location ~ ^/api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:8080;
}
```

### Security Headers (Nginx)

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### Fail2Ban Configuration

**/etc/fail2ban/filter.d/shellpoint.conf:**
```ini
[Definition]
failregex = ^.*"POST /api/auth/(login|register) .* 401
            ^.*"POST /api/auth/(login|register) .* 400
ignoreregex =
```

**/etc/fail2ban/jail.d/shellpoint.conf:**
```ini
[shellpoint-auth]
enabled = true
port = http,https
filter = shellpoint
logpath = /var/log/nginx/access.log
maxretry = 5
findtime = 600
bantime = 3600
action = iptables-multiport[name=shellpoint, port="http,https"]
```

### Docker Security Hardening

```dockerfile
# Use specific version (not latest)
FROM node:20.10.0-alpine3.18

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set read-only filesystem (where possible)
RUN chmod -R 755 /app

# Drop capabilities
USER nodejs

# Use health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

---

## Vulnerability Disclosure Timeline

When a security vulnerability is reported:

1. **T+0 hours**: Report received, acknowledged within 48 hours
2. **T+1 week**: Initial assessment and severity classification
3. **T+2 weeks**: Fix developed and tested
4. **T+3 weeks**: Security patch released
5. **T+4 weeks**: Public disclosure (coordinated with reporter)

Critical vulnerabilities may be expedited with hotfix releases.

---

## Security Incident Response

In the event of a security incident:

1. **Containment**: Immediately rotate JWT_SECRET if tokens compromised
2. **Investigation**: Review logs for unauthorized access
3. **Notification**: Inform affected users within 72 hours
4. **Remediation**: Deploy security patch
5. **Post-Mortem**: Document incident and improve security measures

---

## Security Roadmap

### Version 2.0 (Planned)

- [ ] Database encryption for credentials (AES-256-GCM)
- [ ] Application-level rate limiting
- [ ] Two-factor authentication (TOTP)
- [ ] Audit logging
- [ ] Session timeout and refresh tokens
- [ ] Security event monitoring
- [ ] Automated security scanning in CI/CD

### Version 3.0 (Future)

- [ ] OAuth/SAML authentication
- [ ] Role-based access control (RBAC)
- [ ] IP whitelisting
- [ ] Connection approval workflows
- [ ] Encrypted backup support

---

## Security Testing

### Automated Testing

```bash
# Dependency vulnerability scanning
npm audit

# Docker image scanning
docker scan ghcr.io/cognitiolabs/shellpoint:latest

# Trivy scanning
trivy image ghcr.io/cognitiolabs/shellpoint:latest
```

### Manual Testing

Security researchers are welcome to test ShellPoint responsibly. Please:

- ✅ Test against your own instance
- ✅ Do not test production instances without permission
- ✅ Report findings responsibly via security@cognitiolabs.eu
- ✅ Allow reasonable time for fixes before public disclosure

**Out of Scope:**
- Social engineering attacks
- Physical security
- Denial of Service (DoS) attacks
- Spam/brute force (use rate-limited test instances)

---

## Compliance and Standards

ShellPoint aims to follow:

- **OWASP Top 10**: Address common web application vulnerabilities
- **CWE/SANS Top 25**: Mitigate most dangerous software weaknesses
- **NIST Cybersecurity Framework**: Implement security best practices

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [SSH Security Best Practices](https://www.ssh.com/academy/ssh/security)

---

## Acknowledgments

We thank the following security researchers for responsibly disclosing vulnerabilities:

- *None yet - help us improve ShellPoint's security!*

---

## Contact

- **Security Issues**: security@cognitiolabs.eu
- **General Support**: info@cognitiolabs.eu
- **Website**: https://cognitiolabs.eu
- **GitHub**: https://github.com/cognitiolabs/shellpoint

---

*Last Updated: 2025-10-13*
