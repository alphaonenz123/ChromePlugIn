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

// Truncate payload sections to fit within character limit while preserving JSON structure
function truncatePayload(payload, maxChars = 4000) {
  const truncated = {
    ...payload,
    sections: {}
  };

  // Preserve metadata (sourceUrl, pageTitle, capturedAt, demographics)
  // These are small and essential for context
  
  const sections = payload.sections || {};
  const sectionKeys = Object.keys(sections);
  
  // Calculate actual overhead from JSON structure and metadata
  const metadataText = JSON.stringify({
    sourceUrl: payload.sourceUrl,
    pageTitle: payload.pageTitle,
    capturedAt: payload.capturedAt,
    demographics: payload.demographics
  }, null, 2);
  
  // Measure structural overhead by creating a minimal sections object
  const minimalSections = {};
  sectionKeys.forEach(key => { minimalSections[key] = []; });
  const minimalPayload = { ...payload, sections: minimalSections };
  const structuralOverhead = JSON.stringify(minimalPayload, null, 2).length - metadataText.length;
  
  const availableChars = maxChars - metadataText.length - structuralOverhead;
  
  if (availableChars <= 0) {
    // If metadata alone exceeds limit, return minimal payload
    return truncated;
  }
  
  // Array element overhead: accounts for comma (1), newline (1), and indentation (6 spaces for nested arrays)
  // Measured from typical JSON.stringify(arr, null, 2) formatting
  const ARRAY_ELEMENT_OVERHEAD = 8;
  
  // Distribute available characters across sections
  const charsPerSection = Math.floor(availableChars / Math.max(sectionKeys.length, 1));
  
  for (const key of sectionKeys) {
    const items = sections[key] || [];
    const truncatedItems = [];
    let currentLength = 0;
    
    for (const item of items) {
      const itemLength = JSON.stringify(item).length + ARRAY_ELEMENT_OVERHEAD;
      if (currentLength + itemLength <= charsPerSection) {
        truncatedItems.push(item);
        currentLength += itemLength;
      } else {
        break;
      }
    }
    
    if (truncatedItems.length > 0) {
      truncated.sections[key] = truncatedItems;
    }
  }
  
  return truncated;
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
    const truncatedPayload = truncatePayload(payload, 4000);
    const payloadText = JSON.stringify(truncatedPayload, null, 2);

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
