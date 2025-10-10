// Global state
let currentUser = null;
let sshKeys = [];
let nextTabId = 1;
let activeTabId = null;
let userTheme = 'default';

// Tabs storage: { tabId: { terminal, ws, fitAddon, connectionId, connectionName } }
const tabs = new Map();

// Terminal themes
const terminalThemes = {
  'default': {
    name: 'Default',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#aeafad',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff'
    }
  },
  'dracula': {
    name: 'Dracula',
    theme: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#f8f8f0',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff'
    }
  },
  'monokai': {
    name: 'Monokai',
    theme: {
      background: '#272822',
      foreground: '#f8f8f2',
      cursor: '#f8f8f0',
      black: '#272822',
      red: '#f92672',
      green: '#a6e22e',
      yellow: '#f4bf75',
      blue: '#66d9ef',
      magenta: '#ae81ff',
      cyan: '#a1efe4',
      white: '#f8f8f2',
      brightBlack: '#75715e',
      brightRed: '#f92672',
      brightGreen: '#a6e22e',
      brightYellow: '#f4bf75',
      brightBlue: '#66d9ef',
      brightMagenta: '#ae81ff',
      brightCyan: '#a1efe4',
      brightWhite: '#f9f8f5'
    }
  },
  'nord': {
    name: 'Nord',
    theme: {
      background: '#2e3440',
      foreground: '#d8dee9',
      cursor: '#d8dee9',
      black: '#3b4252',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      magenta: '#b48ead',
      cyan: '#88c0d0',
      white: '#e5e9f0',
      brightBlack: '#4c566a',
      brightRed: '#bf616a',
      brightGreen: '#a3be8c',
      brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1',
      brightMagenta: '#b48ead',
      brightCyan: '#8fbcbb',
      brightWhite: '#eceff4'
    }
  },
  'oneDark': {
    name: 'One Dark',
    theme: {
      background: '#282c34',
      foreground: '#abb2bf',
      cursor: '#528bff',
      black: '#282c34',
      red: '#e06c75',
      green: '#98c379',
      yellow: '#e5c07b',
      blue: '#61afef',
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: '#abb2bf',
      brightBlack: '#5c6370',
      brightRed: '#e06c75',
      brightGreen: '#98c379',
      brightYellow: '#d19a66',
      brightBlue: '#61afef',
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: '#ffffff'
    }
  },
  'solarizedDark': {
    name: 'Solarized Dark',
    theme: {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#839496',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3'
    }
  },
  'gruvbox': {
    name: 'Gruvbox Dark',
    theme: {
      background: '#282828',
      foreground: '#ebdbb2',
      cursor: '#ebdbb2',
      black: '#282828',
      red: '#cc241d',
      green: '#98971a',
      yellow: '#d79921',
      blue: '#458588',
      magenta: '#b16286',
      cyan: '#689d6a',
      white: '#a89984',
      brightBlack: '#928374',
      brightRed: '#fb4934',
      brightGreen: '#b8bb26',
      brightYellow: '#fabd2f',
      brightBlue: '#83a598',
      brightMagenta: '#d3869b',
      brightCyan: '#8ec07c',
      brightWhite: '#ebdbb2'
    }
  },
  'tokyoNight': {
    name: 'Tokyo Night',
    theme: {
      background: '#1a1b26',
      foreground: '#a9b1d6',
      cursor: '#c0caf5',
      black: '#15161e',
      red: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      blue: '#7aa2f7',
      magenta: '#bb9af7',
      cyan: '#7dcfff',
      white: '#a9b1d6',
      brightBlack: '#414868',
      brightRed: '#f7768e',
      brightGreen: '#9ece6a',
      brightYellow: '#e0af68',
      brightBlue: '#7aa2f7',
      brightMagenta: '#bb9af7',
      brightCyan: '#7dcfff',
      brightWhite: '#c0caf5'
    }
  }
};

// ========== AUTH ==========

// Modal show/hide helpers
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
  setTimeout(() => {
    const content = modal.querySelector('[id*="modal-content"], .bg-dark-300');
    if (content) {
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    }
  }, 10);
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  const content = modal.querySelector('[id*="modal-content"], .bg-dark-300');
  if (content) {
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
  }
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

function showStatus(message, className, showSpinner) {
  const statusBar = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  
  if (!statusBar || !statusText) {
    console.warn('Status bar elements not found');
    return;
  }
  
  statusText.textContent = message;
  
  // Remove all status classes
  statusBar.classList.remove('bg-dark-300', 'bg-blue-900/50', 'bg-green-900/50', 'bg-red-900/50', 'bg-orange-900/50');
  statusBar.classList.remove('text-gray-300', 'text-blue-400', 'text-green-400', 'text-red-400', 'text-orange-400');
  
  // Add appropriate classes based on status
  if (className === 'connecting') {
    statusBar.classList.add('bg-blue-900/50', 'text-blue-400', 'border-blue-500/30');
  } else if (className === 'connected') {
    statusBar.classList.add('bg-green-900/50', 'text-green-400', 'border-green-500/30');
  } else if (className === 'error') {
    statusBar.classList.add('bg-red-900/50', 'text-red-400', 'border-red-500/30');
  } else if (className === 'disconnected') {
    statusBar.classList.add('bg-orange-900/50', 'text-orange-400', 'border-orange-500/30');
  } else {
    statusBar.classList.add('bg-dark-300', 'text-gray-300');
  }
  
  const spinner = document.getElementById('status-spinner');
  if (spinner) {
    if (showSpinner) {
      spinner.classList.remove('hidden');
    } else {
      spinner.classList.add('hidden');
    }
  }
}

// Tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const tabName = tab.dataset.tab;
    document.getElementById('login-form').style.display = tabName === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tabName === 'register' ? 'block' : 'none';
    document.getElementById('auth-error').classList.add('hidden');
  });
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('login-username').value,
        password: document.getElementById('login-password').value
      })
    });
    const data = await res.json();
    if (res.ok) {
      currentUser = data.username;
      showApp();
    } else {
      showAuthError(data.error);
    }
  } catch (err) {
    showAuthError('Login failed');
  }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('register-username').value,
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value
      })
    });
    const data = await res.json();
    if (res.ok) {
      currentUser = data.username;
      showApp();
    } else {
      showAuthError(data.error);
    }
  } catch (err) {
    showAuthError('Registration failed');
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
});

function showAuthError(message) {
  const errorEl = document.getElementById('auth-error');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('app').classList.add('flex');
  loadUserProfile();
  loadConnections();
  loadKeys();
}

async function loadUserProfile() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const user = await res.json();
      currentUser = user.username;
      userTheme = user.theme || 'default';
      document.getElementById('current-user').textContent = currentUser;
    }
  } catch (err) {
    console.error('Error loading user profile:', err);
  }
}

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.username;
      showApp();
    }
  } catch (err) {
    console.log('Not authenticated');
  }
}

// ========== CONNECTIONS ==========

async function loadConnections() {
  try {
    const res = await fetch('/api/connections');
    if (!res.ok) {
      throw new Error(`Failed to load connections: ${res.status}`);
    }
    const connections = await res.json();
    renderConnections(connections);
  } catch (err) {
    console.error('Error loading connections:', err);
    showStatus('Failed to load connections', 'error', false);
  }
}

function renderConnections(connections) {
  const container = document.getElementById('connections');
  const colors = [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE',
    '#30B0C7', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55',
    '#FF6B35', '#4ECDC4', '#45B7D1', '#F9CA24', '#00D9FF',
    '#FF1744', '#D500F9', '#651FFF', '#00E676', '#FFEA00'
  ];

  container.innerHTML = '';
  connections.forEach((conn, index) => {
    // Check if connection has any active tabs
    const hasActiveTabs = Array.from(tabs.values()).some(tab => tab.connectionId === conn.id);
    const accentColor = colors[index % colors.length];
    const icons = ['computer', 'dns', 'cloud', 'bolt', 'storage', 'rocket_launch', 'diamond', 'adjust', 'router', 'shield'];
    const icon = icons[conn.name.length % icons.length];

    const div = document.createElement('div');
    div.className = 'group relative bg-gradient-to-br from-dark-200 to-dark-300 rounded-2xl border border-dark-100/50 hover:border-primary/30 p-4 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5';
    div.style.setProperty('--accent-color', accentColor);

    div.innerHTML = `
      <div class="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style="background: ${accentColor}"></div>
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0" style="background: ${accentColor}"><span class="material-icons text-2xl text-white">${icon}</span></div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-white text-sm mb-1 truncate">${conn.name}</div>
          <div class="text-xs text-gray-400 font-mono truncate">${conn.username}@${conn.host}:${conn.port}</div>
          ${conn.description ? `<div class="text-xs text-gray-500 mt-1 truncate italic">${conn.description}</div>` : ''}
        </div>
        ${hasActiveTabs ? '<span class="absolute top-3 right-3 px-2 py-1 bg-primary/20 border border-primary/30 rounded-full text-primary text-xs font-semibold uppercase">Live</span>' : ''}
      </div>
      <div class="absolute right-3 bottom-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="icon-btn connect w-8 h-8 rounded-lg backdrop-blur-sm bg-primary/20 border border-primary/30 text-primary flex items-center justify-center transition-all hover:scale-110" data-id="${conn.id}" title="Connect in New Tab"><span class="material-icons text-sm">play_arrow</span></button>
        <button class="icon-btn edit w-8 h-8 rounded-lg backdrop-blur-sm bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 flex items-center justify-center transition-all hover:scale-110" data-id="${conn.id}" title="Edit"><span class="material-icons text-sm">edit</span></button>
        <button class="icon-btn delete w-8 h-8 rounded-lg backdrop-blur-sm bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center transition-all hover:scale-110" data-id="${conn.id}" title="Delete"><span class="material-icons text-sm">delete</span></button>
      </div>
    `;
    container.appendChild(div);
  });

  // Event handlers
  container.querySelectorAll('.group').forEach((el, idx) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.icon-btn')) return;
      const conn = connections[idx];
      connectSSH(conn);
    });
  });

  container.querySelectorAll('.icon-btn.connect').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const conn = connections.find(c => c.id == btn.dataset.id);
      connectSSH(conn);
    });
  });

  container.querySelectorAll('.icon-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const conn = connections.find(c => c.id == btn.dataset.id);
      editConnection(conn);
    });
  });

  container.querySelectorAll('.icon-btn.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Delete this connection?')) {
        try {
          const res = await fetch(`/api/connections/${btn.dataset.id}`, { method: 'DELETE' });
          if (!res.ok) {
            throw new Error('Failed to delete connection');
          }
          loadConnections();
        } catch (err) {
          console.error('Error deleting connection:', err);
          alert('Failed to delete connection');
        }
      }
    });
  });
}

// ========== TERMINAL & TABS ==========

function createTab(connectionId, connectionName) {
  const tabId = nextTabId++;

  // Create terminal container
  const terminalContainer = document.createElement('div');
  terminalContainer.id = `terminal-${tabId}`;
  terminalContainer.className = 'absolute inset-0 p-6 hidden';
  document.getElementById('terminals-container').appendChild(terminalContainer);

  // Create terminal element
  const terminalEl = document.createElement('div');
  terminalEl.className = 'w-full h-full';
  terminalContainer.appendChild(terminalEl);

  // Get user's theme
  const selectedTheme = terminalThemes[userTheme] || terminalThemes['default'];

  // Initialize terminal with user's theme
  const terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: selectedTheme.theme
  });

  const fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(terminalEl);

  setTimeout(() => {
    try {
      fitAddon.fit();
    } catch (err) {
      console.error('Error fitting terminal:', err);
    }
  }, 50);

  // Store tab
  tabs.set(tabId, {
    terminal,
    fitAddon,
    ws: null,
    connectionId,
    connectionName,
    container: terminalContainer
  });

  return tabId;
}

function createTabUI(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  const tabsBar = document.getElementById('tabs-bar');
  const tabEl = document.createElement('div');
  tabEl.id = `tab-${tabId}`;
  tabEl.className = 'flex items-center gap-2 px-4 py-2 bg-dark-200 hover:bg-dark-100 rounded-lg cursor-pointer transition-all text-sm min-w-fit';
  tabEl.innerHTML = `
    <span class="text-gray-300">${tab.connectionName}</span>
    <button class="close-tab hover:text-red-400 transition-colors material-icons text-sm" data-tab-id="${tabId}" title="Close">close</button>
  `;

  tabEl.addEventListener('click', (e) => {
    if (!e.target.classList.contains('close-tab')) {
      switchTab(tabId);
    }
  });

  tabEl.querySelector('.close-tab').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });

  tabsBar.appendChild(tabEl);
  tabsBar.classList.remove('hidden');

  // Show terminals container
  document.getElementById('terminals-container').classList.remove('hidden');
  document.getElementById('welcome').classList.add('hidden');
}

function switchTab(tabId) {
  // Hide all terminals
  tabs.forEach((tab, id) => {
    tab.container.classList.add('hidden');
    const tabEl = document.getElementById(`tab-${id}`);
    if (tabEl) {
      tabEl.classList.remove('bg-primary/20', 'border', 'border-primary/30');
      tabEl.classList.add('bg-dark-200');
    }
  });

  // Show selected terminal
  const tab = tabs.get(tabId);
  if (tab) {
    tab.container.classList.remove('hidden');
    const tabEl = document.getElementById(`tab-${tabId}`);
    if (tabEl) {
      tabEl.classList.add('bg-primary/20', 'border', 'border-primary/30');
      tabEl.classList.remove('bg-dark-200');
    }

    // Refit terminal
    setTimeout(() => {
      try {
        tab.fitAddon.fit();
        // Send resize to server
        if (tab.ws && tab.ws.readyState === WebSocket.OPEN) {
          tab.ws.send(JSON.stringify({
            type: 'resize',
            rows: tab.terminal.rows,
            cols: tab.terminal.cols
          }));
        }
      } catch (err) {
        console.error('Error refitting terminal:', err);
      }
    }, 50);

    activeTabId = tabId;
  }
}

function closeTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  // Close WebSocket
  if (tab.ws) {
    tab.ws.close();
  }

  // Dispose terminal
  if (tab.terminal) {
    tab.terminal.dispose();
  }

  // Remove DOM elements
  const tabEl = document.getElementById(`tab-${tabId}`);
  if (tabEl) tabEl.remove();

  if (tab.container) {
    tab.container.remove();
  }

  // Remove from tabs map
  tabs.delete(tabId);

  // Update UI if no more tabs
  if (tabs.size === 0) {
    document.getElementById('tabs-bar').classList.add('hidden');
    document.getElementById('terminals-container').classList.add('hidden');
    document.getElementById('welcome').classList.remove('hidden');
    activeTabId = null;
  } else if (activeTabId === tabId) {
    // Switch to last tab
    const lastTabId = Array.from(tabs.keys()).pop();
    switchTab(lastTabId);
  }

  // Refresh connections list
  loadConnections();
}

// Window resize handler for all tabs
window.addEventListener('resize', () => {
  if (activeTabId) {
    const tab = tabs.get(activeTabId);
    if (tab && tab.fitAddon && tab.terminal) {
      tab.fitAddon.fit();
      if (tab.ws && tab.ws.readyState === WebSocket.OPEN) {
        tab.ws.send(JSON.stringify({
          type: 'resize',
          rows: tab.terminal.rows,
          cols: tab.terminal.cols
        }));
      }
    }
  }
});

function connectSSH(conn) {
  // Create new tab
  const tabId = createTab(conn.id, conn.name);
  createTabUI(tabId);
  switchTab(tabId);

  const tab = tabs.get(tabId);
  if (!tab) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);

  tab.ws = ws;

  ws.onopen = () => {
    console.log('WebSocket opened for tab', tabId);
    ws.send(JSON.stringify({ type: 'connect', connectionId: conn.id }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const currentTab = tabs.get(tabId);
    if (!currentTab) return;

    if (msg.type === 'data') {
      if (currentTab.terminal) {
        currentTab.terminal.write(msg.data);
      }
    } else if (msg.type === 'status') {
      console.log('Status:', msg.message);
    } else if (msg.type === 'error') {
      console.error('SSH Error:', msg.message);
      currentTab.terminal.write(`\r\n\x1b[31mError: ${msg.message}\x1b[0m\r\n`);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket error for tab', tabId, err);
    const currentTab = tabs.get(tabId);
    if (currentTab && currentTab.terminal) {
      currentTab.terminal.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
    }
  };

  ws.onclose = () => {
    console.log('WebSocket closed for tab', tabId);
    const currentTab = tabs.get(tabId);
    if (currentTab) {
      currentTab.ws = null;
    }
  };

  // Add terminal input handler
  setTimeout(() => {
    const currentTab = tabs.get(tabId);
    if (currentTab && currentTab.terminal) {
      currentTab.terminal.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });
    }
  }, 200);

  // Refresh connections list
  loadConnections();
}

// ========== CONNECTION MODALS ==========

document.getElementById('add-connection-btn').addEventListener('click', () => {
  document.getElementById('modal-title').textContent = 'New SSH Connection';
  document.getElementById('conn-id').value = '';
  document.getElementById('connection-form').reset();
  document.querySelector('input[name="auth-type"][value="password"]').checked = true;
  document.getElementById('password-group').style.display = 'block';
  document.getElementById('key-group').style.display = 'none';
  updateKeyDropdown();
  showModal('connection-modal');
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  hideModal('connection-modal');
});

function editConnection(conn) {
  document.getElementById('modal-title').textContent = 'Edit SSH Connection';
  document.getElementById('conn-id').value = conn.id;
  document.getElementById('conn-name').value = conn.name;
  document.getElementById('conn-host').value = conn.host;
  document.getElementById('conn-port').value = conn.port;
  document.getElementById('conn-username').value = conn.username;
  document.getElementById('conn-description').value = conn.description || '';
  document.getElementById('conn-password').value = '';
  const authType = conn.auth_type || 'password';
  document.querySelector(`input[name="auth-type"][value="${authType}"]`).checked = true;
  document.getElementById('password-group').style.display = authType === 'password' ? 'block' : 'none';
  document.getElementById('key-group').style.display = authType === 'key' ? 'block' : 'none';
  if (authType === 'key' && conn.key_id) {
    document.getElementById('conn-key-id').value = conn.key_id;
  }
  updateKeyDropdown();
  showModal('connection-modal');
}

document.getElementById('connection-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const connId = document.getElementById('conn-id').value;
  const authType = document.querySelector('input[name="auth-type"]:checked').value;
  const data = {
    name: document.getElementById('conn-name').value,
    host: document.getElementById('conn-host').value,
    port: parseInt(document.getElementById('conn-port').value),
    username: document.getElementById('conn-username').value,
    description: document.getElementById('conn-description').value,
    auth_type: authType
  };

  if (authType === 'password') {
    data.password = document.getElementById('conn-password').value;
    data.key_id = null;
  } else {
    const keyId = document.getElementById('conn-key-id').value;
    if (!keyId && !connId) {
      alert('Please select an SSH key');
      return;
    }
    data.key_id = keyId ? parseInt(keyId) : null;
    data.password = null;
  }

  try {
    let res;
    if (connId) {
      res = await fetch(`/api/connections/${connId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save connection');
    }

    hideModal('connection-modal');
    loadConnections();
  } catch (err) {
    console.error('Error saving connection:', err);
    alert(err.message);
  }
});

// Auth type toggle
document.querySelectorAll('input[name="auth-type"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const isPassword = e.target.value === 'password';
    document.getElementById('password-group').style.display = isPassword ? 'block' : 'none';
    document.getElementById('key-group').style.display = isPassword ? 'none' : 'block';
  });
});

// ========== SSH KEYS MANAGEMENT ==========

async function loadKeys() {
  try {
    const res = await fetch('/api/keys');
    if (!res.ok) {
      throw new Error(`Failed to load keys: ${res.status}`);
    }
    sshKeys = await res.json();
    renderKeysList();
    updateKeyDropdown();
  } catch (err) {
    console.error('Error loading SSH keys:', err);
  }
}

function renderKeysList() {
  const container = document.getElementById('keys-list');
  if (!container) return;
  if (sshKeys.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-400 py-16"><span class="material-icons text-6xl mb-4 text-gray-500">vpn_key</span><p class="text-lg">No SSH keys yet</p><p class="text-sm mt-2">Add one to get started!</p></div>';
    return;
  }
  container.innerHTML = sshKeys.map(key => `
    <div class="group bg-dark-200/50 backdrop-blur-sm border border-dark-100/50 hover:border-primary/30 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-primary/10">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-icons text-2xl text-primary">vpn_key</span>
            <span class="font-semibold text-primary">${key.name}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-400 mb-2">
            <span class="px-2 py-1 bg-primary/10 border border-primary/20 rounded-md font-mono">${key.key_type.toUpperCase()}</span>
            <span>Created ${new Date(key.created_at).toLocaleDateString()}</span>
          </div>
          <div class="text-xs text-gray-500">
            ${key.usage_count > 0 ? `Used in <span class="text-primary font-semibold">${key.usage_count}</span> connection(s)` : 'Not used yet'}
          </div>
        </div>
        <button class="delete-key-btn opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold transition-all hover:scale-105" data-id="${key.id}">Delete</button>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('.delete-key-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const keyId = btn.dataset.id;
      const key = sshKeys.find(k => k.id == keyId);
      if (key.usage_count > 0) {
        alert(`Cannot delete key "${key.name}" - it's used in ${key.usage_count} connection(s)`);
        return;
      }
      if (confirm(`Delete SSH key "${key.name}"?`)) {
        try {
          const res = await fetch(`/api/keys/${keyId}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete key');
          }
          loadKeys();
        } catch (err) {
          console.error('Error deleting SSH key:', err);
          alert(err.message);
        }
      }
    });
  });
}

function updateKeyDropdown() {
  const select = document.getElementById('conn-key-id');
  if (!select) return;
  select.innerHTML = '<option value="">-- Select a key --</option>' +
    sshKeys.map(key => `<option value="${key.id}">${key.name} (${key.key_type.toUpperCase()})</option>`).join('');
}

// Keys modal handlers
document.getElementById('keys-btn').addEventListener('click', () => {
  showModal('keys-modal');
  loadKeys();
});

document.getElementById('close-keys-btn').addEventListener('click', () => {
  hideModal('keys-modal');
});

document.getElementById('add-key-btn').addEventListener('click', () => {
  hideModal('keys-modal');
  showModal('add-key-modal');
});

document.getElementById('add-key-link').addEventListener('click', (e) => {
  e.preventDefault();
  hideModal('connection-modal');
  showModal('add-key-modal');
});

document.getElementById('cancel-key-btn').addEventListener('click', () => {
  hideModal('add-key-modal');
  document.getElementById('add-key-form').reset();
});

// File upload
document.getElementById('key-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const text = await file.text();
    document.getElementById('key-private').value = text;
  }
});

// Add key form
document.getElementById('add-key-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const keyData = {
    name: document.getElementById('key-name').value,
    private_key: document.getElementById('key-private').value,
    passphrase: document.getElementById('key-passphrase').value,
    key_type: document.getElementById('key-type').value
  };
  try {
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keyData)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to add SSH key');
    }

    hideModal('add-key-modal');
    document.getElementById('add-key-form').reset();
    loadKeys();
    alert('SSH key added successfully!');
  } catch (err) {
    console.error('Error adding SSH key:', err);
    alert(err.message);
  }
});

// ========== PROFILE MANAGEMENT ==========

// Profile modal handlers
document.getElementById('current-user').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const user = await res.json();
      document.getElementById('profile-username').value = user.username;
      document.getElementById('profile-email').value = user.email || '';
      document.getElementById('profile-theme').value = user.theme || 'default';
      document.getElementById('profile-current-password').value = '';
      document.getElementById('profile-new-password').value = '';
      document.getElementById('profile-error').classList.add('hidden');
      document.getElementById('profile-success').classList.add('hidden');
      showModal('profile-modal');
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
});

document.getElementById('cancel-profile-btn').addEventListener('click', () => {
  hideModal('profile-modal');
});

document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const errorEl = document.getElementById('profile-error');
  const successEl = document.getElementById('profile-success');
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  const username = document.getElementById('profile-username').value;
  const email = document.getElementById('profile-email').value;
  const theme = document.getElementById('profile-theme').value;
  const currentPassword = document.getElementById('profile-current-password').value;
  const newPassword = document.getElementById('profile-new-password').value;

  // Validation
  if (newPassword && !currentPassword) {
    errorEl.textContent = 'Please enter your current password to change password';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, theme, currentPassword, newPassword })
    });

    const data = await res.json();

    if (res.ok) {
      successEl.textContent = 'Profile updated successfully!';
      successEl.classList.remove('hidden');
      currentUser = data.user.username;
      userTheme = data.user.theme || 'default';
      document.getElementById('current-user').textContent = currentUser;

      // Clear password fields
      document.getElementById('profile-current-password').value = '';
      document.getElementById('profile-new-password').value = '';

      setTimeout(() => {
        hideModal('profile-modal');
        successEl.classList.add('hidden');
      }, 2000);
    } else {
      errorEl.textContent = data.error || 'Failed to update profile';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error updating profile:', err);
    errorEl.textContent = 'Failed to update profile';
    errorEl.classList.remove('hidden');
  }
});

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAuth);
} else {
  checkAuth();
}