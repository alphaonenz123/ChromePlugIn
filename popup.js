// Popup JavaScript for Chatbot Assistant
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

// ResizeObserver for dynamic Quick Suite iframe sizing
// This helps ensure the iframe adapts to container size changes
let quickSuiteResizeObserver = null;

/**
 * Initialize ResizeObserver for Quick Suite container
 * Observes container size changes and logs for debugging
 */
function initQuickSuiteResizeObserver() {
  if (quickSuiteResizeObserver) {
    quickSuiteResizeObserver.disconnect();
  }
  
  quickSuiteResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      console.log(`[Quick Suite] Container resized: ${width}x${height}px`);
      
      // Note: Iframe automatically adjusts via CSS (100% width/height with position: absolute)
      // This observer is primarily for debugging and logging resize events
    }
  });
  
  if (quickSuiteFrame) {
    quickSuiteResizeObserver.observe(quickSuiteFrame);
    console.log('[Quick Suite] ResizeObserver initialized');
  }
}

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.dataset.tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
  });
});

// Load saved settings
async function loadSettings() {
  console.log('[Settings] Loading saved configuration...');
  
  const settings = await chrome.storage.sync.get([
    'apiUrl',
    'apiKey',
    'model',
    'autoDetectPms',
    'pmsUrl',
    'quickSuiteEnabled',
    'quickSuiteEndpoint',
    'quickSuiteAgentArn',
    'quickSuiteInitialQuery'
  ]);
  
  console.log('[Settings] Loaded configuration:', {
    hasApiUrl: !!settings.apiUrl,
    hasApiKey: !!settings.apiKey,
    model: settings.model,
    autoDetectPms: settings.autoDetectPms,
    quickSuiteEnabled: settings.quickSuiteEnabled,
    hasQuickSuiteEndpoint: !!settings.quickSuiteEndpoint
  });
  
  if (settings.apiUrl) {
    document.getElementById('api-url').value = settings.apiUrl;
  }
  if (settings.apiKey) {
    document.getElementById('api-key').value = settings.apiKey;
  }
  if (settings.model) {
    document.getElementById('model-select').value = settings.model;
  }
  if (settings.pmsUrl) {
    document.getElementById('pms-url').value = settings.pmsUrl;
  }
  if (settings.autoDetectPms !== undefined) {
    document.getElementById('auto-detect-pms').checked = settings.autoDetectPms;
  }
  if (settings.quickSuiteEnabled !== undefined) {
    document.getElementById('enable-quicksuite').checked = settings.quickSuiteEnabled;
  }
  if (settings.quickSuiteEndpoint) {
    document.getElementById('quicksuite-endpoint').value = settings.quickSuiteEndpoint;
  }
  if (settings.quickSuiteAgentArn) {
    document.getElementById('quicksuite-agent-arn').value = settings.quickSuiteAgentArn;
  }
  if (settings.quickSuiteInitialQuery) {
    document.getElementById('quicksuite-initial-query').value = settings.quickSuiteInitialQuery;
  }
  
  // Update status indicator
  if (settings.apiKey) {
    updateStatus(true);
  }

  applyChatMode(settings.quickSuiteEnabled);
  if (settings.quickSuiteEnabled) {
    console.log('[Settings] Quick Suite is enabled, loading embed...');
    await loadQuickSuiteEmbed(settings);
  } else {
    console.log('[Settings] Using standard chat interface');
  }
}

// Update connection status
function updateStatus(isOnline) {
  if (isOnline) {
    statusIndicator.classList.remove('offline');
    statusIndicator.classList.add('online');
    statusText.textContent = 'Online';
  } else {
    statusIndicator.classList.remove('online');
    statusIndicator.classList.add('offline');
    statusText.textContent = 'Offline';
  }
}

// Save settings
document.getElementById('save-settings').addEventListener('click', async () => {
  console.log('[Settings] Saving configuration...');
  
  const settings = {
    apiUrl: document.getElementById('api-url').value,
    apiKey: document.getElementById('api-key').value,
    model: document.getElementById('model-select').value,
    autoDetectPms: document.getElementById('auto-detect-pms').checked,
    pmsUrl: document.getElementById('pms-url').value,
    quickSuiteEnabled: document.getElementById('enable-quicksuite').checked,
    quickSuiteEndpoint: document.getElementById('quicksuite-endpoint').value,
    quickSuiteAgentArn: document.getElementById('quicksuite-agent-arn').value,
    quickSuiteInitialQuery: document.getElementById('quicksuite-initial-query').value
  };
  
  console.log('[Settings] Configuration:', {
    hasApiKey: !!settings.apiKey,
    model: settings.model,
    quickSuiteEnabled: settings.quickSuiteEnabled,
    hasQuickSuiteEndpoint: !!settings.quickSuiteEndpoint
  });
  
  await chrome.storage.sync.set(settings);
  
  // Show success message
  addMessage('Settings saved successfully!', 'bot');
  console.log('[Settings] Configuration saved to storage');
  
  // Update status
  if (settings.apiKey) {
    updateStatus(true);
  }

  applyChatMode(settings.quickSuiteEnabled);
  if (settings.quickSuiteEnabled) {
    console.log('[Settings] Quick Suite enabled, loading embed...');
    await loadQuickSuiteEmbed(settings);
  } else {
    console.log('[Settings] Quick Suite disabled, using standard chat');
  }
  
  // Switch back to chat tab
  document.querySelector('[data-tab="chat"]').click();
});

quickSuiteRefresh.addEventListener('click', async () => {
  console.log('[Quick Suite] Manual refresh requested');
  
  const settings = await chrome.storage.sync.get([
    'quickSuiteEnabled',
    'quickSuiteEndpoint',
    'quickSuiteAgentArn',
    'quickSuiteInitialQuery'
  ]);
  
  if (settings.quickSuiteEnabled) {
    console.log('[Quick Suite] Reloading embed...');
    await loadQuickSuiteEmbed(settings);
  } else {
    console.warn('[Quick Suite] Refresh clicked but Quick Suite is not enabled');
    setQuickSuiteStatus('Quick Suite is not enabled. Enable it in Settings.', true);
  }
});

// Test API connection
document.getElementById('test-connection').addEventListener('click', async () => {
  const apiUrl = document.getElementById('api-url').value;
  const apiKey = document.getElementById('api-key').value;
  
  if (!apiUrl || !apiKey) {
    // Switch to chat tab and show error
    document.querySelector('[data-tab="chat"]').click();
    addMessage('Please enter both API URL and API Key in Settings', 'error', '⚠️');
    return;
  }
  
  // Show testing message
  const testButton = document.getElementById('test-connection');
  const originalText = testButton.textContent;
  testButton.textContent = 'Testing...';
  testButton.disabled = true;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testConnection',
      apiUrl,
      apiKey
    });
    
    // Switch to chat tab to show result
    document.querySelector('[data-tab="chat"]').click();
    
    if (response.success) {
      addMessage('✅ Connection successful! API is working correctly.', 'bot', '✅');
      updateStatus(true);
    } else {
      addMessage('❌ Connection failed: ' + response.error, 'error', '⚠️');
      updateStatus(false);
    }
  } catch (error) {
    document.querySelector('[data-tab="chat"]').click();
    addMessage('❌ Connection test failed: ' + error.message, 'error', '⚠️');
    updateStatus(false);
  } finally {
    testButton.textContent = originalText;
    testButton.disabled = false;
  }
});

// Add message to chat
function addMessage(text, type = 'bot', icon = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  if (type !== 'user') {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'message-icon';
    
    if (type === 'bot' && !icon) {
      // Use Ask Pinnacle avatar for bot messages
      const img = document.createElement('img');
      img.src = 'icon-pinnacle-playful.svg';
      img.alt = 'Ask Pinnacle';
      img.className = 'bot-avatar';
      iconSpan.appendChild(img);
    } else if (icon) {
      iconSpan.textContent = icon;
    }
    
    messageDiv.appendChild(iconSpan);
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const p = document.createElement('p');
  p.textContent = text;
  contentDiv.appendChild(p);
  
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageDiv;
}

// Send message
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Add user message
  addMessage(message, 'user');
  chatInput.value = '';
  
  // Add loading message
  const loadingMsg = addMessage('Thinking...', 'loading');
  
  try {
    // Get settings
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'model']);
    
    if (!settings.apiKey) {
      loadingMsg.remove();
      addMessage('Please configure your API key in Settings first.', 'error', '⚠️');
      return;
    }
    
    // Send to background script
    const response = await chrome.runtime.sendMessage({
      action: 'chat',
      message: message,
      settings: settings
    });
    
    loadingMsg.remove();
    
    if (response.success) {
      addMessage(response.reply, 'bot');
    } else {
      addMessage(`Error: ${response.error}`, 'error', '⚠️');
    }
  } catch (error) {
    loadingMsg.remove();
    addMessage(`Error: ${error.message}`, 'error', '⚠️');
  }
}

/**
 * Toggle between Quick Suite embedded chat and standard chat interface
 * @param {boolean} quickSuiteEnabled - Whether Quick Suite mode is enabled
 */
function applyChatMode(quickSuiteEnabled) {
  const isEnabled = Boolean(quickSuiteEnabled);
  console.log(`[Quick Suite] Applying chat mode: ${isEnabled ? 'Quick Suite' : 'Standard Chat'}`);
  
  quickSuiteContainer.hidden = !isEnabled;
  chatMessages.hidden = isEnabled;
  chatInputContainer.hidden = isEnabled;
  
  // Cleanup resize observer when switching away from Quick Suite
  if (!isEnabled && quickSuiteResizeObserver) {
    quickSuiteResizeObserver.disconnect();
    console.log('[Quick Suite] ResizeObserver disconnected');
  }
}

/**
 * Clear the Quick Suite iframe container
 */
function clearQuickSuiteFrame() {
  console.log('[Quick Suite] Clearing iframe container');
  quickSuiteFrame.innerHTML = '';
}

/**
 * Update the Quick Suite status message
 * @param {string} message - Status message to display
 * @param {boolean} isError - Whether this is an error message
 */
function setQuickSuiteStatus(message, isError = false) {
  console.log(`[Quick Suite] Status: ${message} (error: ${isError})`);
  quickSuiteStatus.textContent = message;
  quickSuiteStatus.classList.remove('error', 'success');
  
  if (isError) {
    quickSuiteStatus.classList.add('error');
  } else if (message.includes('ready')) {
    quickSuiteStatus.classList.add('success');
  }
}

/**
 * Load Amazon Quick Suite embedded chat iframe
 * Per AWS QuickSight guidelines: https://aws.amazon.com/blogs/business-intelligence/announcing-embedded-chat-in-amazon-quick-suite/
 * @param {Object} settings - Configuration settings for Quick Suite
 */
async function loadQuickSuiteEmbed(settings) {
  const endpoint = settings.quickSuiteEndpoint;
  const agentArn = settings.quickSuiteAgentArn;
  const initialQuery = settings.quickSuiteInitialQuery;

  console.log('[Quick Suite] Loading embedded chat', {
    endpoint,
    hasAgentArn: !!agentArn,
    hasInitialQuery: !!initialQuery
  });

  clearQuickSuiteFrame();

  // Validate endpoint configuration
  if (!endpoint) {
    const errorMsg = 'Add an embed URL endpoint in Settings to load Quick Suite.';
    console.warn('[Quick Suite]', errorMsg);
    setQuickSuiteStatus(errorMsg, true);
    return;
  }

  setQuickSuiteStatus('Loading Quick Suite embed URL...');

  try {
    console.log('[Quick Suite] Fetching embed URL from backend:', endpoint);
    
    // Use background script to make authenticated request
    const response = await chrome.runtime.sendMessage({
      action: 'getQuickSuiteEmbedUrl',
      endpoint: endpoint,
      agentArn: agentArn,
      initialQuery: initialQuery
    });
    
    // Check if authentication is required
    if (!response.success && response.requiresAuth) {
      console.warn('[Quick Suite] Authentication required');
      setQuickSuiteStatus('Authentication required. Please login in Settings to load Quick Suite.', true);
      
      // Show login prompt in status
      const loginLink = document.createElement('div');
      loginLink.style.marginTop = '8px';
      loginLink.innerHTML = '<button class="secondary-button small-button" id="quick-login-btn">Go to Login</button>';
      quickSuiteStatus.appendChild(loginLink);
      
      document.getElementById('quick-login-btn').addEventListener('click', () => {
        document.querySelector('[data-tab="settings"]').click();
      });
      
      return;
    }
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get embed URL');
    }
    
    const embedUrl = response.url;
    console.log('[Quick Suite] Received embed URL:', {
      hasUrl: !!embedUrl,
      urlLength: embedUrl?.length
    });
    
    // Validate response format
    if (!embedUrl) {
      console.error('[Quick Suite] Invalid response format');
      throw new Error('Embed URL response did not include a "url" field.');
    }

    // Validate URL is from QuickSight domain (security check)
    // Must be exactly *.quicksight.aws.amazon.com to prevent subdomain attacks
    const urlObj = new URL(embedUrl);
    const hostname = urlObj.hostname;
    const isValidQuickSightDomain = hostname.endsWith('.quicksight.aws.amazon.com') || 
                                     hostname === 'quicksight.aws.amazon.com';
    
    if (!isValidQuickSightDomain) {
      const errorMsg = `Security: URL must be from QuickSight domain (got: ${hostname})`;
      console.error('[Quick Suite]', errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log('[Quick Suite] URL validated as QuickSight domain:', hostname);

    console.log('[Quick Suite] Creating iframe for embedded chat');
    
    // Create iframe following AWS QuickSight embedding guidelines
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.title = 'Quick Suite Embedded Chat';
    iframe.referrerPolicy = 'no-referrer';
    
    // Allow necessary permissions for QuickSight embedded chat
    iframe.allow = 'fullscreen';
    
    // Add load and error event handlers for debugging
    iframe.addEventListener('load', () => {
      console.log('[Quick Suite] Iframe loaded successfully');
      setQuickSuiteStatus('Quick Suite embedded chat is ready.');
      
      // Initialize ResizeObserver to handle dynamic sizing
      initQuickSuiteResizeObserver();
    });
    
    iframe.addEventListener('error', (e) => {
      console.error('[Quick Suite] Iframe error:', e);
      setQuickSuiteStatus('Failed to load Quick Suite iframe.', true);
    });
    
    quickSuiteFrame.appendChild(iframe);
    console.log('[Quick Suite] Iframe appended to container');

  } catch (error) {
    console.error('[Quick Suite] Failed to load embedded chat:', error);
    setQuickSuiteStatus(`Unable to load Quick Suite: ${error.message}`, true);
  }
}

// Event listeners for sending messages
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// RPA Action buttons
document.querySelectorAll('.action-btn').forEach(button => {
  button.addEventListener('click', async () => {
    const action = button.dataset.action;
    const actionName = button.textContent.trim();
    
    addLogEntry(`Executing: ${actionName}`, 'info');
    
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'rpaAction',
        actionType: action
      });
      
      if (response && response.success) {
        addLogEntry(`✅ ${actionName} completed successfully`, 'success');
        
        // If there's a result, show it in chat
        if (response.result) {
          document.querySelector('[data-tab="chat"]').click();
          addMessage(`RPA Action Result:\n${response.result}`, 'bot');
        }
      } else {
        addLogEntry(`❌ ${actionName} failed: ${response?.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      addLogEntry(`❌ ${actionName} failed: ${error.message}`, 'error');
    }
  });
});

// Add log entry
function addLogEntry(text, type = 'info') {
  // Remove empty message if present
  const emptyMsg = actionLog.querySelector('.log-empty');
  if (emptyMsg) {
    emptyMsg.remove();
  }
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const timestamp = document.createElement('span');
  timestamp.className = 'timestamp';
  timestamp.textContent = new Date().toLocaleTimeString();
  
  const message = document.createElement('span');
  message.textContent = ' - ' + text;
  
  entry.appendChild(timestamp);
  entry.appendChild(message);
  
  actionLog.appendChild(entry);
  actionLog.scrollTop = actionLog.scrollHeight;
  
  // Keep only last 20 entries
  while (actionLog.children.length > 20) {
    actionLog.removeChild(actionLog.firstChild);
  }
}

// ===========================
// Authentication Handling
// ===========================

const authIndicator = document.getElementById('auth-indicator');
const authText = document.getElementById('auth-text');
const authStatusSection = document.getElementById('auth-status-section');
const authStatusMessage = document.getElementById('auth-status-message');
const authUserInfo = document.getElementById('auth-user-info');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const checkAuthButton = document.getElementById('check-auth-button');

/**
 * Update authentication status UI
 */
function updateAuthStatus(authenticated, username = null, expiresAt = null) {
  if (authenticated) {
    authIndicator.classList.remove('logged-out');
    authIndicator.classList.add('logged-in');
    authText.textContent = username ? `${username}` : 'Logged In';
    
    authStatusSection.classList.remove('error');
    authStatusSection.classList.add('success');
    authStatusMessage.textContent = '✅ Authenticated';
    authStatusMessage.className = 'success-text';
    
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      authUserInfo.textContent = `Session expires: ${expiryDate.toLocaleString()}`;
      authUserInfo.style.display = 'block';
    } else {
      authUserInfo.style.display = 'none';
    }
    
    loginButton.style.display = 'none';
    logoutButton.style.display = 'inline-block';
  } else {
    authIndicator.classList.remove('logged-in');
    authIndicator.classList.add('logged-out');
    authText.textContent = 'Not Logged In';
    
    authStatusSection.classList.remove('success');
    authStatusSection.classList.remove('error');
    authStatusMessage.textContent = 'Not authenticated. Please login to access protected endpoints.';
    authStatusMessage.className = '';
    authUserInfo.style.display = 'none';
    
    loginButton.style.display = 'inline-block';
    logoutButton.style.display = 'none';
  }
}

/**
 * Check authentication status
 */
async function checkAuthStatus() {
  console.log('[Auth] Checking authentication status...');
  
  const settings = await chrome.storage.sync.get(['authEndpoint', 'quickSuiteEndpoint']);
  const endpoint = settings.authEndpoint || settings.quickSuiteEndpoint;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkAuth',
      endpoint: endpoint
    });
    
    if (response.success && response.authenticated) {
      console.log('[Auth] User is authenticated:', response.username);
      updateAuthStatus(true, response.username, response.expiresAt);
    } else {
      console.log('[Auth] User is not authenticated');
      updateAuthStatus(false);
    }
  } catch (error) {
    console.error('[Auth] Error checking auth status:', error);
    authStatusSection.classList.add('error');
    authStatusMessage.textContent = `Error checking auth: ${error.message}`;
    authStatusMessage.className = 'error-text';
  }
}

/**
 * Handle login
 */
async function handleLogin() {
  const endpoint = document.getElementById('auth-endpoint').value;
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  const token = document.getElementById('auth-token').value;
  
  if (!endpoint) {
    authStatusSection.classList.add('error');
    authStatusMessage.textContent = '❌ Please enter an authentication endpoint';
    authStatusMessage.className = 'error-text';
    return;
  }
  
  if (!token && (!username || !password)) {
    authStatusSection.classList.add('error');
    authStatusMessage.textContent = '❌ Please enter username/password or a token';
    authStatusMessage.className = 'error-text';
    return;
  }
  
  loginButton.textContent = 'Logging in...';
  loginButton.disabled = true;
  authStatusMessage.textContent = 'Authenticating...';
  authStatusSection.classList.remove('error', 'success');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'login',
      endpoint: endpoint,
      username: username,
      password: password,
      token: token
    });
    
    if (response.success && response.authenticated) {
      console.log('[Auth] Login successful');
      updateAuthStatus(true, response.username, response.expiresAt);
      
      // Save auth endpoint
      await chrome.storage.sync.set({ authEndpoint: endpoint });
      
      // Clear password field for security
      document.getElementById('auth-password').value = '';
      document.getElementById('auth-token').value = '';
      
      // Show success in chat
      document.querySelector('[data-tab="chat"]').click();
      addMessage(`✅ Successfully logged in as ${response.username}!`, 'bot', '✅');
    } else {
      console.error('[Auth] Login failed:', response.error);
      authStatusSection.classList.add('error');
      authStatusMessage.textContent = `❌ Login failed: ${response.error}`;
      authStatusMessage.className = 'error-text';
    }
  } catch (error) {
    console.error('[Auth] Login error:', error);
    authStatusSection.classList.add('error');
    authStatusMessage.textContent = `❌ Login error: ${error.message}`;
    authStatusMessage.className = 'error-text';
  } finally {
    loginButton.textContent = 'Login';
    loginButton.disabled = false;
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  logoutButton.textContent = 'Logging out...';
  logoutButton.disabled = true;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'logout'
    });
    
    if (response.success) {
      console.log('[Auth] Logout successful');
      updateAuthStatus(false);
      
      // Show success in chat
      document.querySelector('[data-tab="chat"]').click();
      addMessage('✅ Successfully logged out', 'bot', '✅');
    } else {
      console.error('[Auth] Logout failed:', response.error);
    }
  } catch (error) {
    console.error('[Auth] Logout error:', error);
  } finally {
    logoutButton.textContent = 'Logout';
    logoutButton.disabled = false;
  }
}

// Event listeners for auth buttons
loginButton.addEventListener('click', handleLogin);
logoutButton.addEventListener('click', handleLogout);
checkAuthButton.addEventListener('click', checkAuthStatus);

// Load auth endpoint from settings
async function loadAuthSettings() {
  const settings = await chrome.storage.sync.get(['authEndpoint']);
  if (settings.authEndpoint) {
    document.getElementById('auth-endpoint').value = settings.authEndpoint;
  }
}

// Initialize
loadSettings();
loadAuthSettings();
checkAuthStatus();
