// Popup JavaScript for Chatbot Assistant
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const actionLog = document.getElementById('action-log');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');

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
  const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'model', 'autoDetectPms', 'pmsUrl']);
  
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
  
  // Update status indicator
  if (settings.apiKey) {
    updateStatus(true);
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
  const settings = {
    apiUrl: document.getElementById('api-url').value,
    apiKey: document.getElementById('api-key').value,
    model: document.getElementById('model-select').value,
    autoDetectPms: document.getElementById('auto-detect-pms').checked,
    pmsUrl: document.getElementById('pms-url').value
  };
  
  await chrome.storage.sync.set(settings);
  
  // Show success message
  addMessage('Settings saved successfully!', 'bot');
  
  // Update status
  if (settings.apiKey) {
    updateStatus(true);
  }
  
  // Switch back to chat tab
  document.querySelector('[data-tab="chat"]').click();
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

// Initialize
loadSettings();
