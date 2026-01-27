/**
 * Ask Pinnacle - Popup Script
 *
 * Simplified version with single Quick Suite URL configuration.
 * All authentication and QuickSight config is handled by the hosted app.
 */

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const actionLog = document.getElementById('action-log');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const quickSuiteContainer = document.getElementById('quicksuite-container');
const quickSuiteFrame = document.getElementById('quicksuite-frame');
const quickSuiteStatus = document.getElementById('quicksuite-status');
const quickSuiteRefresh = document.getElementById('quicksuite-refresh');
const chatInputContainer = document.querySelector('.chat-input-container');

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// Load saved settings
async function loadSettings() {
  console.log('[Settings] Loading...');

  const settings = await chrome.storage.sync.get([
    'apiUrl',
    'apiKey',
    'model',
    'autoDetectPms',
    'pmsUrl',
    'quickSuiteUrl'
  ]);

  // API settings
  if (settings.apiUrl) {
    document.getElementById('api-url').value = settings.apiUrl;
  }
  if (settings.apiKey) {
    document.getElementById('api-key').value = settings.apiKey;
    updateStatus(true);
  }
  if (settings.model) {
    document.getElementById('model-select').value = settings.model;
  }

  // RPA settings
  if (settings.pmsUrl) {
    document.getElementById('pms-url').value = settings.pmsUrl;
  }
  if (settings.autoDetectPms !== undefined) {
    document.getElementById('auto-detect-pms').checked = settings.autoDetectPms;
  }

  // Quick Suite URL (simplified - just one field)
  if (settings.quickSuiteUrl) {
    document.getElementById('quicksuite-url').value = settings.quickSuiteUrl;
  }

  // Check auth status
  checkAuthStatus();
}

// Update connection status
function updateStatus(isOnline) {
  statusIndicator.classList.toggle('online', isOnline);
  statusIndicator.classList.toggle('offline', !isOnline);
  statusText.textContent = isOnline ? 'Online' : 'Offline';
}

// Save settings
document.getElementById('save-settings').addEventListener('click', async () => {
  const quickSuiteUrl = document.getElementById('quicksuite-url').value.trim();

  // Validate HTTPS
  if (quickSuiteUrl && !isHttpsUrl(quickSuiteUrl)) {
    addMessage('Quick Suite URL must use HTTPS', 'error');
    return;
  }

  const settings = {
    apiUrl: document.getElementById('api-url').value,
    apiKey: document.getElementById('api-key').value,
    model: document.getElementById('model-select').value,
    autoDetectPms: document.getElementById('auto-detect-pms').checked,
    pmsUrl: document.getElementById('pms-url').value,
    quickSuiteUrl: quickSuiteUrl
  };

  await chrome.storage.sync.set(settings);
  addMessage('Settings saved!', 'bot');

  if (settings.apiKey) {
    updateStatus(true);
  }

  document.querySelector('[data-tab="chat"]').click();
});

// Open Side Panel
document.getElementById('open-sidepanel').addEventListener('click', async () => {
  const { quickSuiteUrl } = await chrome.storage.sync.get(['quickSuiteUrl']);

  if (!quickSuiteUrl) {
    addMessage('Please enter your Quick Suite URL first', 'error');
    return;
  }

  try {
    // Try to open side panel (Chrome 114+)
    const window = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: window.id });
  } catch (e) {
    // Fallback: open in new tab
    chrome.tabs.create({ url: quickSuiteUrl });
  }
});

// Validate HTTPS URL
function isHttpsUrl(url) {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

// Test API connection
document.getElementById('test-connection').addEventListener('click', async () => {
  const apiUrl = document.getElementById('api-url').value;
  const apiKey = document.getElementById('api-key').value;

  if (!apiUrl || !apiKey) {
    addMessage('Please enter API URL and Key', 'error');
    return;
  }

  const btn = document.getElementById('test-connection');
  btn.textContent = 'Testing...';
  btn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testConnection',
      apiUrl,
      apiKey
    });

    document.querySelector('[data-tab="chat"]').click();
    if (response.success) {
      addMessage('Connection successful!', 'bot');
      updateStatus(true);
    } else {
      addMessage('Connection failed: ' + response.error, 'error');
      updateStatus(false);
    }
  } catch (error) {
    addMessage('Test failed: ' + error.message, 'error');
  } finally {
    btn.textContent = 'Test API Connection';
    btn.disabled = false;
  }
});

// Add message to chat
function addMessage(text, type = 'bot', icon = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  if (type === 'bot') {
    messageDiv.innerHTML = `
      <span class="message-icon"><img src="icon-pinnacle-playful.svg" alt="" class="bot-avatar"></span>
      <div class="message-content"><p>${escapeHtml(text)}</p></div>
    `;
  } else if (type === 'error') {
    messageDiv.innerHTML = `
      <span class="message-icon">${icon || '⚠️'}</span>
      <div class="message-content"><p>${escapeHtml(text)}</p></div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content"><p>${escapeHtml(text)}</p></div>
    `;
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Send chat message
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  chatInput.value = '';
  sendButton.disabled = true;

  const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'model']);

  if (!settings.apiKey) {
    addMessage('Please configure your API key in Settings', 'error');
    sendButton.disabled = false;
    return;
  }

  addMessage('Thinking...', 'loading');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'chat',
      message,
      settings
    });

    // Remove loading message
    const loadingMsg = chatMessages.querySelector('.message.loading');
    if (loadingMsg) loadingMsg.remove();

    if (response.error) {
      addMessage(response.error, 'error');
    } else {
      addMessage(response.reply || 'No response', 'bot');
    }
  } catch (error) {
    const loadingMsg = chatMessages.querySelector('.message.loading');
    if (loadingMsg) loadingMsg.remove();
    addMessage('Failed: ' + error.message, 'error');
  } finally {
    sendButton.disabled = false;
    chatInput.focus();
  }
}

sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// RPA Actions
document.querySelectorAll('.action-btn').forEach(button => {
  button.addEventListener('click', async () => {
    const action = button.dataset.action;
    logAction(`Running: ${action}`);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        logAction('Error: No active tab', true);
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'rpaAction',
        actionType: action
      });

      if (response?.success) {
        logAction(`Success: ${action}`);
        if (response.result) {
          addMessage(response.result, 'bot');
        }
      } else {
        logAction(`Failed: ${response?.error || 'Unknown error'}`, true);
      }
    } catch (error) {
      logAction(`Error: ${error.message}`, true);
    }
  });
});

function logAction(message, isError = false) {
  const logContainer = document.getElementById('action-log');
  const emptyMsg = logContainer.querySelector('.log-empty');
  if (emptyMsg) emptyMsg.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry ${isError ? 'error' : 'success'}`;
  entry.innerHTML = `
    <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    <span>${escapeHtml(message)}</span>
  `;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Authentication
async function checkAuthStatus() {
  const storage = await chrome.storage.sync.get(['authToken', 'authExpiry', 'username']);
  const authIndicator = document.getElementById('auth-indicator');
  const authText = document.getElementById('auth-text');
  const statusBox = document.getElementById('auth-status-section');
  const statusMsg = document.getElementById('auth-status-message');
  const userInfo = document.getElementById('auth-user-info');
  const logoutBtn = document.getElementById('logout-button');

  const isValid = storage.authToken && storage.authExpiry && Date.now() < storage.authExpiry;

  if (isValid) {
    authIndicator.classList.remove('logged-out');
    authIndicator.classList.add('logged-in');
    authText.textContent = storage.username || 'Logged In';
    statusBox.classList.add('success');
    statusBox.classList.remove('error');
    statusMsg.textContent = 'Authenticated';
    userInfo.textContent = storage.username ? `User: ${storage.username}` : '';
    userInfo.style.display = storage.username ? 'block' : 'none';
    logoutBtn.style.display = 'inline-block';
  } else {
    authIndicator.classList.remove('logged-in');
    authIndicator.classList.add('logged-out');
    authText.textContent = 'Not Logged In';
    statusBox.classList.remove('success');
    statusMsg.textContent = 'Not authenticated';
    userInfo.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
}

document.getElementById('login-button').addEventListener('click', async () => {
  const endpoint = document.getElementById('auth-endpoint').value.trim();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  const token = document.getElementById('auth-token').value.trim();

  if (token) {
    // Direct token
    await chrome.storage.sync.set({
      authToken: token,
      authExpiry: Date.now() + 24 * 60 * 60 * 1000,
      username: 'Token User'
    });
    checkAuthStatus();
    addMessage('Token saved!', 'bot');
    document.getElementById('auth-token').value = '';
    return;
  }

  if (!endpoint || !username || !password) {
    addMessage('Please fill in all login fields', 'error');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'login',
      endpoint,
      username,
      password
    });

    if (response.success) {
      checkAuthStatus();
      addMessage('Login successful!', 'bot');
      document.getElementById('auth-password').value = '';
    } else {
      addMessage('Login failed: ' + response.error, 'error');
    }
  } catch (error) {
    addMessage('Login error: ' + error.message, 'error');
  }
});

document.getElementById('logout-button').addEventListener('click', async () => {
  await chrome.storage.sync.remove(['authToken', 'authExpiry', 'username']);
  checkAuthStatus();
  addMessage('Logged out', 'bot');
});

document.getElementById('check-auth-button').addEventListener('click', checkAuthStatus);

// Initialize
loadSettings();
