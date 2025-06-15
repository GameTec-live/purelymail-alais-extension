import { StorageManager } from './storage';

// Handle extension installation and first run
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        // Open settings page on first install
        const isFirstRun = await StorageManager.isFirstRun();
        if (isFirstRun) {
            chrome.runtime.openOptionsPage();
        }
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
    // Check if it's still the first run
    const isFirstRun = await StorageManager.isFirstRun();
    if (isFirstRun) {
        chrome.runtime.openOptionsPage();
    }
});

// Listen for messages from popup/settings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSettings') {
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
    }

    return true; // Keep the message channel open for async response
});
