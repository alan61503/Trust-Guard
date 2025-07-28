// TrustGuard Content Script
// This script is injected into web pages to extract visible text content

class TrustGuardContentScript {
    constructor() {
        this.suspiciousKeywords = [
            'miracle cure', 'miracle treatment', 'miracle solution',
            'secret revealed', 'secret exposed', 'secret uncovered',
            'plandemic', 'planned pandemic', 'fake pandemic',
            'banned by media', 'media doesn\'t want you to know',
            'you won\'t believe', 'you won\'t believe what happened',
            'shocking', 'shocking truth', 'shocking discovery',
            'doctors hate this', 'doctors don\'t want you to know',
            'one weird trick', 'one simple trick', 'one easy trick',
            'lose weight fast', 'lose weight quickly', 'instant weight loss',
            'cure cancer', 'cancer cure', 'natural cancer treatment',
            'government conspiracy', 'government cover up', 'government hiding',
            'big pharma', 'big pharma doesn\'t want you to know',
            'clickbait', 'viral', 'trending', 'breaking news',
            'exclusive', 'limited time', 'act now', 'don\'t miss out',
            'guaranteed results', '100% guaranteed', 'money back guarantee',
            'free trial', 'free offer', 'free gift',
            'urgent', 'emergency', 'last chance', 'final warning',
            'revolutionary', 'breakthrough', 'groundbreaking',
            'amazing', 'incredible', 'unbelievable', 'mind-blowing',
            'instant', 'immediate', 'overnight', 'fast results',
            'natural cure', 'home remedy', 'folk medicine',
            'ancient secret', 'forbidden knowledge', 'hidden truth'
        ];
        
        this.init();
    }
    
    init() {
        // Inject CSS styles for highlighting
        this.injectStyles();
        
        // Listen for messages from the popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'extractText') {
                const text = this.extractVisibleText();
                sendResponse({ text });
            } else if (request.action === 'scanAndHighlight') {
                this.scanAndHighlight();
                sendResponse({ success: true });
            }
        });
        
        // Scan and highlight suspicious content when page loads
        // Wait for page to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.scanAndHighlight(), 1000);
            });
        } else {
            setTimeout(() => this.scanAndHighlight(), 1000);
        }
        
        // Also scan for dynamically loaded content
        this.observePageChanges();
    }
    
    // Inject CSS styles for highlighting
    injectStyles() {
        if (document.getElementById('trustguard-styles')) {
            return; // Styles already injected
        }
        
        const style = document.createElement('style');
        style.id = 'trustguard-styles';
        style.textContent = `
            .trustguard-highlight {
                background-color: rgba(255, 0, 0, 0.2) !important;
                border-bottom: 2px solid rgba(255, 0, 0, 0.4) !important;
                padding: 1px 2px !important;
                border-radius: 2px !important;
                cursor: help !important;
                position: relative !important;
                transition: background-color 0.2s ease !important;
            }
            
            .trustguard-highlight:hover {
                background-color: rgba(255, 0, 0, 0.3) !important;
            }
            
            .trustguard-highlight::after {
                content: "⚠️";
                position: absolute;
                top: -8px;
                right: -8px;
                font-size: 10px;
                background: rgba(255, 0, 0, 0.8);
                color: white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
            }
        `;
        
        document.head.appendChild(style);
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
    
    // Scan and highlight suspicious content in paragraph and heading tags
    scanAndHighlight() {
        try {
            const selectors = 'p, h1, h2, h3, h4, h5, h6, article, main, div, span';
            const elements = document.querySelectorAll(selectors);
            
            elements.forEach(element => {
                this.highlightSuspiciousText(element);
            });
            
            console.log('TrustGuard: Page scan completed');
        } catch (error) {
            console.error('TrustGuard: Error scanning page:', error);
        }
    }
    
    // Highlight suspicious text within an element
    highlightSuspiciousText(element) {
        // Skip if element is already processed or contains highlighted content
        if (element.hasAttribute('data-trustguard-processed') || 
            element.querySelector('.trustguard-highlight')) {
            return;
        }
        
        const originalText = element.textContent;
        if (!originalText || originalText.trim().length === 0) {
            return;
        }
        
        let modifiedText = originalText;
        let hasChanges = false;
        
        // Check each suspicious keyword
        this.suspiciousKeywords.forEach(keyword => {
            const regex = new RegExp(`(${this.escapeRegex(keyword)})`, 'gi');
            if (regex.test(modifiedText)) {
                modifiedText = modifiedText.replace(regex, 
                    '<span class="trustguard-highlight" title="⚠️ TrustGuard: Potential misinformation detected">$1</span>'
                );
                hasChanges = true;
            }
        });
        
        // Apply changes if suspicious content was found
        if (hasChanges) {
            element.innerHTML = modifiedText;
            element.setAttribute('data-trustguard-processed', 'true');
        }
    }
    
    // Escape special regex characters
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Observe page changes for dynamically loaded content
    observePageChanges() {
        try {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Scan new elements
                                this.highlightSuspiciousText(node);
                                
                                // Also scan child elements
                                const childElements = node.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, main, div, span');
                                childElements.forEach(element => {
                                    this.highlightSuspiciousText(element);
                                });
                            }
                        });
                    }
                });
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            console.log('TrustGuard: Page change observer started');
        } catch (error) {
            console.error('TrustGuard: Error setting up page observer:', error);
        }
    }
}

// Initialize the content script
const trustGuardContentScript = new TrustGuardContentScript();

// Make the instance accessible globally for the popup
window.trustGuardContentScript = trustGuardContentScript;

// Log that the content script is loaded (for debugging)
console.log('TrustGuard content script loaded'); 