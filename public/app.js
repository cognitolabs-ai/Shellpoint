// Global state
let currentUser = null;
let sshKeys = [];
let codeSnippets = [];
let nextTabId = 1;
let activeTabId = null;
let userTheme = 'default';
let snippetDropdownVisible = false;
let snippetDropdownTabId = null;
let snippetFilter = 'bash'; // 'bash' or 'all'
let splitMode = false; // Split mode active
let splitLayout = 1; // 1, 2, or 4 terminals
let splitTerminals = []; // Array of tabIds currently displayed
let tabActivityOrder = []; // Track tab access order (newest first)
let separatorPosition = { horizontal: 50, vertical: 50 }; // Percentage positions

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
  loadSnippets();
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
    <button class="run-snippet-btn material-icons text-sm text-primary hover:text-primary-light transition-colors"
            data-tab-id="${tabId}"
            title="Run Snippet">
      play_circle
    </button>
    <button class="close-tab hover:text-red-400 transition-colors material-icons text-sm" data-tab-id="${tabId}" title="Close">close</button>
  `;

  tabEl.addEventListener('click', (e) => {
    if (!e.target.classList.contains('close-tab') && !e.target.classList.contains('run-snippet-btn')) {
      if (splitMode) {
        handleTabClickInSplitMode(tabId);
      } else {
        switchTab(tabId);
      }
    }
  });

  tabEl.querySelector('.run-snippet-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    showSnippetDropdown(tabId, e.target);
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

  // Update split icon visibility
  updateSplitIcon();
}

function switchTab(tabId) {
  // Track activity order
  updateTabActivity(tabId);

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

function updateTabActivity(tabId) {
  // Remove if already in array
  tabActivityOrder = tabActivityOrder.filter(id => id !== tabId);
  // Add to front (most recent)
  tabActivityOrder.unshift(tabId);

  // Keep only existing tabs
  tabActivityOrder = tabActivityOrder.filter(id => tabs.has(id));
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

  // Exit split mode if closed tab is displayed
  if (splitMode && splitTerminals.includes(tabId)) {
    exitSplitMode();
  }

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

  // Update split icon visibility
  updateSplitIcon();

  // Refresh connections list
  loadConnections();
}

// Window resize handler for all tabs
window.addEventListener('resize', () => {
  if (splitMode) {
    // In split mode, resize all visible terminals
    updateTerminalSizes();
  } else if (activeTabId) {
    // Single terminal mode
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
  // Route to appropriate connection handler based on type
  if (conn.connection_type === 'sftp') {
    connectSFTP(conn);
  } else {
    connectSSHTerminal(conn);
  }
}

function connectSSHTerminal(conn) {
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

// ========== SFTP FILE MANAGER ==========

function connectSFTP(conn) {
  // Create SFTP tab
  const tabId = createSFTPTab(conn.id, conn.name, conn.initial_path);
  createTabUI(tabId);
  switchTab(tabId);

  const tab = tabs.get(tabId);
  if (!tab) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);

  tab.ws = ws;
  tab.localPath = '/';
  tab.remotePath = conn.initial_path || '.';
  tab.localFiles = [];
  tab.remoteFiles = [];

  ws.onopen = () => {
    console.log('WebSocket opened for SFTP tab', tabId);
    ws.send(JSON.stringify({ type: 'connect', connectionId: conn.id }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const currentTab = tabs.get(tabId);
    if (!currentTab) return;

    if (msg.type === 'sftp-list') {
      currentTab.remoteFiles = msg.files;
      currentTab.remotePath = msg.path;
      renderRemoteFiles(tabId);
    } else if (msg.type === 'sftp-download') {
      handleSFTPDownload(tabId, msg);
      showToast('File downloaded successfully', 'success');
    } else if (msg.type === 'sftp-upload') {
      console.log('File uploaded successfully');
      showToast('File uploaded successfully', 'success');
      refreshRemoteFiles(tabId);
    } else if (msg.type === 'sftp-delete') {
      showToast('Deleted successfully', 'success');
      refreshRemoteFiles(tabId);
    } else if (msg.type === 'sftp-rename') {
      showToast('Renamed successfully', 'success');
      refreshRemoteFiles(tabId);
    } else if (msg.type === 'sftp-mkdir') {
      showToast('Folder created successfully', 'success');
      refreshRemoteFiles(tabId);
    } else if (msg.type === 'sftp-chmod') {
      showToast('Permissions updated successfully', 'success');
      refreshRemoteFiles(tabId);
    } else if (msg.type === 'sftp-read') {
      handleSFTPRead(tabId, msg);
    } else if (msg.type === 'sftp-error') {
      showToast(`SFTP Error: ${msg.message}`, 'error');
    } else if (msg.type === 'status') {
      console.log('SFTP Status:', msg.message);
      // Initialize local files array as empty
      if (msg.message === 'Connected') {
        renderLocalFiles(tabId);
      }
    } else if (msg.type === 'error') {
      console.error('SFTP Error:', msg.message);
      alert(`Connection error: ${msg.message}`);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket error for SFTP tab', tabId, err);
    alert('SFTP connection error');
  };

  ws.onclose = () => {
    console.log('WebSocket closed for SFTP tab', tabId);
    const currentTab = tabs.get(tabId);
    if (currentTab) {
      currentTab.ws = null;
    }
  };

  // Refresh connections list
  loadConnections();
}

function createSFTPTab(connectionId, connectionName, initialPath) {
  const tabId = nextTabId++;

  // Create SFTP container
  const sftpContainer = document.createElement('div');
  sftpContainer.id = `sftp-${tabId}`;
  sftpContainer.className = 'absolute inset-0 hidden bg-dark-400';

  // Dual-pane layout
  sftpContainer.innerHTML = `
    <div class="h-full flex gap-4 p-4">
      <!-- Local Files Panel -->
      <div class="flex-1 flex flex-col bg-dark-300 rounded-xl border border-dark-100">
        <div class="p-4 border-b border-dark-100 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-primary flex items-center gap-2">
              <span class="material-icons">computer</span>
              Local Files
            </h3>
            <div id="local-breadcrumb-${tabId}" class="text-xs text-gray-400 mt-1">/</div>
          </div>
          <div class="flex gap-2">
            <button class="local-upload-btn px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-lg text-sm font-semibold transition-all" data-tab-id="${tabId}">
              <span class="material-icons text-sm">upload_file</span> Upload
            </button>
            <button class="local-mkdir-btn px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg text-sm font-semibold transition-all" data-tab-id="${tabId}">
              <span class="material-icons text-sm">create_new_folder</span> New Folder
            </button>
          </div>
        </div>
        <div id="local-files-${tabId}" class="flex-1 overflow-y-auto p-4">
          <div class="text-center text-gray-500 py-8">Loading...</div>
        </div>
      </div>

      <!-- Remote Files Panel -->
      <div class="flex-1 flex flex-col bg-dark-300 rounded-xl border border-dark-100">
        <div class="p-4 border-b border-dark-100 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-primary flex items-center gap-2">
              <span class="material-icons">cloud</span>
              Remote Files (${connectionName})
            </h3>
            <div id="remote-breadcrumb-${tabId}" class="text-xs text-gray-400 mt-1">${initialPath || '.'}</div>
          </div>
          <div class="flex gap-2">
            <button class="remote-upload-btn px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-lg text-sm font-semibold transition-all" data-tab-id="${tabId}">
              <span class="material-icons text-sm">upload</span> Upload from Local
            </button>
            <button class="remote-mkdir-btn px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg text-sm font-semibold transition-all" data-tab-id="${tabId}">
              <span class="material-icons text-sm">create_new_folder</span> New Folder
            </button>
          </div>
        </div>
        <div id="remote-files-${tabId}" class="flex-1 overflow-y-auto p-4">
          <div class="text-center text-gray-500 py-8">Connecting...</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('terminals-container').appendChild(sftpContainer);

  // Store tab info
  tabs.set(tabId, {
    type: 'sftp',
    ws: null,
    connectionId,
    connectionName,
    container: sftpContainer,
    localPath: '/',
    remotePath: initialPath || '.',
    localFiles: [],
    remoteFiles: []
  });

  // Attach event listeners
  setTimeout(() => {
    const uploadBtn = sftpContainer.querySelector('.local-upload-btn');
    const mkdirBtn = sftpContainer.querySelector('.local-mkdir-btn');
    const remoteUploadBtn = sftpContainer.querySelector('.remote-upload-btn');
    const remoteMkdirBtn = sftpContainer.querySelector('.remote-mkdir-btn');

    if (uploadBtn) uploadBtn.addEventListener('click', () => uploadLocalFile(tabId));
    if (mkdirBtn) mkdirBtn.addEventListener('click', () => createLocalFolder(tabId));
    if (remoteUploadBtn) remoteUploadBtn.addEventListener('click', () => uploadToRemote(tabId));
    if (remoteMkdirBtn) remoteMkdirBtn.addEventListener('click', () => createRemoteFolder(tabId));
  }, 100);

  return tabId;
}

// loadLocalFiles() removed - local files are now managed as File objects in browser

function refreshRemoteFiles(tabId) {
  const tab = tabs.get(tabId);
  if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) return;

  tab.ws.send(JSON.stringify({
    type: 'sftp-list',
    path: tab.remotePath
  }));
}

function renderLocalFiles(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  const container = document.getElementById(`local-files-${tabId}`);
  const breadcrumb = document.getElementById(`local-breadcrumb-${tabId}`);

  if (!container) return;

  // Update breadcrumb to show "My Computer"
  if (breadcrumb) {
    breadcrumb.textContent = 'My Computer';
  }

  if (tab.localFiles.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500 py-8">Click "Upload" to add files from your computer</div>';
    return;
  }

  // Render file table (File objects)
  const filesHTML = tab.localFiles.map((file, index) => {
    const icon = 'insert_drive_file';
    const color = 'text-gray-400';
    const size = formatFileSize(file.size);

    return `
      <div class="file-item group flex items-center gap-3 p-3 rounded-lg hover:bg-dark-200 cursor-pointer transition-all border border-transparent hover:border-primary/30"
           data-file-index="${index}" data-file-name="${file.name}">
        <span class="material-icons ${color}">${icon}</span>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-gray-200 truncate">${file.name}</div>
          <div class="text-xs text-gray-500">${size}</div>
        </div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="local-edit-btn p-1.5 hover:bg-green-500/20 rounded" data-file-index="${index}" data-file-name="${file.name}" title="Edit">
            <span class="material-icons text-sm text-green-400">edit</span>
          </button>
          <button class="local-download-btn p-1.5 hover:bg-primary/20 rounded" data-file-index="${index}" title="Download">
            <span class="material-icons text-sm text-primary">download</span>
          </button>
          <button class="local-delete-btn p-1.5 hover:bg-red-500/20 rounded" data-file-index="${index}" title="Delete">
            <span class="material-icons text-sm text-red-400">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = filesHTML;

  // Attach event listeners
  container.querySelectorAll('.local-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editLocalFile(tabId, parseInt(btn.dataset.fileIndex), btn.dataset.fileName);
    });
  });

  container.querySelectorAll('.local-download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadLocalFile(tabId, parseInt(btn.dataset.fileIndex));
    });
  });

  container.querySelectorAll('.local-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLocalFile(tabId, parseInt(btn.dataset.fileIndex));
    });
  });
}

function renderRemoteFiles(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  const container = document.getElementById(`remote-files-${tabId}`);
  const breadcrumb = document.getElementById(`remote-breadcrumb-${tabId}`);

  if (!container) return;

  // Update breadcrumb with clickable navigation
  if (breadcrumb) {
    renderRemoteBreadcrumb(tabId);
  }

  if (tab.remoteFiles.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500 py-8">No files</div>';
    return;
  }

  // Render file table
  const filesHTML = tab.remoteFiles.map(file => {
    const icon = file.type === 'directory' ? 'folder' : 'insert_drive_file';
    const color = file.type === 'directory' ? 'text-yellow-400' : 'text-gray-400';
    const size = file.type === 'directory' ? '-' : formatFileSize(file.size);

    return `
      <div class="file-item group flex items-center gap-3 p-3 rounded-lg hover:bg-dark-200 cursor-pointer transition-all border border-transparent hover:border-primary/30"
           data-file-name="${file.name}" data-file-type="${file.type}">
        <span class="material-icons ${color}">${icon}</span>
        <div class="flex-1 min-w-0">
          <div class="text-sm text-gray-200 truncate">${file.name}</div>
          <div class="text-xs text-gray-500">${size}</div>
        </div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="remote-edit-btn p-1.5 hover:bg-green-500/20 rounded" data-file-name="${file.name}" title="Edit">
            <span class="material-icons text-sm text-green-400">edit</span>
          </button>
          <button class="remote-chmod-btn p-1.5 hover:bg-yellow-500/20 rounded" data-file-name="${file.name}" data-permissions="${file.permissions || 0}" title="Permissions">
            <span class="material-icons text-sm text-yellow-400">lock</span>
          </button>
          <button class="remote-download-btn p-1.5 hover:bg-primary/20 rounded" data-file-name="${file.name}" title="Download">
            <span class="material-icons text-sm text-primary">download</span>
          </button>
          <button class="remote-delete-btn p-1.5 hover:bg-red-500/20 rounded" data-file-name="${file.name}" data-is-dir="${file.type === 'directory'}" title="Delete">
            <span class="material-icons text-sm text-red-400">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = filesHTML;

  // Attach event listeners
  container.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('dblclick', () => {
      const fileType = item.dataset.fileType;
      const fileName = item.dataset.fileName;
      if (fileType === 'directory') {
        navigateRemoteFolder(tabId, fileName);
      }
    });
  });

  container.querySelectorAll('.remote-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editRemoteFile(tabId, btn.dataset.fileName);
    });
  });

  container.querySelectorAll('.remote-chmod-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      chmodRemoteFile(tabId, btn.dataset.fileName, parseInt(btn.dataset.permissions));
    });
  });

  container.querySelectorAll('.remote-download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadRemoteFile(tabId, btn.dataset.fileName);
    });
  });

  container.querySelectorAll('.remote-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRemoteFile(tabId, btn.dataset.fileName, btn.dataset.isDir === 'true');
    });
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// renderLocalBreadcrumb() removed - breadcrumb now shows "My Computer"

function renderRemoteBreadcrumb(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  const breadcrumb = document.getElementById(`remote-breadcrumb-${tabId}`);
  if (!breadcrumb) return;

  const path = tab.remotePath || '.';

  // Handle different path formats (., ./, /path, path)
  let normalizedPath = path;
  if (path === '.' || path === './') {
    normalizedPath = '.';
  }

  const parts = normalizedPath.split('/').filter(p => p && p !== '.');

  // Build breadcrumb HTML with clickable segments
  let breadcrumbHTML = `<span class="breadcrumb-segment cursor-pointer hover:text-primary transition-colors" data-path=".">Home</span>`;

  let currentPath = '.';
  parts.forEach((part, index) => {
    currentPath = currentPath === '.' ? part : `${currentPath}/${part}`;
    breadcrumbHTML += ` <span class="text-gray-600">/</span> <span class="breadcrumb-segment cursor-pointer hover:text-primary transition-colors" data-path="${currentPath}">${part}</span>`;
  });

  breadcrumb.innerHTML = breadcrumbHTML;

  // Attach click handlers
  breadcrumb.querySelectorAll('.breadcrumb-segment').forEach(segment => {
    segment.addEventListener('click', () => {
      const targetPath = segment.dataset.path;
      tab.remotePath = targetPath;
      refreshRemoteFiles(tabId);
    });
  });
}

// navigateLocalFolder() removed - local files don't support folder navigation

function navigateRemoteFolder(tabId, folderName) {
  const tab = tabs.get(tabId);
  if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) return;

  // Update path
  tab.remotePath = `${tab.remotePath}/${folderName}`;

  tab.ws.send(JSON.stringify({
    type: 'sftp-list',
    path: tab.remotePath
  }));
}

async function uploadLocalFile(tabId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true; // Allow multiple file selection
  input.onchange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const tab = tabs.get(tabId);
    if (!tab) return;

    // Add files to local files array
    files.forEach(file => {
      // Check if file already exists
      const existingIndex = tab.localFiles.findIndex(f => f.name === file.name);
      if (existingIndex !== -1) {
        // Replace existing file
        tab.localFiles[existingIndex] = file;
      } else {
        // Add new file
        tab.localFiles.push(file);
      }
    });

    showToast(`Added ${files.length} file(s)`, 'success');
    renderLocalFiles(tabId);
  };
  input.click();
}

async function createLocalFolder(tabId) {
  // Local folders are not supported in browser file system
  showToast('Folders are not supported for local files. Only individual files can be uploaded.', 'info');
}

async function uploadToRemote(tabId) {
  const tab = tabs.get(tabId);
  if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) {
    showToast('SFTP connection not ready', 'error');
    return;
  }

  if (tab.localFiles.length === 0) {
    showToast('No local files available to upload', 'warning');
    return;
  }

  // Create a simple file selector
  const fileNames = tab.localFiles.map(f => f.name).join('\n');
  const selectedFileName = prompt(`Select a file to upload to remote:\n\n${fileNames}\n\nEnter file name:`);

  if (!selectedFileName) return;

  const selectedFile = tab.localFiles.find(f => f.name === selectedFileName);
  if (!selectedFile) {
    showToast(`File "${selectedFileName}" not found`, 'error');
    return;
  }

  try {
    showToast(`Uploading ${selectedFile.name}...`, 'info');

    // Convert File to base64
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64Content = reader.result.split(',')[1]; // Remove data:*/*;base64, prefix

      // Upload to remote SFTP server
      const remotePath = `${tab.remotePath}/${selectedFile.name}`;

      tab.ws.send(JSON.stringify({
        type: 'sftp-upload',
        path: remotePath,
        content: base64Content
      }));

      console.log(`Uploading ${selectedFile.name} to ${remotePath}`);
    };

    reader.readAsDataURL(selectedFile);
  } catch (err) {
    console.error('Upload error:', err);
    showToast(`Failed to upload: ${err.message}`, 'error');
  }
}

function createRemoteFolder(tabId) {
  const folderName = prompt('Enter folder name:');
  if (!folderName) return;

  const tab = tabs.get(tabId);
  if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) return;

  const remotePath = `${tab.remotePath}/${folderName}`;

  tab.ws.send(JSON.stringify({
    type: 'sftp-mkdir',
    path: remotePath
  }));
}

async function downloadLocalFile(tabId, fileIndex) {
  try {
    const tab = tabs.get(tabId);
    if (!tab) return;

    const file = tab.localFiles[fileIndex];
    if (!file) {
      showToast('File not found', 'error');
      return;
    }

    // Create download link
    const url = window.URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('File downloaded', 'success');
  } catch (err) {
    console.error('Download error:', err);
    showToast('Failed to download file', 'error');
  }
}

function downloadRemoteFile(tabId, fileName) {
  const tab = tabs.get(tabId);
  if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) return;

  const remotePath = `${tab.remotePath}/${fileName}`;

  tab.ws.send(JSON.stringify({
    type: 'sftp-download',
    path: remotePath
  }));
}

function handleSFTPDownload(tabId, msg) {
  try {
    // Decode base64 content
    const binaryString = atob(msg.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = msg.path.split('/').pop();
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download error:', err);
    alert('Failed to download file');
  }
}

async function deleteLocalFile(tabId, fileIndex) {
  if (!confirm('Remove this file from the list?')) return;

  try {
    const tab = tabs.get(tabId);
    if (!tab) return;

    // Remove file from array
    tab.localFiles.splice(fileIndex, 1);
    renderLocalFiles(tabId);
    showToast('File removed', 'success');
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Failed to remove file', 'error');
  }
}

function deleteRemoteFile(tabId, fileName, isDirectory) {
  if (!confirm(`Delete this ${isDirectory ? 'folder' : 'file'}?`)) return;

  const tab = tabs.get(tabId);
  if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) return;

  const remotePath = `${tab.remotePath}/${fileName}`;

  tab.ws.send(JSON.stringify({
    type: 'sftp-delete',
    path: remotePath,
    isDirectory: isDirectory
  }));
}

// ========== FILE EDITOR ==========

let currentEditContext = null; // Stores { type: 'local'|'remote', tabId, fileId, fileName, filePath }

async function editLocalFile(tabId, fileIndex, fileName) {
  try {
    const tab = tabs.get(tabId);
    if (!tab) return;

    const file = tab.localFiles[fileIndex];
    if (!file) {
      showToast('File not found', 'error');
      return;
    }

    // Read file content
    const text = await file.text();

    // Store edit context
    currentEditContext = {
      type: 'local',
      tabId: tabId,
      fileIndex: fileIndex,
      fileName: fileName
    };

    // Populate modal
    document.getElementById('file-editor-title').textContent = fileName;
    document.getElementById('file-editor-location').textContent = `Local: ${fileName}`;
    document.getElementById('file-editor-content').value = text;

    // Show modal
    showModal('file-editor-modal');
  } catch (err) {
    console.error('Edit error:', err);
    showToast(`Failed to open file: ${err.message}`, 'error');
  }
}

function editRemoteFile(tabId, fileName) {
  const tab = tabs.get(tabId);
  if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) {
    alert('SFTP connection not ready');
    return;
  }

  const remotePath = `${tab.remotePath}/${fileName}`;

  // Store edit context
  currentEditContext = {
    type: 'remote',
    tabId: tabId,
    fileName: fileName,
    filePath: remotePath
  };

  // Request file content from remote server
  tab.ws.send(JSON.stringify({
    type: 'sftp-read',
    path: remotePath
  }));

  // Show loading state
  document.getElementById('file-editor-title').textContent = fileName;
  document.getElementById('file-editor-location').textContent = `Remote: ${remotePath}`;
  document.getElementById('file-editor-content').value = 'Loading...';
  showModal('file-editor-modal');
}

function handleSFTPRead(tabId, msg) {
  if (!msg.success) {
    alert(`Failed to read file: ${msg.error || 'Unknown error'}`);
    hideModal('file-editor-modal');
    return;
  }

  try {
    // Decode base64 content to text
    const text = atob(msg.content);
    document.getElementById('file-editor-content').value = text;
  } catch (err) {
    console.error('Decode error:', err);
    alert('Failed to decode file content');
    hideModal('file-editor-modal');
  }
}

async function saveFileEdits() {
  if (!currentEditContext) return;

  const content = document.getElementById('file-editor-content').value;

  try {
    if (currentEditContext.type === 'local') {
      // Create new File object with updated content
      const tab = tabs.get(currentEditContext.tabId);
      if (!tab) return;

      const newFile = new File([content], currentEditContext.fileName, {
        type: 'text/plain'
      });

      // Replace file in array
      tab.localFiles[currentEditContext.fileIndex] = newFile;

      showToast('File saved successfully', 'success');
      renderLocalFiles(currentEditContext.tabId);
      hideModal('file-editor-modal');
      currentEditContext = null;

    } else if (currentEditContext.type === 'remote') {
      // Save to remote SFTP server
      const tab = tabs.get(currentEditContext.tabId);
      if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) {
        showToast('SFTP connection lost', 'error');
        return;
      }

      // Convert text content to base64
      const base64Content = btoa(content);

      tab.ws.send(JSON.stringify({
        type: 'sftp-upload',
        path: currentEditContext.filePath,
        content: base64Content
      }));

      showToast('Saving file...', 'info');
      // Refresh remote files
      refreshRemoteFiles(currentEditContext.tabId);
      hideModal('file-editor-modal');
      currentEditContext = null;
    }
  } catch (err) {
    console.error('Save error:', err);
    showToast(`Failed to save: ${err.message}`, 'error');
  }
}

// File editor modal event listeners
document.getElementById('close-editor-btn').addEventListener('click', () => {
  hideModal('file-editor-modal');
  currentEditContext = null;
});

document.getElementById('cancel-editor-btn').addEventListener('click', () => {
  hideModal('file-editor-modal');
  currentEditContext = null;
});

document.getElementById('save-editor-btn').addEventListener('click', () => {
  saveFileEdits();
});

// ========== CHMOD MODAL ==========

let currentChmodContext = null; // Stores { tabId, fileName, filePath }

function chmodRemoteFile(tabId, fileName, permissions) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  const remotePath = `${tab.remotePath}/${fileName}`;

  // Store chmod context
  currentChmodContext = {
    tabId: tabId,
    fileName: fileName,
    filePath: remotePath
  };

  // Set file name in modal
  document.getElementById('chmod-file-name').textContent = `File: ${remotePath}`;

  // Parse permissions from octal (permissions is a number like 33188 for 644)
  // Extract last 3 octal digits for user/group/others
  const mode = permissions & 0o777;

  // Owner permissions
  document.getElementById('chmod-owner-read').checked = (mode & 0o400) !== 0;
  document.getElementById('chmod-owner-write').checked = (mode & 0o200) !== 0;
  document.getElementById('chmod-owner-execute').checked = (mode & 0o100) !== 0;

  // Group permissions
  document.getElementById('chmod-group-read').checked = (mode & 0o040) !== 0;
  document.getElementById('chmod-group-write').checked = (mode & 0o020) !== 0;
  document.getElementById('chmod-group-execute').checked = (mode & 0o010) !== 0;

  // Others permissions
  document.getElementById('chmod-others-read').checked = (mode & 0o004) !== 0;
  document.getElementById('chmod-others-write').checked = (mode & 0o002) !== 0;
  document.getElementById('chmod-others-execute').checked = (mode & 0o001) !== 0;

  // Update octal display
  updateChmodOctal();

  // Show modal
  showModal('chmod-modal');
}

function updateChmodOctal() {
  let mode = 0;

  // Owner
  if (document.getElementById('chmod-owner-read').checked) mode += 0o400;
  if (document.getElementById('chmod-owner-write').checked) mode += 0o200;
  if (document.getElementById('chmod-owner-execute').checked) mode += 0o100;

  // Group
  if (document.getElementById('chmod-group-read').checked) mode += 0o040;
  if (document.getElementById('chmod-group-write').checked) mode += 0o020;
  if (document.getElementById('chmod-group-execute').checked) mode += 0o010;

  // Others
  if (document.getElementById('chmod-others-read').checked) mode += 0o004;
  if (document.getElementById('chmod-others-write').checked) mode += 0o002;
  if (document.getElementById('chmod-others-execute').checked) mode += 0o001;

  // Display as octal string
  document.getElementById('chmod-octal').textContent = mode.toString(8).padStart(3, '0');
}

function applyChmod() {
  if (!currentChmodContext) return;

  const tab = tabs.get(currentChmodContext.tabId);
  if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) {
    alert('SFTP connection not ready');
    return;
  }

  // Calculate mode
  let mode = 0;
  if (document.getElementById('chmod-owner-read').checked) mode += 0o400;
  if (document.getElementById('chmod-owner-write').checked) mode += 0o200;
  if (document.getElementById('chmod-owner-execute').checked) mode += 0o100;
  if (document.getElementById('chmod-group-read').checked) mode += 0o040;
  if (document.getElementById('chmod-group-write').checked) mode += 0o020;
  if (document.getElementById('chmod-group-execute').checked) mode += 0o010;
  if (document.getElementById('chmod-others-read').checked) mode += 0o004;
  if (document.getElementById('chmod-others-write').checked) mode += 0o002;
  if (document.getElementById('chmod-others-execute').checked) mode += 0o001;

  // Send chmod command via WebSocket
  tab.ws.send(JSON.stringify({
    type: 'sftp-chmod',
    path: currentChmodContext.filePath,
    mode: mode
  }));

  // Close modal
  hideModal('chmod-modal');
  currentChmodContext = null;
}

// Chmod modal event listeners
document.querySelectorAll('.chmod-checkbox').forEach(checkbox => {
  checkbox.addEventListener('change', updateChmodOctal);
});

document.getElementById('cancel-chmod-btn').addEventListener('click', () => {
  hideModal('chmod-modal');
  currentChmodContext = null;
});

document.getElementById('save-chmod-btn').addEventListener('click', () => {
  applyChmod();
});

// ========== TOAST NOTIFICATIONS ==========

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  // Set colors based on type
  let bgColor, borderColor, iconColor, icon;
  switch (type) {
    case 'success':
      bgColor = 'bg-green-500/10';
      borderColor = 'border-green-500/30';
      iconColor = 'text-green-400';
      icon = 'check_circle';
      break;
    case 'error':
      bgColor = 'bg-red-500/10';
      borderColor = 'border-red-500/30';
      iconColor = 'text-red-400';
      icon = 'error';
      break;
    case 'warning':
      bgColor = 'bg-yellow-500/10';
      borderColor = 'border-yellow-500/30';
      iconColor = 'text-yellow-400';
      icon = 'warning';
      break;
    default: // info
      bgColor = 'bg-primary/10';
      borderColor = 'border-primary/30';
      iconColor = 'text-primary';
      icon = 'info';
  }

  toast.className = `${bgColor} ${borderColor} border rounded-xl p-4 backdrop-blur-sm shadow-lg flex items-center gap-3 animate-slide-in-right`;
  toast.innerHTML = `
    <span class="material-icons ${iconColor}">${icon}</span>
    <span class="text-sm text-white flex-1">${message}</span>
    <button class="toast-close text-gray-400 hover:text-white transition-colors">
      <span class="material-icons text-sm">close</span>
    </button>
  `;

  // Add close handler
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.style.animation = 'slide-out-right 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slide-out-right 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// ========== CONNECTION MODALS ==========

document.getElementById('add-connection-btn').addEventListener('click', () => {
  document.getElementById('modal-title').textContent = 'New Connection';
  document.getElementById('conn-id').value = '';
  document.getElementById('connection-form').reset();

  // Reset connection type to SSH
  document.querySelector('input[name="conn-type"][value="ssh"]').checked = true;
  document.getElementById('sftp-options-group').style.display = 'none';

  // Reset auth type to password
  document.querySelector('input[name="auth-type"][value="password"]').checked = true;
  document.getElementById('password-group').style.display = 'block';
  document.getElementById('key-group').style.display = 'none';

  // Reset conn-type label styling
  document.querySelectorAll('.conn-type-label').forEach(label => {
    const radio = label.querySelector('input[type="radio"]');
    if (radio.value === 'ssh') {
      label.classList.add('bg-primary/20', 'border', 'border-primary/30');
      label.querySelector('span').classList.add('text-primary');
    } else {
      label.classList.remove('bg-primary/20', 'border', 'border-primary/30');
      label.querySelector('span').classList.remove('text-primary');
    }
  });

  updateKeyDropdown();
  showModal('connection-modal');
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  hideModal('connection-modal');
});

function editConnection(conn) {
  document.getElementById('modal-title').textContent = 'Edit Connection';
  document.getElementById('conn-id').value = conn.id;
  document.getElementById('conn-name').value = conn.name;
  document.getElementById('conn-host').value = conn.host;
  document.getElementById('conn-port').value = conn.port;
  document.getElementById('conn-username').value = conn.username;
  document.getElementById('conn-description').value = conn.description || '';
  document.getElementById('conn-password').value = '';

  // Connection type
  const connType = conn.connection_type || 'ssh';
  document.querySelector(`input[name="conn-type"][value="${connType}"]`).checked = true;
  document.getElementById('sftp-options-group').style.display = connType === 'sftp' ? 'block' : 'none';
  document.getElementById('conn-initial-path').value = conn.initial_path || '';

  // Auth type
  const authType = conn.auth_type || 'password';
  document.querySelector(`input[name="auth-type"][value="${authType}"]`).checked = true;
  document.getElementById('password-group').style.display = authType === 'password' ? 'block' : 'none';
  document.getElementById('key-group').style.display = authType === 'key' ? 'block' : 'none';
  if (authType === 'key' && conn.key_id) {
    document.getElementById('conn-key-id').value = conn.key_id;
  }

  // Trigger label styling
  document.querySelectorAll('.conn-type-label').forEach(label => {
    const radio = label.querySelector('input[type="radio"]');
    if (radio.value === connType) {
      label.classList.add('bg-primary/20', 'border', 'border-primary/30');
      label.querySelector('span').classList.add('text-primary');
    } else {
      label.classList.remove('bg-primary/20', 'border', 'border-primary/30');
      label.querySelector('span').classList.remove('text-primary');
    }
  });

  updateKeyDropdown();
  showModal('connection-modal');
}

document.getElementById('connection-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const connId = document.getElementById('conn-id').value;
  const authType = document.querySelector('input[name="auth-type"]:checked').value;
  const connType = document.querySelector('input[name="conn-type"]:checked').value;
  const data = {
    name: document.getElementById('conn-name').value,
    host: document.getElementById('conn-host').value,
    port: parseInt(document.getElementById('conn-port').value),
    username: document.getElementById('conn-username').value,
    description: document.getElementById('conn-description').value,
    auth_type: authType,
    connection_type: connType,
    initial_path: document.getElementById('conn-initial-path').value || null
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

// ========== CODE SNIPPETS MANAGEMENT ==========

async function loadSnippets() {
  try {
    const res = await fetch('/api/snippets');
    if (!res.ok) {
      throw new Error(`Failed to load snippets: ${res.status}`);
    }
    codeSnippets = await res.json();
    renderSnippetsList();
  } catch (err) {
    console.error('Error loading snippets:', err);
  }
}

function renderSnippetsList() {
  const container = document.getElementById('snippets-list');
  if (!container) return;

  if (codeSnippets.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-400 py-16"><span class="material-icons text-6xl mb-4 text-gray-500">code_off</span><p class="text-lg">No snippets yet</p><p class="text-sm mt-2">Create your first code snippet!</p></div>';
    return;
  }

  container.innerHTML = codeSnippets.map(snippet => `
    <div class="group bg-dark-200/50 backdrop-blur-sm border border-dark-100/50 hover:border-primary/30 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-primary/10">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-icons text-xl text-primary">code</span>
            <span class="font-semibold text-primary">${snippet.name}</span>
            ${snippet.language ? `<span class="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs font-mono">${snippet.language}</span>` : ''}
          </div>
          ${snippet.description ? `<p class="text-sm text-gray-400 mb-2">${snippet.description}</p>` : ''}
          <div class="text-xs text-gray-500">
            Created ${new Date(snippet.created_at).toLocaleDateString()}${snippet.updated_at !== snippet.created_at ? ` • Updated ${new Date(snippet.updated_at).toLocaleDateString()}` : ''}
          </div>
        </div>
        <div class="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="copy-snippet-btn px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg text-sm font-semibold transition-all hover:scale-105" data-id="${snippet.id}">Copy</button>
          <button class="edit-snippet-btn px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-semibold transition-all hover:scale-105" data-id="${snippet.id}">Edit</button>
          <button class="delete-snippet-btn px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold transition-all hover:scale-105" data-id="${snippet.id}">Delete</button>
        </div>
      </div>
      <div class="bg-dark-400 border border-dark-100 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto max-h-32 overflow-y-auto">
        <pre>${snippet.content.split('\n').slice(0, 5).join('\n')}${snippet.content.split('\n').length > 5 ? '\n...' : ''}</pre>
      </div>
    </div>
  `).join('');

  attachSnippetEventHandlers();
}

function attachSnippetEventHandlers() {
  // Copy buttons
  document.querySelectorAll('.copy-snippet-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const snippet = codeSnippets.find(s => s.id == btn.dataset.id);
      try {
        await navigator.clipboard.writeText(snippet.content);
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.classList.add('bg-green-600/30');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('bg-green-600/30');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy snippet:', err);
        alert('Failed to copy to clipboard');
      }
    });
  });

  // Edit buttons
  document.querySelectorAll('.edit-snippet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const snippet = codeSnippets.find(s => s.id == btn.dataset.id);
      showEditSnippetModal(snippet);
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-snippet-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const snippet = codeSnippets.find(s => s.id == btn.dataset.id);
      if (confirm(`Delete snippet "${snippet.name}"?`)) {
        try {
          const res = await fetch(`/api/snippets/${snippet.id}`, { method: 'DELETE' });
          if (!res.ok) {
            throw new Error('Failed to delete snippet');
          }
          loadSnippets();
        } catch (err) {
          console.error('Error deleting snippet:', err);
          alert('Failed to delete snippet');
        }
      }
    });
  });
}

// Snippets modal handlers
document.getElementById('snippets-btn').addEventListener('click', () => {
  showModal('snippets-modal');
  loadSnippets();
});

document.getElementById('close-snippets-btn').addEventListener('click', () => {
  hideModal('snippets-modal');
});

document.getElementById('add-snippet-btn').addEventListener('click', () => {
  hideModal('snippets-modal');
  showAddSnippetModal();
});

document.getElementById('cancel-snippet-btn').addEventListener('click', () => {
  hideModal('snippet-form-modal');
  document.getElementById('snippet-form').reset();
});

// Snippet form submit
document.getElementById('snippet-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const snippetId = document.getElementById('snippet-id').value;
  const data = {
    name: document.getElementById('snippet-name').value,
    content: document.getElementById('snippet-content').value,
    description: document.getElementById('snippet-description').value,
    language: document.getElementById('snippet-language').value
  };

  try {
    const method = snippetId ? 'PUT' : 'POST';
    const url = snippetId ? `/api/snippets/${snippetId}` : '/api/snippets';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save snippet');
    }

    hideModal('snippet-form-modal');
    document.getElementById('snippet-form').reset();
    loadSnippets();
    alert(`Snippet ${snippetId ? 'updated' : 'created'} successfully!`);
  } catch (err) {
    console.error('Error saving snippet:', err);
    alert(err.message);
  }
});

function showAddSnippetModal() {
  document.getElementById('snippet-modal-title').textContent = 'New Snippet';
  document.getElementById('snippet-id').value = '';
  document.getElementById('snippet-form').reset();
  showModal('snippet-form-modal');
}

function showEditSnippetModal(snippet) {
  document.getElementById('snippet-modal-title').textContent = 'Edit Snippet';
  document.getElementById('snippet-id').value = snippet.id;
  document.getElementById('snippet-name').value = snippet.name;
  document.getElementById('snippet-content').value = snippet.content;
  document.getElementById('snippet-description').value = snippet.description || '';
  document.getElementById('snippet-language').value = snippet.language || '';
  showModal('snippet-form-modal');
}

// ========== SNIPPET DROPDOWN (RUN IN TERMINAL) ==========

function showSnippetDropdown(tabId, buttonElement) {
  // Load snippets if not loaded yet
  if (codeSnippets.length === 0) {
    loadSnippets();
  }

  snippetDropdownTabId = tabId;
  const dropdown = document.getElementById('snippet-dropdown');

  // Position dropdown below the button
  const rect = buttonElement.getBoundingClientRect();
  dropdown.style.top = `${rect.bottom + 5}px`;
  dropdown.style.left = `${rect.left - 120}px`; // Center under button

  renderSnippetDropdown();
  dropdown.classList.remove('hidden');
  snippetDropdownVisible = true;
}

function hideSnippetDropdown() {
  const dropdown = document.getElementById('snippet-dropdown');
  dropdown.classList.add('hidden');
  snippetDropdownVisible = false;
  snippetDropdownTabId = null;
}

function renderSnippetDropdown() {
  const container = document.getElementById('snippet-dropdown-list');

  // Filter snippets based on active filter
  let filtered = codeSnippets;
  if (snippetFilter === 'bash') {
    filtered = codeSnippets.filter(s =>
      !s.language ||
      s.language === 'bash' ||
      s.language === 'shell' ||
      s.language === ''
    );
  }

  // Sort by name
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-400 py-8 px-4">
        <span class="material-icons text-4xl mb-2 text-gray-500">code_off</span>
        <p class="text-sm">No ${snippetFilter === 'bash' ? 'bash/shell' : ''} snippets found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(snippet => `
    <button class="snippet-item w-full text-left px-3 py-2 rounded-lg hover:bg-dark-200 transition-colors flex items-center justify-between group"
            data-snippet-id="${snippet.id}">
      <span class="text-sm text-gray-300 truncate flex-1">${snippet.name}</span>
      ${snippet.language ? `<span class="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs font-mono text-primary ml-2">${snippet.language}</span>` : ''}
    </button>
  `).join('');

  // Attach click handlers
  container.querySelectorAll('.snippet-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const snippetId = parseInt(btn.dataset.snippetId);
      executeSnippet(snippetId);
    });
  });
}

function executeSnippet(snippetId) {
  const snippet = codeSnippets.find(s => s.id === snippetId);
  if (!snippet) return;

  const tab = tabs.get(snippetDropdownTabId);
  if (!tab || !tab.ws || tab.ws.readyState !== WebSocket.OPEN) {
    alert('Terminal connection not ready');
    return;
  }

  // Send snippet content to terminal (with \n preserved)
  tab.ws.send(JSON.stringify({
    type: 'input',
    data: snippet.content
  }));

  hideSnippetDropdown();
}

function updateFilterButtons() {
  const bashBtn = document.getElementById('filter-bash');
  const allBtn = document.getElementById('filter-all');

  if (snippetFilter === 'bash') {
    bashBtn.classList.add('bg-primary/20', 'text-primary', 'border-primary/30');
    bashBtn.classList.remove('bg-dark-200', 'text-gray-400');
    allBtn.classList.remove('bg-primary/20', 'text-primary', 'border-primary/30');
    allBtn.classList.add('bg-dark-200', 'text-gray-400');
  } else {
    allBtn.classList.add('bg-primary/20', 'text-primary', 'border-primary/30');
    allBtn.classList.remove('bg-dark-200', 'text-gray-400');
    bashBtn.classList.remove('bg-primary/20', 'text-primary', 'border-primary/30');
    bashBtn.classList.add('bg-dark-200', 'text-gray-400');
  }
}

// Filter button handlers
document.getElementById('filter-bash').addEventListener('click', () => {
  snippetFilter = 'bash';
  updateFilterButtons();
  renderSnippetDropdown();
});

document.getElementById('filter-all').addEventListener('click', () => {
  snippetFilter = 'all';
  updateFilterButtons();
  renderSnippetDropdown();
});

// Close dropdown on click outside
document.addEventListener('click', (e) => {
  if (!snippetDropdownVisible) return;

  const dropdown = document.getElementById('snippet-dropdown');
  const target = e.target;

  // Don't close if clicking inside dropdown or on Run button
  if (dropdown.contains(target) || target.closest('.run-snippet-btn')) {
    return;
  }

  hideSnippetDropdown();
});

// Close dropdown on ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && snippetDropdownVisible) {
    hideSnippetDropdown();
  }
});

// ========== SPLIT SCREEN MODE ==========

function toggleSplitMode() {
  if (splitMode) {
    exitSplitMode();
  } else {
    enterSplitMode();
  }
}

function enterSplitMode() {
  const tabCount = tabs.size;

  if (tabCount < 2) {
    alert('Need at least 2 active connections for split mode');
    return;
  }

  splitMode = true;

  // Determine layout: 2 or 4 terminals
  if (tabCount === 2) {
    splitLayout = 2;
    splitTerminals = Array.from(tabs.keys());
  } else if (tabCount === 3) {
    splitLayout = 2;
    splitTerminals = getLastActiveTabs(2);
  } else {
    // 4 or more tabs
    splitLayout = 4;
    splitTerminals = getLastActiveTabs(4);
  }

  renderSplitLayout();
  updateSplitIcon();
}

function exitSplitMode() {
  splitMode = false;
  splitLayout = 1;
  splitTerminals = [];

  // Remove separators
  document.querySelectorAll('.split-separator').forEach(el => el.remove());

  // Show only active tab
  if (activeTabId) {
    switchTab(activeTabId);
  }

  updateSplitIcon();
}

function getLastActiveTabs(count) {
  return tabActivityOrder.slice(0, count);
}

function updateSplitIcon() {
  const btn = document.getElementById('split-mode-btn');
  const icon = btn.querySelector('.material-icons');

  if (splitMode) {
    btn.classList.add('bg-primary/20', 'border', 'border-primary/30');
    icon.classList.add('text-primary');
  } else {
    btn.classList.remove('bg-primary/20', 'border', 'border-primary/30');
    icon.classList.remove('text-primary');
  }

  // Show button only if >= 2 tabs
  if (tabs.size >= 2) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

function renderSplitLayout() {
  const container = document.getElementById('terminals-container');

  // Hide all terminals first
  tabs.forEach((tab, id) => {
    tab.container.classList.add('hidden');
    tab.container.style.cssText = '';
    tab.container.classList.remove('border-2', 'border-primary/50');
  });

  if (splitLayout === 1) {
    return;
  }

  if (splitLayout === 2) {
    renderTwoTerminalSplit();
  } else if (splitLayout === 4) {
    renderFourTerminalGrid();
  }

  createSeparator();
  updateTerminalSizes();
}

function renderTwoTerminalSplit() {
  const [topId, bottomId] = splitTerminals;
  const topTab = tabs.get(topId);
  const bottomTab = tabs.get(bottomId);

  if (!topTab || !bottomTab) return;

  // Position terminals
  topTab.container.classList.remove('hidden');
  topTab.container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${separatorPosition.horizontal}%;
    padding: 1.5rem;
  `;

  bottomTab.container.classList.remove('hidden');
  bottomTab.container.style.cssText = `
    position: absolute;
    top: ${separatorPosition.horizontal}%;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 1.5rem;
  `;

  updateActiveTerminalHighlight(topId);
}

function renderFourTerminalGrid() {
  const [tl, tr, bl, br] = splitTerminals;
  const { horizontal, vertical } = separatorPosition;

  const terminals = [
    { id: tl, top: 0, left: 0, height: horizontal, width: vertical },
    { id: tr, top: 0, left: vertical, height: horizontal, width: 100 - vertical },
    { id: bl, top: horizontal, left: 0, height: 100 - horizontal, width: vertical },
    { id: br, top: horizontal, left: vertical, height: 100 - horizontal, width: 100 - vertical }
  ];

  terminals.forEach(({ id, top, left, height, width }) => {
    const tab = tabs.get(id);
    if (!tab) return;

    tab.container.classList.remove('hidden');
    tab.container.style.cssText = `
      position: absolute;
      top: ${top}%;
      left: ${left}%;
      width: ${width}%;
      height: ${height}%;
      padding: 1.5rem;
    `;
  });

  updateActiveTerminalHighlight(tl);
}

function updateActiveTerminalHighlight(activeId) {
  splitTerminals.forEach(id => {
    const tab = tabs.get(id);
    if (!tab) return;

    if (id === activeId) {
      tab.container.classList.add('border-2', 'border-primary/50');
    } else {
      tab.container.classList.remove('border-2', 'border-primary/50');
    }
  });
}

function createSeparator() {
  document.querySelectorAll('.split-separator').forEach(el => el.remove());

  const container = document.getElementById('terminals-container');

  if (splitLayout === 2) {
    const separator = document.createElement('div');
    separator.className = 'split-separator horizontal';
    separator.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: ${separatorPosition.horizontal}%;
      height: 4px;
      background: #3b82f6;
      cursor: ns-resize;
      z-index: 100;
      transform: translateY(-50%);
    `;

    separator.addEventListener('mousedown', initHorizontalDrag);
    container.appendChild(separator);

  } else if (splitLayout === 4) {
    // Horizontal separator
    const hSep = document.createElement('div');
    hSep.className = 'split-separator horizontal';
    hSep.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: ${separatorPosition.horizontal}%;
      height: 4px;
      background: #3b82f6;
      cursor: ns-resize;
      z-index: 100;
      transform: translateY(-50%);
    `;
    hSep.addEventListener('mousedown', initHorizontalDrag);
    container.appendChild(hSep);

    // Vertical separator
    const vSep = document.createElement('div');
    vSep.className = 'split-separator vertical';
    vSep.style.cssText = `
      position: absolute;
      top: 0;
      bottom: 0;
      left: ${separatorPosition.vertical}%;
      width: 4px;
      background: #3b82f6;
      cursor: ew-resize;
      z-index: 100;
      transform: translateX(-50%);
    `;
    vSep.addEventListener('mousedown', initVerticalDrag);
    container.appendChild(vSep);
  }
}

function initHorizontalDrag(e) {
  e.preventDefault();

  const container = document.getElementById('terminals-container');
  const rect = container.getBoundingClientRect();

  function onMouseMove(e) {
    const y = e.clientY - rect.top;
    const percent = (y / rect.height) * 100;

    separatorPosition.horizontal = Math.max(20, Math.min(80, percent));
    renderSplitLayout();
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function initVerticalDrag(e) {
  e.preventDefault();

  const container = document.getElementById('terminals-container');
  const rect = container.getBoundingClientRect();

  function onMouseMove(e) {
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;

    separatorPosition.vertical = Math.max(20, Math.min(80, percent));
    renderSplitLayout();
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function updateTerminalSizes() {
  splitTerminals.forEach(id => {
    const tab = tabs.get(id);
    if (tab && tab.fitAddon) {
      setTimeout(() => {
        try {
          tab.fitAddon.fit();

          if (tab.ws && tab.ws.readyState === WebSocket.OPEN) {
            tab.ws.send(JSON.stringify({
              type: 'resize',
              rows: tab.terminal.rows,
              cols: tab.terminal.cols
            }));
          }
        } catch (err) {
          console.error('Error fitting terminal:', err);
        }
      }, 100);
    }
  });
}

function handleTabClickInSplitMode(tabId) {
  if (splitTerminals.includes(tabId)) {
    // Tab already visible - exit split mode and show single view
    exitSplitMode();
    switchTab(tabId);
  } else {
    // Replace TOP terminal with clicked tab
    splitTerminals[0] = tabId;
    updateTabActivity(tabId);
    renderSplitLayout();
  }
}

// Split mode button click
document.getElementById('split-mode-btn').addEventListener('click', toggleSplitMode);

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