// TrustGuard Background Service Worker
// This script runs in the background and handles extension lifecycle events

class TrustGuardBackground {
    constructor() {
        this.init();
    }
    
    init() {
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });
        
        // Handle extension startup
        chrome.runtime.onStartup.addListener(() => {
            this.handleStartup();
        });
        
        // Handle messages from popup and content scripts
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });
        
        // Handle tab updates (optional - for future features)
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });
    }
    
    handleInstallation(details) {
        console.log('TrustGuard extension installed:', details.reason);
        
        // Set up any initial data or settings
        if (details.reason === 'install') {
            this.setupInitialData();
        } else if (details.reason === 'update') {
            this.handleUpdate(details.previousVersion);
        }
    }
    
    handleStartup() {
        console.log('TrustGuard extension started');
        // Any startup tasks can go here
    }
    
    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getExtensionInfo':
                sendResponse({
                    name: 'TrustGuard',
                    version: '1.0.0',
                    description: 'Misinformation Detection Extension'
                });
                break;
                
            case 'logScan':
                this.logScan(request.data);
                sendResponse({ success: true });
                break;
                
            case 'getScanHistory':
                this.getScanHistory().then(history => {
                    sendResponse({ history });
                });
                break;
                
            default:
                console.log('Unknown message action:', request.action);
                sendResponse({ error: 'Unknown action' });
        }
    }
    
    handleTabUpdate(tabId, changeInfo, tab) {
        // Optional: Handle tab updates for future features
        // For example, you could automatically scan certain types of pages
        if (changeInfo.status === 'complete' && tab.url) {
            // Future: Auto-scan certain domains or page types
        }
    }
    
    setupInitialData() {
        // Initialize any storage or default settings
        chrome.storage.local.set({
            scanHistory: [],
            settings: {
                autoScan: false,
                suspiciousKeywords: [
                    'miracle cure', 'you won\'t believe', 'shocking',
                    'secret revealed', 'doctors hate this', 'one weird trick'
                ]
            }
        }, () => {
            console.log('TrustGuard initial data set up');
        });
    }
    
    handleUpdate(previousVersion) {
        console.log('TrustGuard updated from version:', previousVersion);
        // Handle any migration or update tasks
    }
    
    logScan(scanData) {
        // Store scan results for history (optional feature)
        chrome.storage.local.get(['scanHistory'], (result) => {
            const history = result.scanHistory || [];
            const newEntry = {
                timestamp: Date.now(),
                url: scanData.url,
                trustScore: scanData.trustScore,
                keywordsFound: scanData.keywordsFound,
                totalKeywords: scanData.totalKeywords
            };
            
            // Keep only last 100 scans
            history.unshift(newEntry);
            if (history.length > 100) {
                history.pop();
            }
            
            chrome.storage.local.set({ scanHistory: history });
        });
    }
    
    async getScanHistory() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['scanHistory'], (result) => {
                resolve(result.scanHistory || []);
            });
        });
    }
    
    // Utility method to get current tab info
    async getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }
}

// Initialize the background script
new TrustGuardBackground();

// Log that the background script is loaded
console.log('TrustGuard background script loaded'); 