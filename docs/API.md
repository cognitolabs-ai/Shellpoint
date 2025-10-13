# ShellPoint API Documentation

## Base URL
```
http://localhost:8080/api
```

## Authentication
All protected endpoints require a valid JWT token stored in an httpOnly cookie named `token`.

---

## Authentication Endpoints

### Register New User
**POST** `/auth/register`

Creates a new user account and returns a JWT token in a cookie.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "SecurePass123",
  "email": "john@example.com"
}
```

**Validation:**
- `username`: Required, unique
- `password`: Required, minimum 8 characters, must contain at least one letter and one number
- `email`: Optional

**Response (200 OK):**
```json
{
  "success": true,
  "username": "john_doe"
}
```

**Errors:**
- `400 Bad Request`: Username/password missing or invalid password format
- `400 Bad Request`: Username already exists
- `500 Internal Server Error`: Registration failed

---

### Login
**POST** `/auth/login`

Authenticates a user and returns a JWT token in a cookie.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "username": "john_doe"
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Login failed

---

### Logout
**POST** `/auth/logout`

Clears the JWT cookie.

**Response (200 OK):**
```json
{
  "success": true
}
```

---

### Get Current User
**GET** `/auth/me` 🔒

Returns the current authenticated user's profile.

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "theme": "dracula",
  "created_at": "2025-10-10T12:00:00.000Z"
}
```

**Errors:**
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Invalid token

---

### Update Profile
**PUT** `/auth/profile` 🔒

Updates the current user's profile information.

**Request Body:**
```json
{
  "username": "new_username",
  "email": "newemail@example.com",
  "theme": "nord",
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

**Fields:**
- `username`: Optional, must be unique
- `email`: Optional
- `theme`: Optional, one of: `default`, `dracula`, `monokai`, `nord`, `oneDark`, `solarizedDark`, `gruvbox`, `tokyoNight`
- `currentPassword`: Required if changing password
- `newPassword`: Optional, must meet password requirements

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "new_username",
    "email": "newemail@example.com",
    "theme": "nord",
    "created_at": "2025-10-10T12:00:00.000Z"
  }
}
```

**Errors:**
- `400 Bad Request`: Username already taken or invalid password format
- `401 Unauthorized`: Current password is incorrect
- `500 Internal Server Error`: Failed to update profile

---

## SSH Connections Endpoints

### List Connections
**GET** `/connections` 🔒

Returns all SSH connections for the authenticated user.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Production Server",
    "host": "example.com",
    "port": 22,
    "username": "root",
    "auth_type": "password",
    "key_id": null,
    "key_name": null,
    "description": "Main production server",
    "created_at": "2025-10-10T12:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Dev Server",
    "host": "192.168.1.100",
    "port": 2222,
    "username": "developer",
    "auth_type": "key",
    "key_id": 3,
    "key_name": "My SSH Key",
    "description": "Development environment",
    "created_at": "2025-10-10T13:00:00.000Z"
  }
]
```

---

### Create Connection
**POST** `/connections` 🔒

Creates a new SSH connection profile.

**Request Body (Password Auth):**
```json
{
  "name": "Production Server",
  "host": "example.com",
  "port": 22,
  "username": "root",
  "auth_type": "password",
  "password": "server_password",
  "description": "Main production server"
}
```

**Request Body (SSH Key Auth):**
```json
{
  "name": "Dev Server",
  "host": "192.168.1.100",
  "port": 2222,
  "username": "developer",
  "auth_type": "key",
  "key_id": 3,
  "description": "Development environment"
}
```

**Validation:**
- `name`: Required
- `host`: Required, alphanumeric with dots and dashes
- `port`: Optional (default: 22), must be between 1-65535
- `username`: Required
- `auth_type`: Required, either `password` or `key`
- `password`: Required if `auth_type` is `password`
- `key_id`: Required if `auth_type` is `key`
- `description`: Optional

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Production Server",
  "host": "example.com",
  "port": 22,
  "username": "root",
  "auth_type": "password",
  "key_id": null,
  "key_name": null,
  "description": "Main production server",
  "created_at": "2025-10-10T12:00:00.000Z"
}
```

**Errors:**
- `400 Bad Request`: Missing required fields or invalid format
- `500 Internal Server Error`: Failed to create connection

---

### Update Connection
**PUT** `/connections/:id` 🔒

Updates an existing SSH connection profile.

**Request Body:** Same as Create Connection

**Response (200 OK):** Same as Create Connection

**Errors:**
- `400 Bad Request`: Missing required fields or invalid format
- `404 Not Found`: Connection not found or doesn't belong to user
- `500 Internal Server Error`: Failed to update connection

---

### Delete Connection
**DELETE** `/connections/:id` 🔒

Deletes an SSH connection profile.

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## SSH Keys Endpoints

### List SSH Keys
**GET** `/keys` 🔒

Returns all SSH keys for the authenticated user.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "My Personal Key",
    "key_type": "rsa",
    "public_key": null,
    "usage_count": 3,
    "created_at": "2025-10-10T12:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Work Key",
    "key_type": "ed25519",
    "public_key": null,
    "usage_count": 0,
    "created_at": "2025-10-10T13:00:00.000Z"
  }
]
```

---

### Add SSH Key
**POST** `/keys` 🔒

Adds a new SSH private key to the vault.

**Request Body:**
```json
{
  "name": "My Personal Key",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "public_key": "ssh-rsa AAAA...",
  "passphrase": "key_passphrase",
  "key_type": "rsa"
}
```

**Validation:**
- `name`: Required
- `private_key`: Required
- `public_key`: Optional
- `passphrase`: Optional (required if key is encrypted)
- `key_type`: Optional (default: `rsa`), one of: `rsa`, `ed25519`, `ecdsa`

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "My Personal Key",
  "key_type": "rsa",
  "public_key": null,
  "created_at": "2025-10-10T12:00:00.000Z"
}
```

**Errors:**
- `400 Bad Request`: Missing name or private key
- `500 Internal Server Error`: Failed to create SSH key

---

### Delete SSH Key
**DELETE** `/keys/:id` 🔒

Deletes an SSH key from the vault.

**Response (200 OK):**
```json
{
  "success": true
}
```

**Errors:**
- `400 Bad Request`: Key is used in active connections
- `404 Not Found`: Key not found or doesn't belong to user

---

## Code Snippets Endpoints

### List Code Snippets
**GET** `/snippets` 🔒

Returns all code snippets for the authenticated user.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Server Health Check",
    "content": "#!/bin/bash\ndf -h\nfree -m\nuptime",
    "description": "Quick server health diagnostics",
    "language": "bash",
    "created_at": "2025-10-10T12:00:00.000Z",
    "updated_at": "2025-10-10T12:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Git Status",
    "content": "git status\ngit log --oneline -5",
    "description": "Check git repository status",
    "language": "shell",
    "created_at": "2025-10-10T13:00:00.000Z",
    "updated_at": "2025-10-10T13:00:00.000Z"
  }
]
```

---

### Create Code Snippet
**POST** `/snippets` 🔒

Creates a new code snippet.

**Request Body:**
```json
{
  "name": "Server Health Check",
  "content": "#!/bin/bash\ndf -h\nfree -m\nuptime",
  "description": "Quick server health diagnostics",
  "language": "bash"
}
```

**Validation:**
- `name`: Required
- `content`: Required
- `description`: Optional
- `language`: Optional (e.g., `bash`, `shell`, `python`, `javascript`)

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Server Health Check",
  "content": "#!/bin/bash\ndf -h\nfree -m\nuptime",
  "description": "Quick server health diagnostics",
  "language": "bash",
  "created_at": "2025-10-10T12:00:00.000Z",
  "updated_at": "2025-10-10T12:00:00.000Z"
}
```

**Errors:**
- `400 Bad Request`: Missing name or content
- `500 Internal Server Error`: Failed to create snippet

---

### Update Code Snippet
**PUT** `/snippets/:id` 🔒

Updates an existing code snippet.

**Request Body:** Same as Create Code Snippet

**Response (200 OK):** Same as Create Code Snippet

**Errors:**
- `400 Bad Request`: Missing required fields
- `404 Not Found`: Snippet not found or doesn't belong to user
- `500 Internal Server Error`: Failed to update snippet

---

### Delete Code Snippet
**DELETE** `/snippets/:id` 🔒

Deletes a code snippet.

**Response (200 OK):**
```json
{
  "success": true
}
```

**Errors:**
- `404 Not Found`: Snippet not found or doesn't belong to user

---

## WebSocket Protocol

### Connection
Connect to WebSocket at `ws://localhost:8080` (or `wss://` for HTTPS).

Authentication is performed using the JWT cookie automatically sent with the upgrade request.

### Message Types

#### Client → Server

**Connect to SSH Server:**
```json
{
  "type": "connect",
  "connectionId": 1
}
```

**Send Terminal Input:**
```json
{
  "type": "input",
  "data": "ls -la\n"
}
```

**Resize Terminal:**
```json
{
  "type": "resize",
  "rows": 24,
  "cols": 80
}
```

#### Server → Client

**Terminal Data Output:**
```json
{
  "type": "data",
  "data": "total 48\ndrwxr-xr-x  12 user  staff   384 Oct 10 12:00 .\n..."
}
```

**Status Update:**
```json
{
  "type": "status",
  "message": "Connected"
}
```

**Error Message:**
```json
{
  "type": "error",
  "message": "Connection refused"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes
- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Invalid or expired token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Rate Limiting

**Note:** Rate limiting is not currently implemented. For production deployments, it's recommended to implement rate limiting on authentication endpoints.

---

## Security Considerations

1. **HTTPS Required**: Always use HTTPS in production to protect JWT tokens and credentials in transit.
2. **JWT Secret**: Ensure `JWT_SECRET` environment variable is set to a cryptographically secure random value.
3. **Cookie Security**: Cookies have `httpOnly`, `secure` (in production), and `sameSite: 'strict'` flags.
4. **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds.
5. **Session Duration**: JWT tokens expire after 7 days.

---

## Example Usage

### Registering and Connecting to SSH

```javascript
// 1. Register
const register = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john',
    password: 'SecurePass123',
    email: 'john@example.com'
  })
});

// 2. Create a connection
const createConn = await fetch('/api/connections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Server',
    host: 'example.com',
    port: 22,
    username: 'root',
    auth_type: 'password',
    password: 'server_pass'
  })
});

const connection = await createConn.json();

// 3. Connect via WebSocket
const ws = new WebSocket('ws://localhost:8080');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'connect',
    connectionId: connection.id
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'data') {
    console.log('Terminal output:', msg.data);
  }
};

// 4. Send command
ws.send(JSON.stringify({
  type: 'input',
  data: 'ls -la\n'
}));
```

---

## UI Features

### Split Screen Mode

**Feature**: View and work with multiple terminals simultaneously in split screen layout.

**Activation**:
- Click the grid icon (`grid_view`) in the tabs bar when 2 or more connections are active
- The icon automatically appears/disappears based on the number of active tabs

**Layouts**:
- **2 terminals**: Top-bottom horizontal split
- **4 terminals**: 2×2 grid layout

**Smart Tab Selection**:
- Automatically selects the last 2 or 4 active tabs based on recent usage
- Active terminal is highlighted with a blue border

**Interaction**:
- **Tab Switching**: Click any tab to replace the top terminal with that connection
- **Draggable Separators**:
  - 2 terminals: Horizontal separator (top-bottom)
  - 4 terminals: Crosshair separator (moves both horizontal and vertical together)
  - Separators are constrained between 20-80% to prevent terminals from becoming too small
- **Exit Split Mode**: Click the grid icon again, or click on a tab that's already visible

**Auto-Exit**:
- Closing a tab that's currently displayed in split mode automatically exits split mode
- Icon hides when fewer than 2 tabs remain

**Terminal Resizing**:
- All visible terminals automatically resize when window is resized
- xterm.js fit addon ensures proper terminal dimensions

### Code Snippet Execution

**Feature**: Execute saved code snippets directly in any terminal tab.

**Usage**:
1. Click the play icon (`play_circle`) on any terminal tab
2. A dropdown appears with available snippets
3. Click a snippet to paste its content into the terminal

**Filtering**:
- **Bash/Shell Filter** (default): Shows only bash and shell snippets
- **All Filter**: Shows all snippets regardless of language
- Filter toggles are in the dropdown header

**Snippet Display**:
- Snippet name is displayed
- Language tag is shown (if specified)
- Snippets are sorted alphabetically by name

**Execution**:
- Entire snippet content is sent to the terminal as one string (preserves `\n` line breaks)
- Content appears in the terminal ready for review and execution
- User can edit before pressing Enter

**Keyboard Shortcuts**:
- `ESC`: Close the snippet dropdown
- Click outside dropdown: Auto-close

**Visual Design**:
- Material Design dropdown with rounded corners
- Hover effects on snippet items
- Active filter button is highlighted

### Code Snippet Management

**Access**: Click the code icon (`code`) in the sidebar to open the snippets library.

**Operations**:
- **Create**: Add new snippet with name, content, optional description and language
- **Edit**: Modify existing snippet details
- **Delete**: Remove snippet from library
- **Copy**: Copy snippet content to clipboard

**Fields**:
- **Name** (required): Display name for the snippet
- **Content** (required): The actual code or script content
- **Description** (optional): Brief description of what the snippet does
- **Language** (optional): Programming/scripting language (bash, shell, python, javascript, etc.)

**Preview**:
- Snippet content is displayed with syntax highlighting
- Long snippets show first 5 lines with "..." indicator
- Metadata includes creation and last update timestamps

---

🔒 = Requires authentication

For more information, see the [README](../README.md) and [Knowledge Base](knowledge-base.md).
