# Patient Management Chatbot Assistant

A powerful Chrome and Edge browser extension that provides AI-powered chatbot assistance and RPA (Robotic Process Automation) capabilities for Patient Management Systems.

## Features

### 🤖 AI Chatbot
- Interactive chat interface powered by OpenAI API (or custom API endpoint)
- Context-aware responses for patient management queries
- Real-time conversation with AI assistant
- Customizable API endpoints and models

### 🔄 RPA Automation
The extension includes intelligent automation for common Patient Management System tasks:

1. **Auto-Fill Patient Form** - Automatically populates patient forms with sample data
2. **Extract Patient Data** - Extracts and copies patient information from the current page
3. **Schedule Appointment** - Locates and activates appointment scheduling controls
4. **Generate Report** - Creates a summary report of visible patient data
5. **Search Patient** - Finds and focuses the patient search field
6. **Update Records** - Identifies editable fields for record updates

### 🎯 Smart Features
- Automatic PMS page detection
- Visual highlighting of affected elements
- Action logging and history
- Secure API key storage
- Cross-browser compatibility (Chrome & Edge)

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome or Edge browser
3. Navigate to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked"
6. Select the extension directory containing `manifest.json`

### Configuration

1. Click the extension icon in your browser toolbar
2. Navigate to the "Settings" tab
3. Configure your API settings:
   - **API Endpoint URL**: Enter your chatbot API URL (default: OpenAI)
   - **API Key**: Enter your API key (stored securely)
   - **Model**: Select the AI model to use
4. Configure RPA settings:
   - **Auto-detect PMS**: Enable automatic Patient Management System detection
   - **PMS URL Pattern**: Set URL patterns for your PMS (e.g., `*://pms.hospital.com/*`)
5. Click "Save Settings"

## Usage

### Using the Chatbot

1. Click the extension icon to open the popup
2. Type your question or request in the chat input
3. Press Enter or click the send button
4. The AI assistant will respond with helpful information

**Example queries:**
- "How do I schedule a patient appointment?"
- "What information is needed for patient registration?"
- "Explain the process for updating patient records"

### Using RPA Actions

1. Navigate to a Patient Management System page
2. Click the extension icon
3. Select the "RPA Actions" tab
4. Click on any quick action button:
   - 📝 **Auto-Fill Patient Form** - Fills forms with sample data
   - 📊 **Extract Patient Data** - Copies patient info to clipboard
   - 📅 **Schedule Appointment** - Opens appointment scheduler
   - 📄 **Generate Report** - Creates and copies a data report
   - 🔍 **Search Patient** - Focuses the search field
   - ✏️ **Update Records** - Highlights editable fields
5. Monitor the action log for results

## API Configuration

### OpenAI API (Default)

To use OpenAI's ChatGPT:
1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Enter the API key in Settings
3. Select your preferred model (GPT-3.5-turbo, GPT-4, etc.)

### Custom API Endpoint

The extension supports any OpenAI-compatible API:
1. Set your custom API endpoint URL in Settings
2. Ensure your API follows the OpenAI chat completions format
3. Enter your API authentication key

Example API request format:
```json
{
  "model": "your-model",
  "messages": [
    {"role": "system", "content": "System prompt"},
    {"role": "user", "content": "User message"}
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

## Architecture

### Files Structure
```
ChromePlugIn/
├── manifest.json           # Extension configuration
├── popup.html             # Chat interface UI
├── popup.css              # Styling for popup
├── popup.js               # Popup logic and event handlers
├── background.js          # Service worker for API calls
├── content.js             # Content script for RPA automation
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # Documentation
```

### Components

#### Manifest (manifest.json)
- Uses Manifest V3 for modern Chrome/Edge compatibility
- Declares permissions, content scripts, and background service worker
- Compatible with both Chrome and Edge browsers

#### Popup (popup.html/js/css)
- Three-tab interface: Chat, RPA Actions, Settings
- Real-time chat with visual feedback
- Quick action buttons for RPA automation
- Settings management with secure storage

#### Background Service Worker (background.js)
- Handles API communication
- Manages extension state
- Processes messages from popup and content scripts

#### Content Script (content.js)
- Injected into all web pages
- Performs RPA actions on the page DOM
- Detects Patient Management System pages
- Provides intelligent form filling and data extraction

## Security

- API keys are stored securely using Chrome's `chrome.storage.sync` API
- No sensitive data is transmitted to third parties except your configured API endpoint
- All API communication uses HTTPS
- API keys are never logged or exposed in the console

## Troubleshooting

### Chatbot not responding
1. Check that you've configured a valid API key in Settings
2. Test the API connection using the "Test API Connection" button
3. Verify your internet connection
4. Check browser console for error messages

### RPA actions not working
1. Ensure you're on a supported Patient Management System page
2. Check that the page has loaded completely
3. Some pages may use custom elements that aren't detected automatically
4. Review the action log for specific error messages

### Extension not loading
1. Verify all required files are present in the extension directory
2. Check for errors in `chrome://extensions/` or `edge://extensions/`
3. Try removing and reloading the extension
4. Ensure you're using a compatible browser version

## Browser Compatibility

- ✅ Google Chrome (Version 88+)
- ✅ Microsoft Edge (Version 88+)
- ✅ Chromium-based browsers supporting Manifest V3

## Development

### Adding New RPA Actions

To add a new RPA action:

1. Add a button in `popup.html`:
```html
<button class="action-btn" data-action="yourActionName">
  🎯 Your Action Name
</button>
```

2. Implement the action in `content.js`:
```javascript
async function yourActionName() {
  // Your automation logic here
  return 'Success message';
}
```

3. Add the case in `handleRpaAction()` switch statement

### Customizing the API Integration

Modify `background.js` to integrate with different API endpoints or change the request/response format.

## Privacy Policy

This extension:
- Only communicates with your configured API endpoint
- Stores API keys locally in browser storage
- Does not collect or transmit personal information
- Does not track user behavior
- Operates entirely client-side except for API calls

## License

MIT License - Feel free to modify and distribute as needed.

## Support

For issues, questions, or contributions, please visit the project repository.

## Version History

### Version 1.0.0
- Initial release
- AI chatbot integration with OpenAI API support
- Six core RPA automation actions
- Three-tab interface (Chat, RPA, Settings)
- Automatic PMS detection
- Secure API key storage
- Chrome and Edge compatibility
