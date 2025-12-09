// Background Service Worker for Chatbot Assistant
console.log('Chatbot Assistant Background Service Worker loaded');

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'chat') {
    handleChatRequest(request, sendResponse);
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'testConnection') {
    testApiConnection(request, sendResponse);
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'rpaNotification') {
    // Handle RPA action notifications
    console.log('RPA Action:', request.data);
    sendResponse({ success: true });
    return false;
  }
});

// Handle chat requests to API
async function handleChatRequest(request, sendResponse) {
  const { message, settings } = request;
  
  try {
    const apiUrl = settings.apiUrl || 'https://api.openai.com/v1/chat/completions';
    const apiKey = settings.apiKey;
    const model = settings.model || 'gpt-3.5-turbo';
    
    if (!apiKey) {
      sendResponse({
        success: false,
        error: 'API key not configured'
      });
      return;
    }
    
    // Build the API request
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for a Patient Management System. Help users with their queries about patient management, appointments, records, and provide guidance on common tasks.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    };
    
    // Make API call
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract reply from response
    const reply = data.choices?.[0]?.message?.content || 'No response received';
    
    sendResponse({
      success: true,
      reply: reply
    });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Test API connection
async function testApiConnection(request, sendResponse) {
  const { apiUrl, apiKey } = request;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
    });
    
    if (response.ok) {
      sendResponse({ success: true });
    } else {
      const errorData = await response.json().catch(() => ({}));
      sendResponse({
        success: false,
        error: errorData.error?.message || `Status ${response.status}`
      });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// Install event - set default settings and create context menu
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');
  
  // Set default settings if not already set
  const settings = await chrome.storage.sync.get(['apiUrl', 'model', 'autoDetectPms']);
  
  const defaults = {};
  
  if (!settings.apiUrl) {
    defaults.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }
  
  if (!settings.model) {
    defaults.model = 'gpt-3.5-turbo';
  }
  
  if (settings.autoDetectPms === undefined) {
    defaults.autoDetectPms = true;
  }
  
  if (Object.keys(defaults).length > 0) {
    await chrome.storage.sync.set(defaults);
  }
  
  // Create context menu for selected text
  chrome.contextMenus.create({
    id: 'askChatbot',
    title: 'Ask Chatbot about "%s"',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'askChatbot') {
    // Send selected text to chatbot
    const selectedText = info.selectionText;
    
    // Open popup or send notification
    chrome.action.openPopup();
  }
});
