/**
 * Ask Pinnacle - Side Panel Script
 *
 * This script handles the Chrome Side Panel interface for Quick Suite Chat.
 * The side panel provides a persistent chat experience that stays open while browsing.
 */

// DOM Elements
const authRequiredView = document.getElementById('auth-required-view');
const loadingView = document.getElementById('loading-view');
const errorView = document.getElementById('error-view');
const configRequiredView = document.getElementById('config-required-view');
const quicksuiteEmbed = document.getElementById('quicksuite-embed');
const fallbackChatView = document.getElementById('fallback-chat-view');

const authIndicator = document.getElementById('auth-indicator');
const authText = document.getElementById('auth-text');
const connectionStatus = document.getElementById('connection-status');
const errorText = document.getElementById('error-text');

const refreshBtn = document.getElementById('refresh-btn');
const settingsBtn = document.getElementById('settings-btn');
const gotoLoginBtn = document.getElementById('goto-login-btn');
const gotoConfigBtn = document.getElementById('goto-config-btn');
const retryBtn = document.getElementById('retry-btn');

// Fallback chat elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');

/**
 * Show a specific view and hide all others
 * @param {string} viewId - The ID of the view to show
 */
function showView(viewId) {
  const views = [authRequiredView, loadingView, errorView, configRequiredView, quicksuiteEmbed, fallbackChatView];
  views.forEach(view => {
    if (view) {
      view.hidden = view.id !== viewId;
    }
  });
}

/**
 * Validate that a URL is HTTPS (security requirement)
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if URL is HTTPS
 */
function isHttpsUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate that a URL is from QuickSight domain
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if URL is from QuickSight
 */
function isValidQuickSightUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Must be exactly *.quicksight.aws.amazon.com or quicksight.aws.amazon.com
    // Using regex for more explicit validation
    const quicksightPattern = /^([a-z0-9-]+\.)?quicksight\.aws\.amazon\.com$/;
    return quicksightPattern.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Update authentication status display
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @param {string} username - Optional username to display
 */
function updateAuthStatus(isAuthenticated, username = '') {
  if (isAuthenticated) {
    authIndicator.classList.remove('logged-out');
    authIndicator.classList.add('logged-in');
    authText.textContent = username || 'Authenticated';
  } else {
    authIndicator.classList.remove('logged-in');
    authIndicator.classList.add('logged-out');
    authText.textContent = 'Not Logged In';
  }
}

/**
 * Update connection status
 * @param {string} status - Status message
 * @param {boolean} isError - Whether this is an error state
 */
function updateConnectionStatus(status, isError = false) {
  connectionStatus.textContent = status;
  connectionStatus.style.color = isError ? '#ef4444' : '#6b7280';
}

/**
 * Show error view with message
 * @param {string} message - Error message to display
 */
function showError(message) {
  errorText.textContent = message;
  showView('error-view');
  updateConnectionStatus('Error', true);
}

/**
 * Initialize the side panel
 */
async function initialize() {
  // FORCE SHOW THE EMBED for testing
  showView('quicksuite-embed');
  return; // Stop the rest of the logic

  console.log('[SidePanel] Initializing...');
  showView('loading-view');
  updateConnectionStatus('Connecting...');

  try {
    // Get settings from storage
    const settings = await chrome.storage.sync.get([
      'quickSuiteEnabled',
      'quickSuiteEndpoint',
      'quickSuiteAgentArn',
      'quickSuiteInitialQuery',
      'quickSuiteTopicId',
      'quickSuiteUseWrapper',
      'quickSuiteWrapperUrl',
      'authToken',
      'authExpiry',
      'username'
    ]);

    console.log('[SidePanel] Settings loaded:', {
      quickSuiteEnabled: settings.quickSuiteEnabled,
      hasEndpoint: !!settings.quickSuiteEndpoint,
      hasToken: !!settings.authToken,
      hasTopicId: !!settings.quickSuiteTopicId
    });

    // Check authentication status
    const isAuthenticated = settings.authToken &&
                           settings.authExpiry &&
                           Date.now() < settings.authExpiry;

    updateAuthStatus(isAuthenticated, settings.username);

    // Check if Quick Suite is enabled
    if (!settings.quickSuiteEnabled) {
      console.log('[SidePanel] Quick Suite not enabled, showing fallback chat');
      showView('fallback-chat-view');
      updateConnectionStatus('Quick Suite disabled');
      return;
    }

    // Check if endpoint is configured
    if (!settings.quickSuiteEndpoint) {
      console.log('[SidePanel] Quick Suite endpoint not configured');
      showView('config-required-view');
      updateConnectionStatus('Configuration required');
      return;
    }

    // Validate endpoint is HTTPS (security requirement)
    if (!isHttpsUrl(settings.quickSuiteEndpoint)) {
      console.error('[SidePanel] Endpoint must be HTTPS');
      showError('Security Error: Quick Suite endpoint must use HTTPS');
      return;
    }

    // Check authentication
    if (!isAuthenticated) {
      console.log('[SidePanel] Authentication required');
      showView('auth-required-view');
      updateConnectionStatus('Authentication required');
      return;
    }

    // Load Quick Suite embed
    await loadQuickSuiteEmbed(settings);

  } catch (error) {
    console.error('[SidePanel] Initialization error:', error);
    showError(error.message || 'Failed to initialize');
  }
}

/**
 * Load Quick Suite embedded chat
 * @param {Object} settings - Extension settings
 */
async function loadQuickSuiteEmbed(settings) {
  console.log('[SidePanel] Loading Quick Suite embed...');
  updateConnectionStatus('Loading Quick Suite...');

  try {
    // Request embed URL from background script
    const response = await chrome.runtime.sendMessage({
      action: 'getQuickSuiteEmbedUrl',
      endpoint: settings.quickSuiteEndpoint,
      agentArn: settings.quickSuiteAgentArn,
      initialQuery: settings.quickSuiteInitialQuery,
      topicId: settings.quickSuiteTopicId
    });

    console.log('[SidePanel] Embed URL response:', {
      success: response.success,
      hasUrl: !!response.url,
      requiresAuth: response.requiresAuth
    });

    // Handle authentication required
    if (!response.success && response.requiresAuth) {
      updateAuthStatus(false);
      showView('auth-required-view');
      updateConnectionStatus('Session expired');
      return;
    }

    // Handle other errors
    if (!response.success) {
      throw new Error(response.error || 'Failed to get embed URL');
    }

    const embedUrl = response.url;

    // Validate URL is from QuickSight domain (security check)
    if (!isValidQuickSightUrl(embedUrl)) {
      throw new Error(`Security Error: URL must be from QuickSight domain`);
    }

    // Check if using HTTPS wrapper approach
    if (settings.quickSuiteUseWrapper && settings.quickSuiteWrapperUrl) {
      // Validate wrapper URL is HTTPS
      if (!isHttpsUrl(settings.quickSuiteWrapperUrl)) {
        throw new Error('Security Error: Wrapper URL must use HTTPS');
      }

      // Load via HTTPS wrapper
      await loadViaWrapper(settings.quickSuiteWrapperUrl, embedUrl);
    } else {
      // Direct iframe embedding
      await loadDirectEmbed(embedUrl);
    }

    updateConnectionStatus('Connected');
    showView('quicksuite-embed');

  } catch (error) {
    console.error('[SidePanel] Failed to load embed:', error);
    showError(error.message);
  }
}

/**
 * Load QuickSight via HTTPS wrapper page
 * This is the recommended approach for Chrome extensions
 * @param {string} wrapperUrl - The HTTPS wrapper page URL
 * @param {string} embedUrl - The QuickSight embed URL
 */
async function loadViaWrapper(wrapperUrl, embedUrl) {
  console.log('[SidePanel] Loading via HTTPS wrapper');

  // Clear existing content
  quicksuiteEmbed.innerHTML = '';

  // Create iframe pointing to wrapper page
  // The wrapper page will use the QuickSight SDK to embed the chat
  const wrapperWithParams = new URL(wrapperUrl);
  wrapperWithParams.searchParams.set('embedUrl', encodeURIComponent(embedUrl));

  const iframe = document.createElement('iframe');
  iframe.src = wrapperWithParams.toString();
  iframe.title = 'Quick Suite Chat';
  iframe.allow = 'fullscreen';
  // Note: Using 'no-referrer' can cause issues with some AWS services
  // Consider 'strict-origin-when-cross-origin' for better compatibility
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';

  iframe.addEventListener('load', () => {
    console.log('[SidePanel] Wrapper iframe loaded');
  });

  iframe.addEventListener('error', (e) => {
    console.error('[SidePanel] Wrapper iframe error:', e);
    showError('Failed to load Quick Suite wrapper');
  });

  quicksuiteEmbed.appendChild(iframe);
}

/**
 * Load QuickSight directly in iframe
 * Note: This may not work due to AWS domain allowlisting restrictions
 * @param {string} embedUrl - The QuickSight embed URL
 */
async function loadDirectEmbed(embedUrl) {
  console.log('[SidePanel] Loading direct iframe embed');

  // Clear existing content
  quicksuiteEmbed.innerHTML = '';

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.title = 'Quick Suite Embedded Chat';
  iframe.referrerPolicy = 'no-referrer';
  iframe.allow = 'fullscreen';

  iframe.addEventListener('load', () => {
    console.log('[SidePanel] Direct iframe loaded');
  });

  iframe.addEventListener('error', (e) => {
    console.error('[SidePanel] Direct iframe error:', e);
    showError('Failed to load Quick Suite. You may need to use the HTTPS wrapper approach.');
  });

  quicksuiteEmbed.appendChild(iframe);
}

/**
 * Open the extension popup
 */
function openExtensionPopup() {
  // Side panel can't directly open popup, so we send a message
  // The user can click the extension icon to open settings
  chrome.runtime.sendMessage({ action: 'openPopup' });
  // Show a helpful message
  alert('Please click the Ask Pinnacle extension icon to access settings.');
}

/**
 * Add message to fallback chat
 * @param {string} content - Message content
 * @param {string} type - Message type ('user', 'bot', 'error')
 */
function addChatMessage(content, type = 'bot') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  if (type === 'bot') {
    messageDiv.innerHTML = `
      <span class="message-icon"><img src="icon-pinnacle-playful.svg" alt="Ask Pinnacle" class="bot-avatar"></span>
      <div class="message-content"><p>${escapeHtml(content)}</p></div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content"><p>${escapeHtml(content)}</p></div>
    `;
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Send message in fallback chat
 */
async function sendFallbackMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  // Add user message
  addChatMessage(message, 'user');
  chatInput.value = '';
  sendButton.disabled = true;

  try {
    // Send to background script for processing
    const response = await chrome.runtime.sendMessage({
      action: 'chat',
      message: message
    });

    if (response.error) {
      addChatMessage(`Error: ${response.error}`, 'error');
    } else {
      addChatMessage(response.reply || 'No response received.', 'bot');
    }
  } catch (error) {
    addChatMessage(`Failed to send message: ${error.message}`, 'error');
  } finally {
    sendButton.disabled = false;
    chatInput.focus();
  }
}

// Event Listeners
refreshBtn.addEventListener('click', () => {
  console.log('[SidePanel] Refresh clicked');
  initialize();
});

settingsBtn.addEventListener('click', () => {
  console.log('[SidePanel] Settings clicked');
  openExtensionPopup();
});

gotoLoginBtn.addEventListener('click', () => {
  console.log('[SidePanel] Go to login clicked');
  openExtensionPopup();
});

gotoConfigBtn.addEventListener('click', () => {
  console.log('[SidePanel] Go to config clicked');
  openExtensionPopup();
});

retryBtn.addEventListener('click', () => {
  console.log('[SidePanel] Retry clicked');
  initialize();
});

// Fallback chat event listeners
if (sendButton) {
  sendButton.addEventListener('click', sendFallbackMessage);
}

if (chatInput) {
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFallbackMessage();
    }
  });
}

// Listen for storage changes (settings updates)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    const relevantKeys = ['quickSuiteEnabled', 'quickSuiteEndpoint', 'authToken', 'authExpiry'];
    const hasRelevantChange = relevantKeys.some(key => key in changes);

    if (hasRelevantChange) {
      console.log('[SidePanel] Settings changed, reinitializing...');
      initialize();
    }
  }
});

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refreshSidePanel') {
    console.log('[SidePanel] Received refresh request');
    initialize();
    sendResponse({ success: true });
  }
  return true;
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
