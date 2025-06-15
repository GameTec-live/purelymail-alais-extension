import { StorageManager } from './storage';
import { PurelymailAPI } from './api';

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

// Listen for messages from popup/settings/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSettings') {
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
    } else if (request.action === 'createAlias') {
        handleCreateAlias(request, sendResponse);
        return true; // Keep message channel open for async response
    }

    return true; // Keep the message channel open for async response
});

async function handleCreateAlias(request: any, sendResponse: (response: any) => void) {
    try {
        const { aliasName, domain, currentUrl } = request;

        // Get settings to retrieve API configuration
        const settings = await StorageManager.getSettings();
        if (!settings || !settings.apiToken) {
            sendResponse({ success: false, error: 'API token not configured. Please check your settings.' });
            return;
        }

        // Initialize API client
        const api = new PurelymailAPI({
            apiToken: settings.apiToken,
            baseUrl: 'https://purelymail.com'
        });

        // Get user information to determine target address
        const userInfo = await api.listUsers();
        const targetAddress = settings.defaultAccount || userInfo.users[0];

        if (!targetAddress) {
            sendResponse({ success: false, error: 'No target email address found. Please configure your default account.' });
            return;
        }

        // Create the routing rule
        await api.createRoutingRule({
            domainName: domain,
            prefix: false,
            matchUser: aliasName,
            targetAddresses: [targetAddress],
            catchall: false
        });

        // Store the alias creation for tracking
        await StorageManager.addCreatedAlias({
            alias: `${aliasName}@${domain}`,
            targetAddress,
            createdAt: new Date().toISOString(),
            createdFor: currentUrl || 'Unknown'
        });

        sendResponse({ success: true, alias: `${aliasName}@${domain}` });
    } catch (error) {
        console.error('Error creating alias:', error);
        sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}
