/**
 * Quick Suite Side Panel
 *
 * Simplified implementation that loads a single hosted app URL.
 * All authentication and configuration is handled by the hosted app,
 * not the extension.
 */

const loadingView = document.getElementById('loading-view');
const setupView = document.getElementById('setup-view');
const appFrame = document.getElementById('app-frame');

const refreshBtn = document.getElementById('refresh-btn');
const settingsBtn = document.getElementById('settings-btn');
const openSettingsBtn = document.getElementById('open-settings');

/**
 * Show a specific view
 */
function showView(view) {
  loadingView.hidden = view !== 'loading';
  setupView.hidden = view !== 'setup';
  appFrame.hidden = view !== 'app';
}

/**
 * Validate URL is HTTPS
 */
function isValidHttpsUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Load the Quick Suite app
 */
async function loadApp() {
  showView('loading');

  try {
    const { quickSuiteUrl } = await chrome.storage.sync.get(['quickSuiteUrl']);

    if (!quickSuiteUrl) {
      console.log('[SidePanel] No URL configured');
      showView('setup');
      return;
    }

    if (!isValidHttpsUrl(quickSuiteUrl)) {
      console.error('[SidePanel] Invalid URL - must be HTTPS');
      showView('setup');
      return;
    }

    console.log('[SidePanel] Loading:', quickSuiteUrl);

    // Set iframe source and show it
    appFrame.src = quickSuiteUrl;

    appFrame.onload = () => {
      console.log('[SidePanel] App loaded');
      showView('app');
    };

    appFrame.onerror = () => {
      console.error('[SidePanel] Failed to load app');
      showView('setup');
    };

    // Show app view (iframe will show loading state from hosted app)
    showView('app');

  } catch (error) {
    console.error('[SidePanel] Error:', error);
    showView('setup');
  }
}

/**
 * Reload the app
 */
function reloadApp() {
  if (appFrame.src) {
    appFrame.src = appFrame.src;
  } else {
    loadApp();
  }
}

/**
 * Open extension popup for settings
 */
function openSettings() {
  chrome.runtime.openOptionsPage?.() ||
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
}

// Event listeners
refreshBtn.addEventListener('click', reloadApp);
settingsBtn.addEventListener('click', openSettings);
openSettingsBtn.addEventListener('click', openSettings);

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.quickSuiteUrl) {
    console.log('[SidePanel] URL changed, reloading');
    loadApp();
  }
});

// Initialize
loadApp();
