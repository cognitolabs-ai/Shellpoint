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

  CREATE TABLE IF NOT EXISTS code_snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS local_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER DEFAULT 0,
    content BLOB,
    mime_type TEXT,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES local_files(id) ON DELETE CASCADE
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

// Migration: Add connection_type column to connections
try {
  db.exec(`ALTER TABLE connections ADD COLUMN connection_type TEXT DEFAULT 'ssh'`);
  console.log('Added connection_type column to connections table');
} catch (err) {
  if (!err.message.includes('duplicate column name')) {
    console.error('Migration error:', err);
  }
}

// Migration: Add initial_path column for SFTP connections
try {
  db.exec(`ALTER TABLE connections ADD COLUMN initial_path TEXT`);
  console.log('Added initial_path column to connections table');
} catch (err) {
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

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    database: checkDatabaseHealth()
  };
  
  res.status(200).json(health);
});

function checkDatabaseHealth() {
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return { status: 'connected', userCount: result.count };
  } catch (err) {
    return { status: 'error', message: err.message };
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

// Code Snippets endpoints
app.get('/api/snippets', authenticateToken, (req, res) => {
  const snippets = db.prepare(`
    SELECT id, name, description, language, content, created_at, updated_at
    FROM code_snippets
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(req.user.id);
  res.json(snippets);
});

app.post('/api/snippets', authenticateToken, (req, res) => {
  try {
    const { name, content, description, language } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content required' });
    }

    const stmt = db.prepare(`
      INSERT INTO code_snippets (user_id, name, content, description, language)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(req.user.id, name, content, description || null, language || null);

    const snippet = db.prepare(`
      SELECT id, name, description, language, content, created_at, updated_at
      FROM code_snippets WHERE id = ?
    `).get(result.lastInsertRowid);
    res.json(snippet);
  } catch (err) {
    console.error('Snippet creation error:', err);
    res.status(500).json({ error: 'Failed to create snippet' });
  }
});

app.put('/api/snippets/:id', authenticateToken, (req, res) => {
  try {
    const { name, content, description, language } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content required' });
    }

    const stmt = db.prepare(`
      UPDATE code_snippets
      SET name = ?, content = ?, description = ?, language = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(name, content, description || null, language || null, req.params.id, req.user.id);

    const snippet = db.prepare(`
      SELECT id, name, description, language, content, created_at, updated_at
      FROM code_snippets WHERE id = ?
    `).get(req.params.id);
    res.json(snippet);
  } catch (err) {
    console.error('Snippet update error:', err);
    res.status(500).json({ error: 'Failed to update snippet' });
  }
});

app.delete('/api/snippets/:id', authenticateToken, (req, res) => {
  const stmt = db.prepare('DELETE FROM code_snippets WHERE id = ? AND user_id = ?');
  stmt.run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Connection endpoints (protected)
app.get('/api/connections', authenticateToken, (req, res) => {
  const connections = db.prepare(`
    SELECT c.id, c.name, c.host, c.port, c.username, c.auth_type, c.key_id, c.description, c.connection_type, c.initial_path, c.created_at,
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
    const { name, host, port, username, auth_type, password, key_id, description, connection_type, initial_path } = req.body;

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
      INSERT INTO connections (user_id, name, host, port, username, auth_type, password, key_id, description, connection_type, initial_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      req.user.id, name, host, port || 22, username,
      auth_type || 'password', password, key_id, description || null,
      connection_type || 'ssh', initial_path || null
    );

    const connection = db.prepare(`
      SELECT c.id, c.name, c.host, c.port, c.username, c.auth_type, c.key_id, c.description, c.connection_type, c.initial_path, c.created_at,
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
    const { name, host, port, username, auth_type, password, key_id, description, connection_type, initial_path } = req.body;

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
          SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, password = ?, key_id = NULL, description = ?, connection_type = ?, initial_path = ?
          WHERE id = ? AND user_id = ?
        `);
        stmt.run(name, host, port || 22, username, auth_type, password, description || null, connection_type || 'ssh', initial_path || null, req.params.id, req.user.id);
      } else {
        const stmt = db.prepare(`
          UPDATE connections
          SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, key_id = NULL, description = ?, connection_type = ?, initial_path = ?
          WHERE id = ? AND user_id = ?
        `);
        stmt.run(name, host, port || 22, username, auth_type, description || null, connection_type || 'ssh', initial_path || null, req.params.id, req.user.id);
      }
    } else {
      // SSH key auth
      const stmt = db.prepare(`
        UPDATE connections
        SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, key_id = ?, password = NULL, description = ?, connection_type = ?, initial_path = ?
        WHERE id = ? AND user_id = ?
      `);
      stmt.run(name, host, port || 22, username, auth_type, key_id, description || null, connection_type || 'ssh', initial_path || null, req.params.id, req.user.id);
    }

    const connection = db.prepare(`
      SELECT c.id, c.name, c.host, c.port, c.username, c.auth_type, c.key_id, c.description, c.connection_type, c.initial_path, c.created_at,
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

// Local Files endpoints (for fake local file system)
app.get('/api/local-files', authenticateToken, (req, res) => {
  try {
    const { path } = req.query;
    let files;

    if (path && path !== '/') {
      // Get files in specific path
      const parent = db.prepare('SELECT id FROM local_files WHERE path = ? AND user_id = ? AND type = ?').get(path, req.user.id, 'directory');
      if (parent) {
        files = db.prepare('SELECT * FROM local_files WHERE parent_id = ? AND user_id = ? ORDER BY type DESC, name ASC').all(parent.id, req.user.id);
      } else {
        files = [];
      }
    } else {
      // Get root level files
      files = db.prepare('SELECT * FROM local_files WHERE parent_id IS NULL AND user_id = ? ORDER BY type DESC, name ASC').all(req.user.id);
    }

    // Don't send content in list view
    files = files.map(({ content, ...file }) => file);
    res.json(files);
  } catch (err) {
    console.error('Local files list error:', err);
    res.status(500).json({ error: 'Failed to list local files' });
  }
});

app.get('/api/local-files/:id', authenticateToken, (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM local_files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  } catch (err) {
    console.error('Local file get error:', err);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

app.get('/api/local-files/:id/content', authenticateToken, (req, res) => {
  try {
    const file = db.prepare('SELECT content, mime_type, name FROM local_files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.content) {
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.send(file.content);
    } else {
      res.status(404).json({ error: 'No content available' });
    }
  } catch (err) {
    console.error('Local file content error:', err);
    res.status(500).json({ error: 'Failed to get file content' });
  }
});

app.post('/api/local-files', authenticateToken, async (req, res) => {
  try {
    const { name, path, type, content, mime_type, parent_id } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const fullPath = path || (parent_id ? null : '/');
    const size = content ? Buffer.byteLength(content, 'utf8') : 0;

    const stmt = db.prepare(`
      INSERT INTO local_files (user_id, name, path, type, size, content, mime_type, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.user.id,
      name,
      fullPath || `${path}/${name}`,
      type,
      size,
      content ? Buffer.from(content) : null,
      mime_type || 'text/plain',
      parent_id || null
    );

    const file = db.prepare('SELECT * FROM local_files WHERE id = ?').get(result.lastInsertRowid);
    const { content: _, ...fileWithoutContent } = file;
    res.json(fileWithoutContent);
  } catch (err) {
    console.error('Local file creation error:', err);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

app.put('/api/local-files/:id', authenticateToken, (req, res) => {
  try {
    const { name, content, mime_type } = req.body;

    const file = db.prepare('SELECT * FROM local_files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const size = content ? Buffer.byteLength(content, 'utf8') : file.size;
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (content !== undefined) {
      updates.push('content = ?', 'size = ?');
      values.push(Buffer.from(content), size);
    }
    if (mime_type) {
      updates.push('mime_type = ?');
      values.push(mime_type);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id, req.user.id);

    const stmt = db.prepare(`
      UPDATE local_files
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(...values);

    const updated = db.prepare('SELECT * FROM local_files WHERE id = ?').get(req.params.id);
    const { content: _, ...fileWithoutContent } = updated;
    res.json(fileWithoutContent);
  } catch (err) {
    console.error('Local file update error:', err);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

app.delete('/api/local-files/:id', authenticateToken, (req, res) => {
  try {
    const file = db.prepare('SELECT type FROM local_files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // If directory, delete recursively (CASCADE will handle this)
    const stmt = db.prepare('DELETE FROM local_files WHERE id = ? AND user_id = ?');
    stmt.run(req.params.id, req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Local file delete error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
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
  let sftpSession = null;
  let connectionType = null;
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

        connectionType = conn.connection_type || 'ssh';

        // Initialize SSH connection
        sshClient = new Client();
        
        sshClient.on('ready', () => {
          console.log(`${connectionType.toUpperCase()} connection ready`);
          ws.send(JSON.stringify({ type: 'status', message: 'Connected' }));

          if (connectionType === 'sftp') {
            // Open SFTP session
            sshClient.sftp((err, sftp) => {
              if (err) {
                ws.send(JSON.stringify({ type: 'error', message: err.message }));
                return;
              }

              sftpSession = sftp;
              sessions.set(sessionId, { client: sshClient, sftp: sftpSession, userId: user.id, type: 'sftp' });

              // Send initial directory (home directory or configured path)
              const initialPath = conn.initial_path || '.';
              sftp.readdir(initialPath, (err, list) => {
                if (err) {
                  ws.send(JSON.stringify({ type: 'sftp-error', message: err.message }));
                } else {
                  ws.send(JSON.stringify({
                    type: 'sftp-list',
                    path: initialPath,
                    files: list.map(file => ({
                      name: file.filename,
                      type: file.longname.startsWith('d') ? 'directory' : 'file',
                      size: file.attrs.size,
                      permissions: file.attrs.permissions,
                      modified: file.attrs.mtime * 1000,
                      owner: file.attrs.uid,
                      group: file.attrs.gid
                    }))
                  }));
                }
              });
            });
          } else {
            // Open SSH shell
            sshClient.shell({ term: 'xterm-256color' }, (err, channel) => {
              if (err) {
                ws.send(JSON.stringify({ type: 'error', message: err.message }));
                return;
              }

              stream = channel;
              sessions.set(sessionId, { client: sshClient, stream, userId: user.id, type: 'ssh' });

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
          }
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
      // SFTP operations
      else if (data.type === 'sftp-list') {
        if (!sftpSession) {
          ws.send(JSON.stringify({ type: 'sftp-error', message: 'SFTP session not established' }));
          return;
        }

        sftpSession.readdir(data.path, (err, list) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'sftp-error', message: err.message, operation: 'list', path: data.path }));
          } else {
            ws.send(JSON.stringify({
              type: 'sftp-list',
              path: data.path,
              files: list.map(file => ({
                name: file.filename,
                type: file.longname.startsWith('d') ? 'directory' : 'file',
                size: file.attrs.size,
                permissions: file.attrs.permissions,
                modified: file.attrs.mtime * 1000,
                owner: file.attrs.uid,
                group: file.attrs.gid
              }))
            }));
          }
        });
      }
      else if (data.type === 'sftp-download') {
        if (!sftpSession) {
          ws.send(JSON.stringify({ type: 'sftp-error', message: 'SFTP session not established' }));
          return;
        }

        const remotePath = data.path;
        sftpSession.readFile(remotePath, (err, buffer) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'sftp-error', message: err.message, operation: 'download', path: remotePath }));
          } else {
            ws.send(JSON.stringify({
              type: 'sftp-download',
              path: remotePath,
              content: buffer.toString('base64'),
              size: buffer.length
            }));
          }
        });
      }
      else if (data.type === 'sftp-upload') {
        if (!sftpSession) {
          ws.send(JSON.stringify({ type: 'sftp-error', message: 'SFTP session not established' }));
          return;
        }

        const remotePath = data.path;
        const content = Buffer.from(data.content, 'base64');

        sftpSession.writeFile(remotePath, content, (err) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'sftp-error', message: err.message, operation: 'upload', path: remotePath }));
          } else {
            ws.send(JSON.stringify({
              type: 'sftp-upload',
              path: remotePath,
              success: true
            }));
          }
        });
      }
      else if (data.type === 'sftp-delete') {
        if (!sftpSession) {
          ws.send(JSON.stringify({ type: 'sftp-error', message: 'SFTP session not established' }));
          return;
        }

        const remotePath = data.path;
        const isDirectory = data.isDirectory;

        if (isDirectory) {
          sftpSession.rmdir(remotePath, (err) => {
            if (err) {
              ws.send(JSON.stringify({ type: 'sftp-error', message: err.message, operation: 'delete', path: remotePath }));
            } else {
              ws.send(JSON.stringify({
                type: 'sftp-delete',
                path: remotePath,
                success: true
              }));
            }
          });
        } else {
          sftpSession.unlink(remotePath, (err) => {
            if (err) {
              ws.send(JSON.stringify({ type: 'sftp-error', message: err.message, operation: 'delete', path: remotePath }));
            } else {
              ws.send(JSON.stringify({
                type: 'sftp-delete',
                path: remotePath,
                success: true
              }));
            }
          });
        }
      }
      else if (data.type === 'sftp-rename') {
        if (!sftpSession) {
          ws.send(JSON.stringify({ type: 'sftp-error', message: 'SFTP session not established' }));
          return;
        }

        sftpSession.rename(data.oldPath, data.newPath, (err) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'sftp-error', message: err.message, operation: 'rename', path: data.oldPath }));
          } else {
            ws.send(JSON.stringify({
              type: 'sftp-rename',
              oldPath: data.oldPath,
              newPath: data.newPath,
              success: true
            }));
          }
        });
      }
      else if (data.type === 'sftp-mkdir') {
        if (!sftpSession) {
          ws.send(JSON.stringify({ type: 'sftp-error', message: 'SFTP session not established' }));
          return;
        }

        sftpSession.mkdir(data.path, (err) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'sftp-error', message: err.message, operation: 'mkdir', path: data.path }));
          } else {
            ws.send(JSON.stringify({
              type: 'sftp-mkdir',
              path: data.path,
              success: true
            }));
          }
        });
      }
      else if (data.type === 'sftp-chmod') {
        if (!sftpSession) {
          ws.send(JSON.stringify({ type: 'sftp-error', message: 'SFTP session not established' }));
          return;
        }

        sftpSession.chmod(data.path, data.mode, (err) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'sftp-error', message: err.message, operation: 'chmod', path: data.path }));
          } else {
            ws.send(JSON.stringify({
              type: 'sftp-chmod',
              path: data.path,
              mode: data.mode,
              success: true
            }));
          }
        });
      }
      else if (data.type === 'sftp-stat') {
        if (!sftpSession) {
          ws.send(JSON.stringify({ type: 'sftp-error', message: 'SFTP session not established' }));
          return;
        }

        sftpSession.stat(data.path, (err, stats) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'sftp-error', message: err.message, operation: 'stat', path: data.path }));
          } else {
            ws.send(JSON.stringify({
              type: 'sftp-stat',
              path: data.path,
              stats: {
                size: stats.size,
                permissions: stats.permissions,
                modified: stats.mtime * 1000,
                accessed: stats.atime * 1000,
                owner: stats.uid,
                group: stats.gid,
                isDirectory: stats.isDirectory(),
                isFile: stats.isFile()
              }
            }));
          }
        });
      }
      else if (data.type === 'sftp-read') {
        if (!sftpSession) {
          ws.send(JSON.stringify({ type: 'sftp-error', message: 'SFTP session not established' }));
          return;
        }

        const remotePath = data.path;
        sftpSession.readFile(remotePath, (err, buffer) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'sftp-read', success: false, error: err.message, path: remotePath }));
          } else {
            ws.send(JSON.stringify({
              type: 'sftp-read',
              path: remotePath,
              content: buffer.toString('base64'),
              success: true
            }));
          }
        });
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
    if (sftpSession) {
      sftpSession.end();
      sftpSession = null;
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

  // Close all active SSH/SFTP sessions
  sessions.forEach(({ client, stream, sftp, type }) => {
    try {
      stream?.end();
      sftp?.end();
      client?.end();
    } catch (err) {
      console.error(`Error closing ${type || 'SSH'} session:`, err);
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