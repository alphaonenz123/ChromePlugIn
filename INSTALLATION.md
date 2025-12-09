# Installation Guide

This guide will walk you through installing the Patient Management Chatbot Assistant extension in Chrome or Edge.

## Prerequisites

- Google Chrome (version 88 or later) or Microsoft Edge (version 88 or later)
- An API key for the chatbot service (e.g., OpenAI API key)

## Step 1: Download the Extension

Download or clone this repository to your local machine:

```bash
git clone https://github.com/alphaonenz123/ChromePlugIn.git
```

Or download as a ZIP file and extract it to a folder on your computer.

## Step 2: Open Extension Management

### For Chrome:
1. Open Google Chrome
2. Click the three-dot menu icon in the top-right corner
3. Go to **More tools** > **Extensions**
4. Or directly navigate to: `chrome://extensions/`

### For Edge:
1. Open Microsoft Edge
2. Click the three-dot menu icon in the top-right corner
3. Go to **Extensions**
4. Or directly navigate to: `edge://extensions/`

## Step 3: Enable Developer Mode

1. In the Extensions page, look for **Developer mode** toggle in the top-right corner
2. Turn ON the Developer mode switch

## Step 4: Load the Extension

1. Click the **Load unpacked** button (appears after enabling Developer mode)
2. Navigate to the folder where you downloaded/extracted the extension
3. Select the folder containing `manifest.json` file
4. Click **Select Folder** (or **Open** on Mac)

## Step 5: Verify Installation

You should now see the Patient Management Chatbot Assistant in your extensions list:
- Extension icon should appear in your browser toolbar
- Status should show as "Enabled"
- Version should display as 1.0.0

## Step 6: Configure the Extension

1. Click the extension icon in your browser toolbar (puzzle piece icon or extension icon)
2. The popup window will open with three tabs
3. Navigate to the **Settings** tab
4. Configure the following:

### API Configuration:
- **API Endpoint URL**: Enter your API endpoint
  - Default: `https://api.openai.com/v1/chat/completions`
  - Or use your custom endpoint
- **API Key**: Enter your API key
  - For OpenAI: Get your key from https://platform.openai.com/
  - Keep this key secure and never share it
- **Model**: Select your preferred model
  - Options: GPT-3.5 Turbo, GPT-4, GPT-4 Turbo, or Custom

### RPA Settings:
- **Auto-detect PMS**: Keep this checked (recommended)
- **PMS URL Pattern**: Enter URL patterns for your Patient Management System
  - Example: `*://pms.hospital.com/*`
  - Use wildcards (*) to match multiple URLs

5. Click **Save Settings**

## Step 7: Test the Connection

1. In the Settings tab, click **Test API Connection**
2. Wait for the result:
   - ✅ "Connection successful!" - You're ready to go!
   - ❌ "Connection failed" - Check your API key and endpoint

## Step 8: Start Using the Extension

### To use the Chatbot:
1. Click the extension icon
2. Type a message in the Chat tab
3. Press Enter or click the send button

### To use RPA features:
1. Navigate to your Patient Management System
2. Click the extension icon
3. Go to the **RPA Actions** tab
4. Click any quick action button to automate tasks

## Troubleshooting

### Extension not showing in toolbar
- Check if the extension is enabled in the Extensions page
- Try pinning the extension: Click the puzzle piece icon → Click the pin icon next to the extension

### Can't load extension
- Make sure you selected the correct folder (the one with manifest.json)
- Check that all files are present in the folder
- Try disabling and re-enabling the extension

### API connection fails
- Verify your API key is correct
- Check your internet connection
- Ensure the API endpoint URL is correct
- Check if your API service has any usage limits or restrictions

### RPA actions not working
- Ensure you're on a Patient Management System page
- Check that JavaScript is enabled in your browser
- Some pages may have security restrictions that prevent automation

## Updating the Extension

When a new version is released:

1. Download the new version
2. Go to the Extensions page
3. Click **Remove** on the old version
4. Follow Steps 4-7 above to install the new version
5. Your settings should be preserved (stored in browser sync storage)

## Uninstalling

To remove the extension:

1. Go to the Extensions page (`chrome://extensions/` or `edge://extensions/`)
2. Find "Patient Management Chatbot Assistant"
3. Click **Remove**
4. Confirm the removal

Note: This will delete all stored settings including your API key.

## Security Notes

- Your API key is stored locally in your browser's secure storage
- The extension only communicates with your configured API endpoint
- No data is sent to third parties
- Always keep your API key confidential
- Consider using environment-specific API keys for testing vs. production

## Need Help?

If you encounter any issues:
1. Check the browser console for error messages (F12 → Console tab)
2. Review the README.md file for detailed usage instructions
3. Open an issue on the project repository
4. Contact your system administrator if using in an enterprise environment

## Next Steps

- Read the [README.md](README.md) for detailed feature documentation
- Review the [API Configuration](#step-6-configure-the-extension) section for advanced setup
- Explore all RPA actions in the extension's RPA Actions tab
- Customize the extension for your specific Patient Management System needs
