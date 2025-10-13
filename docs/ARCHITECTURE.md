# ShellPoint - Architecture Documentation

## Overview

ShellPoint is a web-based SSH client that enables users to connect to remote servers through their browser. The application uses a client-server architecture with real-time bidirectional communication via WebSocket for terminal streaming.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Frontend (HTML/CSS/JS + xterm.js)                    │  │
│  │  • User Interface                                     │  │
│  │  • Terminal Emulator (xterm.js)                       │  │
│  │  • Connection Management                              │  │
│  │  • State Management                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬────────┬─────────────────────────────┘
                       │ HTTP   │ WebSocket
                       │ REST   │ (Terminal I/O)
┌──────────────────────▼────────▼─────────────────────────────┐
│              Node.js Express Server                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  HTTP API Layer                                       │  │
│  │  • Authentication (JWT)                               │  │
│  │  • CRUD Operations (Connections, Keys, Profile)      │  │
│  │  • Input Validation                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  WebSocket Layer                                      │  │
│  │  • Real-time Terminal Streaming                       │  │
│  │  • SSH Session Management                             │  │
│  │  • Multiple Session Handling                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  SSH Client (ssh2 library)                            │  │
│  │  • SSH Protocol Implementation                        │  │
│  │  • Authentication Handling                            │  │
│  │  • Terminal Shell Management                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Database Layer (SQLite + Better-SQLite3)             │  │
│  │  • User Management                                    │  │
│  │  • Connection Storage                                 │  │
│  │  • SSH Keys Vault                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │ SSH Protocol (Port 22+)
┌──────────────────────────▼───────────────────────────────────┐
│              Remote SSH Servers                              │
│  • Linux/Unix Servers                                        │
│  • Network Devices                                           │
│  • Cloud Instances                                           │
└──────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **WebSocket**: ws library
- **SSH Client**: ssh2 library
- **Database**: SQLite with Better-SQLite3
- **Authentication**: JSON Web Tokens (JWT)
- **Password Hashing**: bcrypt
- **Environment**: dotenv

### Frontend
- **Core**: Vanilla JavaScript (ES6+)
- **UI Framework**: Tailwind CSS
- **Terminal Emulator**: xterm.js + xterm-addon-fit
- **Icons**: Material Design Icons
- **Build**: No build step (browser-native modules)

### DevOps
- **Container**: Docker (Alpine Linux base)
- **Orchestration**: docker-compose
- **CI/CD**: GitHub Actions

## Core Components

### 1. Authentication System

**Technology**: JWT with httpOnly cookies + bcrypt

**Flow:**
```
┌──────┐                  ┌────────────┐                ┌──────────┐
│Client│                  │ Express    │                │ Database │
└──┬───┘                  └─────┬──────┘                └────┬─────┘
   │ POST /auth/register        │                            │
   ├───────────────────────────>│                            │
   │                            │ Hash password (bcrypt)     │
   │                            │                            │
   │                            │ INSERT INTO users          │
   │                            ├──────────────────────────> │
   │                            │                            │
   │                            │ Generate JWT               │
   │                            │ Set httpOnly cookie        │
   │<───────────────────────────┤                            │
   │ 200 OK + Set-Cookie        │                            │
```

**Security Features:**
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens stored in httpOnly cookies (prevents XSS)
- Secure and sameSite flags on cookies
- 7-day token expiration
- Password strength validation (8+ chars, letter + number)

### 2. SSH Connection Management

**Components:**
- Connection profiles stored in SQLite
- Two authentication modes: password and SSH key
- Multiple concurrent sessions via tabs
- WebSocket-based terminal streaming

**Connection Flow:**
```
┌──────┐           ┌────────────┐        ┌─────────┐        ┌────────────┐
│Client│           │ WebSocket  │        │ SSH2    │        │ SSH Server │
└──┬───┘           └─────┬──────┘        └────┬────┘        └─────┬──────┘
   │ WS Upgrade          │                    │                    │
   ├────────────────────>│                    │                    │
   │ 101 Switching       │                    │                    │
   │<────────────────────┤                    │                    │
   │                     │                    │                    │
   │ {"type":"connect",  │                    │                    │
   │  "connectionId":1}  │                    │                    │
   ├────────────────────>│                    │                    │
   │                     │ Fetch credentials  │                    │
   │                     │ from DB            │                    │
   │                     │                    │                    │
   │                     │ SSH Connect        │                    │
   │                     ├───────────────────>│ TCP + SSH Handshake│
   │                     │                    ├───────────────────>│
   │                     │                    │ Authenticate       │
   │                     │                    │<───────────────────┤
   │                     │                    │ Open Shell         │
   │                     │                    ├───────────────────>│
   │ {"type":"status",   │                    │                    │
   │  "message":"Connected"}                  │                    │
   │<────────────────────┤                    │                    │
   │                     │                    │                    │
   │ {"type":"input",    │                    │                    │
   │  "data":"ls\n"}     │                    │                    │
   ├────────────────────>│                    │                    │
   │                     │ Stream to shell    │                    │
   │                     ├───────────────────>│                    │
   │                     │                    ├───────────────────>│
   │                     │                    │ Command output     │
   │                     │                    │<───────────────────┤
   │ {"type":"data",     │                    │                    │
   │  "data":"file1\n.."}│                    │                    │
   │<────────────────────┤                    │                    │
```

### 3. Database Schema

**SQLite Database** (`ssh-client.db`)

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,           -- bcrypt hash
  email TEXT,
  theme TEXT DEFAULT 'default',     -- Terminal theme preference
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SSH Keys vault
CREATE TABLE ssh_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  private_key TEXT NOT NULL,        -- ⚠️ Plain text (encryption planned)
  public_key TEXT,
  passphrase TEXT,                  -- ⚠️ Plain text (encryption planned)
  key_type TEXT DEFAULT 'rsa',      -- rsa, ed25519, ecdsa
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SSH Connections
CREATE TABLE connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER DEFAULT 22,
  username TEXT NOT NULL,
  auth_type TEXT DEFAULT 'password', -- 'password' or 'key'
  password TEXT,                     -- ⚠️ Plain text (encryption planned)
  key_id INTEGER,                    -- Reference to ssh_keys
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (key_id) REFERENCES ssh_keys(id) ON DELETE SET NULL
);
```

**Migrations:**
- Automatic schema migration on startup
- Handles missing columns gracefully
- No downtime required

### 4. Terminal System

**xterm.js Integration:**

```javascript
// Terminal lifecycle
┌──────────────────────────────────────────────────────────────┐
│ Tab Creation                                                  │
│  1. Create DOM container                                     │
│  2. Initialize xterm.js Terminal with theme                  │
│  3. Attach fit addon for responsive sizing                   │
│  4. Open terminal in container                               │
│  5. Establish WebSocket connection                           │
│  6. Bind terminal input to WebSocket                         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Data Flow                                                     │
│                                                               │
│  User Input → Terminal.onData() → WebSocket.send()           │
│  WebSocket.onMessage() → Terminal.write()                    │
│  Window Resize → FitAddon.fit() → WebSocket.send(resize)    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Tab Cleanup                                                   │
│  1. Close WebSocket (triggers SSH connection close)          │
│  2. Dispose Terminal instance                                │
│  3. Remove DOM elements                                      │
│  4. Delete from tabs Map                                     │
└──────────────────────────────────────────────────────────────┘
```

**Theme System:**
- 8 predefined themes (Dracula, Nord, Tokyo Night, etc.)
- Theme stored in user profile
- Applied automatically on terminal creation
- Full VT100 ANSI color support

### 5. Session Management

**In-Memory Session Store:**

```javascript
// Server-side Map: sessionId → { client, stream, userId }
const sessions = new Map();

// Client-side Map: tabId → { terminal, ws, fitAddon, connectionId }
const tabs = new Map();
```

**Characteristics:**
- Sessions are stateful and in-memory
- Lost on server restart (by design)
- One SSH connection per tab
- Automatic cleanup on disconnect
- Graceful shutdown handling (SIGTERM, SIGINT)

## Security Architecture

### Attack Surface

```
┌─────────────────────────────────────────────────────────────┐
│ Threat Model                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Web Layer                                               │
│     • XSS attacks → Mitigated by httpOnly cookies           │
│     • CSRF → Mitigated by sameSite: 'strict'                │
│     • Password brute force → ⚠️ No rate limiting yet        │
│                                                              │
│  2. Database Layer                                          │
│     • SQL Injection → Mitigated by prepared statements      │
│     • Credential theft → ⚠️ Plain text storage              │
│                                                              │
│  3. SSH Layer                                               │
│     • Man-in-the-middle → Relies on SSH host key validation │
│     • Credential exposure → Transmitted via secure WebSocket│
│                                                              │
│  4. Network Layer                                           │
│     • Packet sniffing → ⚠️ Requires HTTPS in production     │
│     • WebSocket hijacking → Mitigated by JWT auth           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implemented Security Controls

✅ **Application Security:**
- JWT authentication with 7-day expiration
- Password hashing with bcrypt (10 rounds)
- httpOnly cookies (XSS protection)
- sameSite: 'strict' (CSRF protection)
- Input validation (port range, host format)
- Password strength requirements
- Prepared SQL statements (SQL injection prevention)

✅ **Infrastructure Security:**
- Docker non-root user
- Minimal Alpine base image
- Health checks
- Signal handling for graceful shutdown

### Pending Security Enhancements

⚠️ **Critical:**
- Database encryption for passwords and SSH keys
- Rate limiting on authentication endpoints
- HTTPS enforcement

⚠️ **Recommended:**
- Session timeout/refresh tokens
- Audit logging
- Two-factor authentication (2FA)
- Content Security Policy (CSP) headers
- CORS configuration

## Deployment Architecture

### Docker Deployment

```
┌─────────────────────────────────────────────────────────────┐
│ Docker Container (Alpine Linux)                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tini (PID 1 - Init System)                             │ │
│  │  └─ Node.js (PID 2)                                    │ │
│  │      └─ server.js (Express + WebSocket)                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Volumes:                                                    │
│    • /app/data/ssh-client.db (Database persistence)         │
│                                                              │
│  Environment:                                                │
│    • JWT_SECRET (required)                                  │
│    • PORT=8080                                              │
│    • NODE_ENV=production                                    │
│    • DB_PATH=/app/data/ssh-client.db                        │
│                                                              │
│  Network:                                                    │
│    • Exposed port: 8080                                     │
│    • Outbound: SSH connections (port 22+)                   │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Stage Build

```dockerfile
# Stage 1: Build dependencies (includes Python, GCC for native modules)
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ gcc
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Production (minimal image)
FROM node:20-alpine
RUN apk add --no-cache tini
COPY --from=base /app/node_modules ./node_modules
COPY . .
USER nodejs
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

**Benefits:**
- Smaller final image (~150MB vs ~400MB)
- No build tools in production image
- Improved security surface

## Performance Considerations

### Scalability Limits

**Single Instance Capacity:**
- ~100-200 concurrent SSH sessions (depending on hardware)
- Bottleneck: SSH2 library per-connection overhead
- Memory: ~10-20MB per active SSH session

**Database:**
- SQLite performance: 10,000+ users without issues
- Read-heavy workload (connections list)
- No write contention (single-user sessions)

### Optimization Opportunities

1. **WebSocket Compression**: Reduce bandwidth for terminal output
2. **Connection Pooling**: Reuse SSH connections for same server
3. **Redis Session Store**: Enable multi-instance deployment
4. **CDN for Static Assets**: Offload frontend delivery
5. **Database Connection Pool**: Better-SQLite3 is already synchronous and fast

## Data Flow Diagrams

### User Registration Flow
```
User → Frontend → POST /auth/register
                  ↓
            Validate password strength
                  ↓
            Hash password (bcrypt)
                  ↓
            INSERT INTO users
                  ↓
            Generate JWT
                  ↓
            Set httpOnly cookie
                  ↓
            200 OK → Frontend → Show app
```

### SSH Connection Flow
```
User clicks connection → Create tab
                         ↓
                    WebSocket connect
                         ↓
                    Authenticate JWT
                         ↓
                    Fetch connection + credentials
                         ↓
                    SSH2.connect(host, port, auth)
                         ↓
                    SSH handshake + auth
                         ↓
                    Open shell (xterm-256color)
                         ↓
                    Bidirectional stream
                         ↓
         Terminal input ←→ WebSocket ←→ SSH stream
```

## Monitoring and Observability

**Current State:**
- Console logging for errors and events
- No structured logging
- No metrics collection
- No distributed tracing

**Recommended:**
- Add Winston or Pino for structured logging
- Prometheus metrics (connections, errors, latency)
- Health check endpoint (already implemented)
- Error tracking (Sentry, Bugsnag)

## Future Architecture Considerations

### Horizontal Scaling

To scale beyond a single instance:

1. **Stateless Sessions**: Move sessions from Map to Redis
2. **Sticky Sessions**: Route users to same instance (or use Redis)
3. **Shared Database**: Migrate from SQLite to PostgreSQL/MySQL
4. **Load Balancer**: Nginx with WebSocket support

### Microservices Split

Potential service boundaries:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Auth Service │  │ SSH Gateway  │  │ API Service  │
│  (JWT, Users)│  │  (WebSocket) │  │  (REST CRUD) │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                  ┌───────────────┐
                  │   PostgreSQL  │
                  │   + Redis     │
                  └───────────────┘
```

## References

- [xterm.js Documentation](https://xtermjs.org/)
- [SSH2 Library](https://github.com/mscdex/ssh2)
- [Express.js Guide](https://expressjs.com/)
- [Better-SQLite3 API](https://github.com/WiseLibs/better-sqlite3)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

*For API documentation, see [API.md](API.md)*
*For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)*
*For security policy, see [SECURITY.md](SECURITY.md)*
