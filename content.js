// TrustGuard Content Script
// This script is injected into web pages to extract visible text content

class TrustGuardContentScript {
    constructor() {
        this.init();
    }
    
    init() {
        // Listen for messages from the popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'extractText') {
                const text = this.extractVisibleText();
                sendResponse({ text });
            }
        });
    }
    
    extractVisibleText() {
        try {
            // Create a tree walker to traverse all text nodes
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        // Check if the node's parent element is visible
                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;
                        
                        const style = window.getComputedStyle(parent);
                        
                        // Reject if element is hidden
                        if (style.display === 'none' || 
                            style.visibility === 'hidden' || 
                            style.opacity === '0' ||
                            parent.offsetParent === null) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        
                        // Reject if text is empty or only whitespace
                        const text = node.textContent.trim();
                        if (!text || text.length === 0) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        
                        // Reject common hidden elements
                        const tagName = parent.tagName.toLowerCase();
                        const className = parent.className.toLowerCase();
                        const id = parent.id.toLowerCase();
                        
                        if (tagName === 'script' || 
                            tagName === 'style' || 
                            tagName === 'noscript' ||
                            className.includes('hidden') ||
                            className.includes('sr-only') ||
                            id.includes('hidden') ||
                            id.includes('sr-only')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            const textNodes = [];
            let node;
            
            // Collect all visible text nodes
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text && text.length > 0) {
                    textNodes.push(text);
                }
            }
            
            // Join all text and normalize
            const fullText = textNodes.join(' ');
            
            // Clean up the text
            return this.cleanText(fullText);
            
        } catch (error) {
            console.error('TrustGuard: Error extracting text:', error);
            return '';
        }
    }
    
    cleanText(text) {
        // Remove extra whitespace and normalize
        return text
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/\n+/g, ' ')  // Replace newlines with spaces
            .replace(/\t+/g, ' ')  // Replace tabs with spaces
            .trim()
            .toLowerCase();
    }
    
    // Alternative method using innerText (simpler but less comprehensive)
    extractTextSimple() {
        try {
            // Get all text content from the body
            const bodyText = document.body.innerText || document.body.textContent || '';
            
            // Clean and return
            return this.cleanText(bodyText);
        } catch (error) {
            console.error('TrustGuard: Error extracting text (simple method):', error);
            return '';
        }
    }
    
    // Method to get text from specific elements (for more targeted extraction)
    extractTextFromElements(selectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'article', 'main']) {
        try {
            const textParts = [];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const text = element.textContent.trim();
                    if (text && text.length > 0) {
                        textParts.push(text);
                    }
                });
            });
            
            return this.cleanText(textParts.join(' '));
        } catch (error) {
            console.error('TrustGuard: Error extracting text from elements:', error);
            return '';
        }
    }
}

// Initialize the content script
new TrustGuardContentScript();

// Log that the content script is loaded (for debugging)
console.log('TrustGuard content script loaded'); 