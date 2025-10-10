require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;
const DB_PATH = process.env.DB_PATH || 'ssh-client.db';

// Validate JWT_SECRET exists
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  console.error('Please create a .env file with JWT_SECRET. See .env.example for reference.');
  process.exit(1);
}

const db = new Database(DB_PATH);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    theme TEXT DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ssh_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    private_key TEXT NOT NULL,
    public_key TEXT,
    passphrase TEXT,
    key_type TEXT DEFAULT 'rsa',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 22,
    username TEXT NOT NULL,
    auth_type TEXT DEFAULT 'password',
    password TEXT,
    key_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (key_id) REFERENCES ssh_keys(id) ON DELETE SET NULL
  );
`);

// Migration: Add theme column if it doesn't exist
try {
  db.exec(`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'default'`);
  console.log('Added theme column to users table');
} catch (err) {
  // Column already exists, ignore error
  if (!err.message.includes('duplicate column name')) {
    console.error('Migration error:', err);
  }
}

// Migration: Add description column to connections if it doesn't exist
try {
  db.exec(`ALTER TABLE connections ADD COLUMN description TEXT`);
  console.log('Added description column to connections table');
} catch (err) {
  // Column already exists, ignore error
  if (!err.message.includes('duplicate column name')) {
    console.error('Migration error:', err);
  }
}

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Store active SSH sessions
const sessions = new Map();

// Validation helpers
function validatePort(port) {
  const portNum = parseInt(port);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

function validateHost(host) {
  if (!host || typeof host !== 'string' || host.trim().length === 0) {
    return false;
  }
  // Basic validation: alphanumeric, dots, dashes, and underscores
  const hostPattern = /^[a-zA-Z0-9.-]+$/;
  return hostPattern.test(host);
}

function validatePassword(password) {
  // Minimum 8 characters, at least one letter and one number
  if (!password || password.length < 8) {
    return false;
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

// Auth middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with at least one letter and one number' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)');
    const result = stmt.run(username, hashedPassword, email);

    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, username });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, theme, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Update profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword, theme } = req.body;

    // Get current user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required to set new password' });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      if (!validatePassword(newPassword)) {
        return res.status(400).json({ error: 'New password must be at least 8 characters with at least one letter and one number' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
    }

    // Update username if changed
    if (username && username !== user.username) {
      try {
        db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.user.id);
      } catch (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'Username already taken' });
        }
        throw err;
      }
    }

    // Update email if changed
    if (email !== user.email) {
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email || null, req.user.id);
    }

    // Update theme if provided
    if (theme !== undefined && theme !== user.theme) {
      db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.user.id);
    }

    // Get updated user
    const updatedUser = db.prepare('SELECT id, username, email, theme, created_at FROM users WHERE id = ?').get(req.user.id);

    // If username changed, issue new token
    if (username && username !== user.username) {
      const token = jwt.sign({ id: updatedUser.id, username: updatedUser.username }, JWT_SECRET);
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// SSH Keys endpoints
app.get('/api/keys', authenticateToken, (req, res) => {
  const keys = db.prepare('SELECT id, name, key_type, public_key, created_at FROM ssh_keys WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  
  // Add usage count
  keys.forEach(key => {
    const count = db.prepare('SELECT COUNT(*) as count FROM connections WHERE key_id = ? AND user_id = ?').get(key.id, req.user.id);
    key.usage_count = count.count;
  });
  
  res.json(keys);
});

app.post('/api/keys', authenticateToken, (req, res) => {
  try {
    const { name, private_key, public_key, passphrase, key_type } = req.body;
    
    if (!name || !private_key) {
      return res.status(400).json({ error: 'Name and private key required' });
    }
    
    const stmt = db.prepare('INSERT INTO ssh_keys (user_id, name, private_key, public_key, passphrase, key_type) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(req.user.id, name, private_key, public_key, passphrase, key_type || 'rsa');
    
    const key = db.prepare('SELECT id, name, key_type, public_key, created_at FROM ssh_keys WHERE id = ?').get(result.lastInsertRowid);
    res.json(key);
  } catch (err) {
    console.error('SSH key creation error:', err);
    res.status(500).json({ error: 'Failed to create SSH key' });
  }
});

app.delete('/api/keys/:id', authenticateToken, (req, res) => {
  // Check if key is in use
  const inUse = db.prepare('SELECT COUNT(*) as count FROM connections WHERE key_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  
  if (inUse.count > 0) {
    return res.status(400).json({ error: `Key is used in ${inUse.count} connection(s)` });
  }
  
  const stmt = db.prepare('DELETE FROM ssh_keys WHERE id = ? AND user_id = ?');
  stmt.run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Connection endpoints (protected)
app.get('/api/connections', authenticateToken, (req, res) => {
  const connections = db.prepare(`
    SELECT c.id, c.name, c.host, c.port, c.username, c.auth_type, c.key_id, c.description, c.created_at,
           k.name as key_name
    FROM connections c
    LEFT JOIN ssh_keys k ON c.key_id = k.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json(connections);
});

app.post('/api/connections', authenticateToken, (req, res) => {
  try {
    const { name, host, port, username, auth_type, password, key_id, description } = req.body;

    // Validate required fields
    if (!name || !host || !username) {
      return res.status(400).json({ error: 'Name, host, and username are required' });
    }

    // Validate host
    if (!validateHost(host)) {
      return res.status(400).json({ error: 'Invalid host format' });
    }

    // Validate port
    if (port && !validatePort(port)) {
      return res.status(400).json({ error: 'Port must be between 1 and 65535' });
    }

    const stmt = db.prepare(`
      INSERT INTO connections (user_id, name, host, port, username, auth_type, password, key_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      req.user.id, name, host, port || 22, username,
      auth_type || 'password', password, key_id, description || null
    );

    const connection = db.prepare(`
      SELECT c.id, c.name, c.host, c.port, c.username, c.auth_type, c.key_id, c.description, c.created_at,
             k.name as key_name
      FROM connections c
      LEFT JOIN ssh_keys k ON c.key_id = k.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);
    res.json(connection);
  } catch (err) {
    console.error('Connection creation error:', err);
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

app.put('/api/connections/:id', authenticateToken, (req, res) => {
  try {
    const { name, host, port, username, auth_type, password, key_id, description } = req.body;

    // Validate required fields
    if (!name || !host || !username) {
      return res.status(400).json({ error: 'Name, host, and username are required' });
    }

    // Validate host
    if (!validateHost(host)) {
      return res.status(400).json({ error: 'Invalid host format' });
    }

    // Validate port
    if (port && !validatePort(port)) {
      return res.status(400).json({ error: 'Port must be between 1 and 65535' });
    }

    // Build update query based on auth type
    if (auth_type === 'password') {
      if (password) {
        const stmt = db.prepare(`
          UPDATE connections
          SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, password = ?, key_id = NULL, description = ?
          WHERE id = ? AND user_id = ?
        `);
        stmt.run(name, host, port || 22, username, auth_type, password, description || null, req.params.id, req.user.id);
      } else {
        const stmt = db.prepare(`
          UPDATE connections
          SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, key_id = NULL, description = ?
          WHERE id = ? AND user_id = ?
        `);
        stmt.run(name, host, port || 22, username, auth_type, description || null, req.params.id, req.user.id);
      }
    } else {
      // SSH key auth
      const stmt = db.prepare(`
        UPDATE connections
        SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, key_id = ?, password = NULL, description = ?
        WHERE id = ? AND user_id = ?
      `);
      stmt.run(name, host, port || 22, username, auth_type, key_id, description || null, req.params.id, req.user.id);
    }

    const connection = db.prepare(`
      SELECT c.id, c.name, c.host, c.port, c.username, c.auth_type, c.key_id, c.description, c.created_at,
             k.name as key_name
      FROM connections c
      LEFT JOIN ssh_keys k ON c.key_id = k.id
      WHERE c.id = ?
    `).get(req.params.id);
    res.json(connection);
  } catch (err) {
    console.error('Connection update error:', err);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

app.delete('/api/connections/:id', authenticateToken, (req, res) => {
  const stmt = db.prepare('DELETE FROM connections WHERE id = ? AND user_id = ?');
  stmt.run(req.params.id, req.user.id);
  res.json({ success: true });
});

// WebSocket SSH handler
wss.on('connection', (ws, req) => {
  console.log('Client connected');
  
  // Extract token from cookie
  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  let user;
  try {
    user = jwt.verify(cookies?.token, JWT_SECRET);
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
    ws.close();
    return;
  }

  let sshClient = null;
  let stream = null;
  const sessionId = Date.now().toString();

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'connect') {
        // Verify connection belongs to user
        const conn = db.prepare(`
          SELECT c.*, k.private_key, k.passphrase 
          FROM connections c
          LEFT JOIN ssh_keys k ON c.key_id = k.id
          WHERE c.id = ? AND c.user_id = ?
        `).get(data.connectionId, user.id);
        
        if (!conn) {
          ws.send(JSON.stringify({ type: 'error', message: 'Connection not found' }));
          return;
        }

        // Initialize SSH connection
        sshClient = new Client();
        
        sshClient.on('ready', () => {
          console.log('SSH connection ready');
          ws.send(JSON.stringify({ type: 'status', message: 'Connected' }));
          
          sshClient.shell({ term: 'xterm-256color' }, (err, channel) => {
            if (err) {
              ws.send(JSON.stringify({ type: 'error', message: err.message }));
              return;
            }

            stream = channel;
            sessions.set(sessionId, { client: sshClient, stream, userId: user.id });

            channel.on('data', (data) => {
              ws.send(JSON.stringify({ 
                type: 'data', 
                data: data.toString('utf8') 
              }));
            });

            channel.on('close', () => {
              ws.send(JSON.stringify({ type: 'status', message: 'Disconnected' }));
              cleanup();
            });

            channel.stderr.on('data', (data) => {
              ws.send(JSON.stringify({ 
                type: 'data', 
                data: data.toString('utf8') 
              }));
            });
          });
        });

        sshClient.on('error', (err) => {
          console.error('SSH error:', err);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: err.message 
          }));
          cleanup();
        });

        sshClient.on('close', () => {
          console.log('SSH connection closed');
          cleanup();
        });

        // Connect to SSH server
        const config = {
          host: conn.host,
          port: conn.port || 22,
          username: conn.username
        };

        // Choose auth method
        if (conn.auth_type === 'key' && conn.private_key) {
          config.privateKey = conn.private_key;
          if (conn.passphrase) {
            config.passphrase = conn.passphrase;
          }
        } else if (conn.password) {
          config.password = conn.password;
        }

        sshClient.connect(config);
      } 
      else if (data.type === 'input') {
        if (stream) {
          stream.write(data.data);
        }
      }
      else if (data.type === 'resize') {
        if (stream) {
          stream.setWindow(data.rows, data.cols);
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    cleanup();
  });

  function cleanup() {
    if (stream) {
      stream.end();
      stream = null;
    }
    if (sshClient) {
      sshClient.end();
      sshClient = null;
    }
    sessions.delete(sessionId);
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`SSH Client running on http://localhost:${PORT}`);
  console.log('Database initialized');
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);

  // Close all active SSH sessions
  sessions.forEach(({ client, stream }) => {
    try {
      stream?.end();
      client?.end();
    } catch (err) {
      console.error('Error closing SSH session:', err);
    }
  });

  // Close database
  try {
    db.close();
    console.log('Database closed');
  } catch (err) {
    console.error('Error closing database:', err);
  }

  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));