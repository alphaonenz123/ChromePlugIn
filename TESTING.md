# Testing Guide

This guide explains how to test the Patient Management Chatbot Assistant extension.

## Prerequisites

1. Extension installed in Chrome or Edge (see INSTALLATION.md)
2. API key configured in Settings
3. Demo page available for RPA testing

## Testing the Extension Installation

### 1. Verify Extension Loads
- [ ] Open `chrome://extensions/` or `edge://extensions/`
- [ ] Confirm "Patient Management Chatbot Assistant" appears
- [ ] Check that status shows "Enabled"
- [ ] Verify version is 1.0.0
- [ ] Ensure no errors are displayed

### 2. Check Extension Icon
- [ ] Look for extension icon in browser toolbar
- [ ] Icon should be visible (may need to pin it)
- [ ] Click icon to open popup
- [ ] Popup should display without errors

## Testing the User Interface

### 1. Popup Opens Correctly
- [ ] Click extension icon
- [ ] Popup window appears (400px x 600px)
- [ ] All three tabs are visible: Chat, RPA Actions, Settings
- [ ] Chat tab is active by default
- [ ] Status indicator shows "Offline" (if API not configured)

### 2. Tab Navigation
- [ ] Click "Chat" tab - Chat interface appears
- [ ] Click "RPA Actions" tab - RPA buttons appear
- [ ] Click "Settings" tab - Settings form appears
- [ ] Switching tabs works smoothly without errors

### 3. Visual Design
- [ ] Header displays correct title and gradient
- [ ] Status indicator is visible
- [ ] Buttons are properly styled
- [ ] Text is readable and properly formatted
- [ ] No layout issues or overlapping elements

## Testing Settings Configuration

### 1. API Configuration
- [ ] Open Settings tab
- [ ] Enter API endpoint URL
- [ ] Enter API key (test with dummy key first)
- [ ] Select a model from dropdown
- [ ] Click "Save Settings"
- [ ] Success message appears in chat
- [ ] Status indicator updates if API key is valid

### 2. RPA Configuration
- [ ] "Auto-detect PMS" checkbox works
- [ ] PMS URL field accepts input
- [ ] Settings are saved when button clicked

### 3. Settings Persistence
- [ ] Configure settings and save
- [ ] Close popup
- [ ] Reopen popup
- [ ] Verify settings are still present

### 4. Test Connection
- [ ] Enter valid API credentials
- [ ] Click "Test API Connection"
- [ ] Should show success message
- [ ] Enter invalid API key
- [ ] Should show error message
- [ ] Status indicator should update accordingly

## Testing Chat Functionality

### 1. Without API Configuration
- [ ] Open Chat tab (without API key set)
- [ ] Type a message
- [ ] Click Send or press Enter
- [ ] Should display error: "Please configure your API key"

### 2. With API Configuration
- [ ] Configure valid API key in Settings
- [ ] Switch to Chat tab
- [ ] Type "Hello"
- [ ] Click Send
- [ ] Loading message appears
- [ ] Response from chatbot appears
- [ ] Response is properly formatted

### 3. Chat Features
- [ ] Multiple messages can be sent
- [ ] Chat history scrolls automatically
- [ ] User messages align to right
- [ ] Bot messages align to left
- [ ] Timestamps are accurate
- [ ] Enter key sends message (without Shift)
- [ ] Shift+Enter creates new line

### 4. Error Handling
- [ ] Test with invalid API key
- [ ] Verify error message displays
- [ ] Test with network disconnected
- [ ] Verify timeout/error handling
- [ ] Check that errors don't crash extension

## Testing RPA Actions

### 1. Setup Demo Environment
- [ ] Open the included `demo-pms-page.html` in browser
- [ ] Verify page loads correctly
- [ ] Page has patient form and information

### 2. Fill Patient Form Action
- [ ] On demo page, click extension icon
- [ ] Go to RPA Actions tab
- [ ] Click "Auto-Fill Patient Form"
- [ ] Verify form fields are filled
- [ ] Check action log shows success
- [ ] Fields should be highlighted briefly

### 3. Extract Patient Data Action
- [ ] On demo page with patient info visible
- [ ] Click "Extract Patient Data"
- [ ] Data should be copied to clipboard
- [ ] Paste clipboard content to verify
- [ ] Action log shows success with data count

### 4. Schedule Appointment Action
- [ ] On demo page
- [ ] Click "Schedule Appointment"
- [ ] Should find and highlight appointment button
- [ ] Action log shows button found
- [ ] Button should be clicked automatically

### 5. Generate Report Action
- [ ] On demo page
- [ ] Click "Generate Report"
- [ ] Report should be generated
- [ ] Data copied to clipboard
- [ ] Paste to verify JSON format
- [ ] Action log shows success

### 6. Search Patient Action
- [ ] On demo page
- [ ] Click "Search Patient"
- [ ] Search field should be highlighted
- [ ] Field should receive focus
- [ ] Action log confirms field found

### 7. Update Records Action
- [ ] On demo page
- [ ] Click "Update Records"
- [ ] Editable fields should be highlighted
- [ ] Action log shows number of fields found

### 8. Error Handling
- [ ] Test RPA actions on non-PMS page (e.g., google.com)
- [ ] Should show appropriate error messages
- [ ] Action log should display errors
- [ ] Extension should not crash

## Testing on Real PMS Pages

### 1. Test on Actual PMS Website
- [ ] Navigate to real Patient Management System
- [ ] Extension should detect PMS page
- [ ] Check console for "PMS page detected" message

### 2. Test RPA Actions
- [ ] Try each RPA action on real system
- [ ] Verify actions work or show meaningful errors
- [ ] Check that automation doesn't break page functionality

### 3. Safety Verification
- [ ] RPA actions should not submit forms automatically
- [ ] User should have control over actions
- [ ] No data should be sent without user action

## Browser Compatibility Testing

### Chrome
- [ ] Install extension in Chrome
- [ ] Test all features
- [ ] Check for Chrome-specific issues
- [ ] Verify console shows no errors

### Edge
- [ ] Install extension in Edge
- [ ] Test all features
- [ ] Check for Edge-specific issues
- [ ] Verify console shows no errors

## Performance Testing

### 1. Resource Usage
- [ ] Open browser task manager
- [ ] Check extension memory usage
- [ ] Should be under 50MB typically
- [ ] No memory leaks after extended use

### 2. Response Times
- [ ] Chat responses should arrive within 5-10 seconds
- [ ] RPA actions should execute within 1-2 seconds
- [ ] UI should remain responsive during operations

## Security Testing

### 1. Data Storage
- [ ] Open DevTools → Application → Storage
- [ ] Check chrome.storage.sync
- [ ] Verify API key is stored securely
- [ ] No sensitive data in localStorage

### 2. Network Traffic
- [ ] Open DevTools → Network tab
- [ ] Send a chat message
- [ ] Verify request goes to configured API endpoint
- [ ] Check that API key is in Authorization header
- [ ] Ensure HTTPS is used for API calls

### 3. Content Security
- [ ] No inline scripts in HTML
- [ ] No eval() usage in JavaScript
- [ ] All external resources are from trusted sources

## Console Testing

### 1. Check for Errors
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Install extension
- [ ] Should see: "Chatbot Assistant Background Service Worker loaded"
- [ ] Open popup
- [ ] No error messages should appear
- [ ] Warnings (if any) should be non-critical

### 2. Test RPA on Page
- [ ] Navigate to demo page
- [ ] Open Console
- [ ] Should see: "Patient Management System RPA Assistant loaded"
- [ ] Should see: "PMS page detected"

## Integration Testing

### 1. End-to-End Workflow
- [ ] Install extension
- [ ] Configure API settings
- [ ] Test connection
- [ ] Send chat message
- [ ] Navigate to demo page
- [ ] Execute RPA action
- [ ] Check action log
- [ ] Verify overall workflow

### 2. Multiple Tabs
- [ ] Open multiple browser tabs
- [ ] Open extension popup in each
- [ ] Verify settings are synchronized
- [ ] Test RPA on different tabs
- [ ] No conflicts between tabs

## Regression Testing Checklist

After making any changes:

- [ ] Extension still loads
- [ ] Popup opens correctly
- [ ] Settings save and load
- [ ] Chat functionality works
- [ ] All RPA actions work
- [ ] No new console errors
- [ ] Icons display correctly
- [ ] Documentation is updated

## Known Limitations

Document any limitations found during testing:

1. **RPA Limitations**
   - May not detect all form fields on heavily customized pages
   - JavaScript-heavy SPAs may require page reload
   - Some dynamic content may not be accessible

2. **API Limitations**
   - Response time depends on API provider
   - Rate limits apply based on API service
   - Network issues affect functionality

3. **Browser Limitations**
   - Some pages may have CSP that blocks content scripts
   - Iframe content may not be accessible
   - Cross-origin restrictions apply

## Reporting Issues

When reporting issues, include:

1. Browser version (Chrome/Edge)
2. Extension version
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (if any)
6. Screenshots (if applicable)

## Manual Test Results Template

```
Test Date: [DATE]
Tester: [NAME]
Browser: [Chrome/Edge] [VERSION]
Extension Version: 1.0.0

| Test Category | Status | Notes |
|--------------|--------|-------|
| Installation | ✅/❌ | |
| UI Display | ✅/❌ | |
| Settings | ✅/❌ | |
| Chat | ✅/❌ | |
| RPA Actions | ✅/❌ | |
| Error Handling | ✅/❌ | |
| Performance | ✅/❌ | |
| Security | ✅/❌ | |

Overall Result: ✅ PASS / ❌ FAIL

Additional Notes:
[Add any additional observations]
```

## Automated Testing (Future Enhancement)

Consider adding:
- Jest for unit testing
- Puppeteer for E2E testing
- ESLint for code quality
- Chrome Extension testing framework
