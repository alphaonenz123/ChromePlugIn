// Background Service Worker for Chatbot Assistant
console.log('[Background] Ask Pinnacle Background Service Worker loaded');

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', {
    action: request.action,
    senderId: sender?.id,
    tabId: sender?.tab?.id
  });
  
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
    console.log('[Background] RPA Action:', request.data);
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'summarizeHistory') {
    handleSummaryRequest(request, sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.action === 'checkAuth') {
    checkAuthStatus(request, sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.action === 'login') {
    handleLogin(request, sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.action === 'logout') {
    handleLogout(request, sendResponse);
    return true; // Will respond asynchronously
  }

  if (request.action === 'getQuickSuiteEmbedUrl') {
    getQuickSuiteEmbedUrl(request, sendResponse);
    return true; // Will respond asynchronously
  }
  
  // Unknown action
  console.warn('[Background] Unknown action:', request.action);
  return false;
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
          content: 'You are Ask Pinnacle, a friendly and playful AI assistant from Pinnacle Health (pinnacle.health.nz). You help healthcare professionals with practice management tasks in a warm, approachable way. Use friendly language, occasionally add emojis 😊, and make interactions feel positive and supportive. You are knowledgeable about practice management, appointments, records, and healthcare workflows, but you communicate in a conversational, cheerful tone that puts people at ease.'
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

// Summarize Indici patient history
async function handleSummaryRequest(request, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey', 'model']);
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

    const payload = request.payload || {};
    const payloadText = buildSummaryPayload(payload, 4000);

    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are Ask Pinnacle, a helpful clinical assistant. Summarize patient history from extracted Indici data. Use concise bullet points, call out allergies, problems, medications, and recent timeline items. If a section is missing, explicitly say "Not available." Do not invent details.'
        },
        {
          role: 'user',
          content: `Summarize the following Indici extraction:\n${payloadText}`
        }
      ],
      temperature: 0.2,
      max_tokens: 350
    };

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
    const summary = data.choices?.[0]?.message?.content || 'No summary returned.';

    sendResponse({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Summary API Error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

function buildSummaryPayload(payload, maxChars) {
  const truncateString = (value, limit) => {
    if (value === null || value === undefined) {
      return value;
    }
    const text = String(value);
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  };

  const limited = {
    sourceUrl: payload.sourceUrl,
    pageTitle: payload.pageTitle,
    capturedAt: payload.capturedAt,
    demographics: {},
    sections: {}
  };

  const demographics = payload.demographics || {};
  Object.entries(demographics).forEach(([key, value]) => {
    if (value) {
      limited.demographics[key] = truncateString(value, 120);
    }
  });

  const sections = payload.sections || {};
  Object.entries(sections).forEach(([key, lines]) => {
    if (Array.isArray(lines)) {
      limited.sections[key] = lines.slice(0, 25).map(line => truncateString(line, 200));
    }
  });

  let json = JSON.stringify(limited, null, 2);
  if (json.length <= maxChars) {
    return json;
  }

  const minimized = {
    sourceUrl: limited.sourceUrl,
    capturedAt: limited.capturedAt,
    demographics: limited.demographics,
    sectionKeys: Object.keys(limited.sections)
  };

  json = JSON.stringify(minimized, null, 2);
  if (json.length <= maxChars) {
    return json;
  }

  return JSON.stringify({
    note: 'Payload too large; omitted details.',
    sectionKeys: Object.keys(limited.sections)
  });
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
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
  
  try {
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
      console.log('[Background] Default settings applied:', defaults);
    }
    
    // Create context menu for selected text
    chrome.contextMenus.create({
      id: 'askChatbot',
      title: 'Ask Pinnacle about "%s"',
      contexts: ['selection']
    });
    console.log('[Background] Context menu created');
  } catch (error) {
    console.error('[Background] Error during installation:', error);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[Background] Context menu clicked:', info.menuItemId);
  
  if (info.menuItemId === 'askChatbot') {
    // Send selected text to chatbot
    const selectedText = info.selectionText;
    console.log('[Background] Selected text:', selectedText?.substring(0, 50));
    
    // Open popup
    try {
      await chrome.action.openPopup();
      console.log('[Background] Popup opened');
    } catch (error) {
      console.error('[Background] Failed to open popup:', error);
    }
  }
});

// ===========================
// Authentication Management
// ===========================

/**
 * Check authentication status for Quick Suite endpoint
 * Attempts to verify session by calling a health/auth check endpoint
 */
async function checkAuthStatus(request, sendResponse) {
  const { endpoint } = request;
  
  try {
    console.log('[Auth] Checking authentication status for:', endpoint);
    
    // Get stored auth token if any
    const storage = await chrome.storage.sync.get(['authToken', 'authExpiry', 'username']);
    
    // Check if token exists and is not expired
    if (storage.authToken && storage.authExpiry) {
      const now = Date.now();
      if (now < storage.authExpiry) {
        console.log('[Auth] Valid token found, checking with endpoint...');
        
        // Verify with endpoint if provided
        if (endpoint) {
          const isValid = await verifyTokenWithEndpoint(endpoint, storage.authToken);
          if (isValid) {
            sendResponse({
              success: true,
              authenticated: true,
              username: storage.username,
              expiresAt: storage.authExpiry
            });
            return;
          }
        } else {
          // No endpoint to verify, trust local token
          sendResponse({
            success: true,
            authenticated: true,
            username: storage.username,
            expiresAt: storage.authExpiry
          });
          return;
        }
      } else {
        console.log('[Auth] Token expired, clearing...');
        await chrome.storage.sync.remove(['authToken', 'authExpiry', 'username']);
      }
    }
    
    sendResponse({
      success: true,
      authenticated: false
    });
  } catch (error) {
    console.error('[Auth] Error checking auth status:', error);
    sendResponse({
      success: false,
      authenticated: false,
      error: error.message
    });
  }
}

/**
 * Verify token with endpoint
 */
async function verifyTokenWithEndpoint(endpoint, token) {
  try {
    // Construct auth check URL from endpoint
    // Assumes endpoint has a /auth/check or similar endpoint
    const baseUrl = new URL(endpoint).origin;
    const authCheckUrl = `${baseUrl}/auth/check`;
    
    const response = await fetch(authCheckUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('[Auth] Error verifying token:', error);
    return false;
  }
}

/**
 * Handle login request
 * Supports token-based authentication
 */
async function handleLogin(request, sendResponse) {
  const { endpoint, username, password, token } = request;
  
  try {
    console.log('[Auth] Login request for endpoint:', endpoint);
    
    let authToken = token;
    let authExpiry = null;
    
    // If token not provided, attempt to get it via username/password
    if (!authToken && username && password) {
      console.log('[Auth] Attempting login with credentials...');
      
      const baseUrl = new URL(endpoint).origin;
      const loginUrl = `${baseUrl}/auth/login`;
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Login failed with status ${response.status}`);
      }
      
      const data = await response.json();
      authToken = data.token || data.access_token || data.accessToken;
      
      // Calculate expiry from response
      if (data.expiresIn) {
        authExpiry = Date.now() + (data.expiresIn * 1000);
      } else if (data.expiresAt) {
        authExpiry = new Date(data.expiresAt).getTime();
      } else {
        // Default to 24 hours if not specified
        authExpiry = Date.now() + (24 * 60 * 60 * 1000);
      }
      
      if (!authToken) {
        throw new Error('No token received from login endpoint');
      }
    } else if (authToken) {
      // Token provided directly, set default expiry
      authExpiry = Date.now() + (24 * 60 * 60 * 1000);
    } else {
      throw new Error('Either token or username/password must be provided');
    }
    
    // Store auth information securely
    await chrome.storage.sync.set({
      authToken: authToken,
      authExpiry: authExpiry,
      username: username || 'Token User'
    });
    
    console.log('[Auth] Login successful, token stored');
    
    sendResponse({
      success: true,
      authenticated: true,
      username: username || 'Token User',
      expiresAt: authExpiry
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    sendResponse({
      success: false,
      authenticated: false,
      error: error.message
    });
  }
}

/**
 * Handle logout request
 */
async function handleLogout(request, sendResponse) {
  try {
    console.log('[Auth] Logout request');
    
    // Clear auth data from storage
    await chrome.storage.sync.remove(['authToken', 'authExpiry', 'username']);
    
    console.log('[Auth] Logout successful, auth data cleared');
    
    sendResponse({
      success: true,
      authenticated: false
    });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get Quick Suite embed URL with authentication
 * This wraps the embed URL fetch with auth token handling
 */
async function getQuickSuiteEmbedUrl(request, sendResponse) {
  const { endpoint, agentArn, initialQuery } = request;
  
  try {
    console.log('[Auth] Fetching Quick Suite embed URL with auth');
    
    // Get stored auth token
    const storage = await chrome.storage.sync.get(['authToken', 'authExpiry']);
    
    // Check if token is valid
    if (!storage.authToken || !storage.authExpiry || Date.now() >= storage.authExpiry) {
      sendResponse({
        success: false,
        requiresAuth: true,
        error: 'Authentication required. Please login first.'
      });
      return;
    }
    
    // Make authenticated request to get embed URL
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storage.authToken}`
      },
      body: JSON.stringify({
        agentArn,
        initialQuery
      })
    });
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      // Clear invalid token
      await chrome.storage.sync.remove(['authToken', 'authExpiry', 'username']);
      
      sendResponse({
        success: false,
        requiresAuth: true,
        error: 'Session expired. Please login again.'
      });
      return;
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data?.url) {
      throw new Error('Embed URL response did not include a "url" field');
    }
    
    sendResponse({
      success: true,
      url: data.url
    });
  } catch (error) {
    console.error('[Auth] Error fetching embed URL:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}
