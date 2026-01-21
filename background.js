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

  if (request.action === 'summarizeHistory') {
    handleSummaryRequest(request, sendResponse);
    return true; // Will respond asynchronously
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
    title: 'Ask Pinnacle about "%s"',
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
