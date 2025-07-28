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
        
        // Fake news detection patterns
        this.fakeNewsPatterns = [
            // Overly sensational language
            /(?:absolutely|completely|totally|entirely|utterly)\s+(?:proven|confirmed|verified|established)/gi,
            /(?:scientists|experts|doctors|researchers)\s+(?:finally|at\s+last|now)\s+(?:discovered|found|revealed)/gi,
            /(?:shocking|amazing|incredible|unbelievable)\s+(?:new|latest|groundbreaking)\s+(?:study|research|discovery)/gi,
            
            // Suspicious claims
            /(?:cure|treat|heal)\s+(?:cancer|diabetes|heart\s+disease|alzheimer)/gi,
            /(?:lose|losing)\s+(?:weight|pounds)\s+(?:fast|quickly|overnight|instantly)/gi,
            /(?:government|officials|authorities)\s+(?:hiding|covering\s+up|suppressing)/gi,
            
            // AI-generated patterns
            /(?:it\s+is\s+important\s+to\s+note|it\s+should\s+be\s+noted|it\s+is\s+worth\s+mentioning)/gi,
            /(?:in\s+conclusion|to\s+summarize|in\s+summary|overall)/gi,
            /(?:furthermore|moreover|additionally|in\s+addition)/gi,
            
            // Suspicious sentence structures
            /(?:this\s+is\s+a|here\s+is\s+a|let\s+me\s+share\s+a)\s+(?:story|tale|account)/gi,
            /(?:you\s+won't\s+believe|you\s+need\s+to\s+see|you\s+must\s+read)/gi,
            /(?:click\s+here|read\s+more|find\s+out\s+more|learn\s+more)/gi
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
    
    // Inject CSS styles for floating overlay
    injectStyles() {
        if (document.getElementById('trustguard-styles')) {
            return; // Styles already injected
        }
        
        const style = document.createElement('style');
        style.id = 'trustguard-styles';
        style.textContent = `
            #trustguard-overlay {
                position: fixed !important;
                top: 100px !important;
                right: 20px !important;
                width: 300px !important;
                max-height: 400px !important;
                background: rgba(0, 0, 0, 0.9) !important;
                color: white !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
                z-index: 999999 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                font-size: 12px !important;
                line-height: 1.4 !important;
                overflow: hidden !important;
                transition: all 0.3s ease !important;
                backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            
            #trustguard-overlay.minimized {
                width: 50px !important;
                height: 50px !important;
                max-height: 50px !important;
                overflow: hidden !important;
            }
            
            #trustguard-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                padding: 12px 15px !important;
                border-radius: 8px 8px 0 0 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                cursor: move !important;
                user-select: none !important;
            }
            
            #trustguard-header h3 {
                margin: 0 !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                color: white !important;
            }
            
            #trustguard-controls {
                display: flex !important;
                gap: 8px !important;
            }
            
            .trustguard-btn {
                background: rgba(255, 255, 255, 0.2) !important;
                border: none !important;
                color: white !important;
                border-radius: 4px !important;
                padding: 4px 8px !important;
                font-size: 10px !important;
                cursor: pointer !important;
                transition: background 0.2s ease !important;
            }
            
            .trustguard-btn:hover {
                background: rgba(255, 255, 255, 0.3) !important;
            }
            
            #trustguard-content {
                padding: 15px !important;
                max-height: 300px !important;
                overflow-y: auto !important;
                scrollbar-width: thin !important;
                scrollbar-color: rgba(255, 255, 255, 0.3) transparent !important;
            }
            
            #trustguard-content::-webkit-scrollbar {
                width: 6px !important;
            }
            
            #trustguard-content::-webkit-scrollbar-track {
                background: transparent !important;
            }
            
            #trustguard-content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3) !important;
                border-radius: 3px !important;
            }
            
            .trustguard-score {
                text-align: center !important;
                margin-bottom: 15px !important;
                padding: 10px !important;
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 6px !important;
            }
            
            .trustguard-score-value {
                font-size: 24px !important;
                font-weight: bold !important;
                margin-bottom: 5px !important;
            }
            
            .trustguard-score-high { color: #4ade80 !important; }
            .trustguard-score-medium { color: #fbbf24 !important; }
            .trustguard-score-low { color: #f87171 !important; }
            
            .trustguard-keywords {
                margin-top: 15px !important;
            }
            
            .trustguard-keywords h4 {
                margin: 0 0 10px 0 !important;
                font-size: 13px !important;
                color: #fbbf24 !important;
            }
            
            .trustguard-keyword-item {
                background: rgba(255, 0, 0, 0.2) !important;
                border: 1px solid rgba(255, 0, 0, 0.3) !important;
                border-radius: 4px !important;
                padding: 6px 8px !important;
                margin: 4px 0 !important;
                font-size: 11px !important;
                word-break: break-word !important;
            }
            
            .trustguard-no-issues {
                color: #4ade80 !important;
                text-align: center !important;
                font-style: italic !important;
                padding: 20px !important;
            }
            
            .trustguard-minimized-content {
                display: none !important;
                text-align: center !important;
                padding: 15px !important;
            }
            
            #trustguard-overlay.minimized .trustguard-minimized-content {
                display: block !important;
            }
            
            #trustguard-overlay.minimized #trustguard-content {
                display: none !important;
            }
            
            #trustguard-badge {
                position: fixed !important;
                top: 20px !important;
                right: 20px !important;
                width: 60px !important;
                height: 60px !important;
                border-radius: 50% !important;
                background: rgba(0, 0, 0, 0.8) !important;
                color: white !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 999998 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                font-weight: bold !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
                border: 2px solid rgba(255, 255, 255, 0.2) !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                backdrop-filter: blur(10px) !important;
            }
            
            #trustguard-badge:hover {
                transform: scale(1.1) !important;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4) !important;
            }
            
            #trustguard-badge.trustguard-badge-high {
                background: linear-gradient(135deg, #22c55e, #16a34a) !important;
                border-color: #4ade80 !important;
            }
            
            #trustguard-badge.trustguard-badge-medium {
                background: linear-gradient(135deg, #fbbf24, #f59e0b) !important;
                border-color: #fbbf24 !important;
            }
            
            #trustguard-badge.trustguard-badge-low {
                background: linear-gradient(135deg, #ef4444, #dc2626) !important;
                border-color: #f87171 !important;
            }
            
            #trustguard-badge-score {
                font-size: 16px !important;
                line-height: 1 !important;
                margin-bottom: 2px !important;
            }
            
            #trustguard-badge-icon {
                font-size: 12px !important;
                line-height: 1 !important;
            }
            
            #trustguard-badge.trustguard-badge-high #trustguard-badge-icon {
                color: #dcfce7 !important;
            }
            
            #trustguard-badge.trustguard-badge-medium #trustguard-badge-icon {
                color: #fef3c7 !important;
            }
            
            #trustguard-badge.trustguard-badge-low #trustguard-badge-icon {
                color: #fee2e2 !important;
            }
            
            .trustguard-fake-news {
                border-bottom: 2px solid #ef4444 !important;
                background-color: rgba(239, 68, 68, 0.1) !important;
                padding: 1px 2px !important;
                border-radius: 2px !important;
                cursor: help !important;
                position: relative !important;
                transition: background-color 0.2s ease !important;
            }
            
            .trustguard-fake-news:hover {
                background-color: rgba(239, 68, 68, 0.2) !important;
            }
            
            .trustguard-fake-news::after {
                content: "🤖";
                position: absolute;
                top: -8px;
                right: -8px;
                font-size: 10px;
                background: rgba(239, 68, 68, 0.9);
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
            
            const foundKeywords = [];
            const suspiciousElements = [];
            let fakeNewsCount = 0;
            
            elements.forEach(element => {
                // Check for suspicious keywords
                const results = this.findSuspiciousText(element);
                if (results.keywords.length > 0) {
                    foundKeywords.push(...results.keywords);
                    suspiciousElements.push({
                        element: element,
                        keywords: results.keywords,
                        text: results.text
                    });
                }
                
                // Highlight fake news sentences
                this.highlightFakeNews(element);
                
                // Count fake news sentences for scoring
                const fakeNewsSentences = this.detectFakeNews(element.textContent);
                fakeNewsCount += fakeNewsSentences.length;
            });
            
            // Calculate trust score (reduce score for fake news sentences)
            const uniqueKeywords = [...new Set(foundKeywords)];
            const trustScore = Math.max(0, 100 - (uniqueKeywords.length * 10) - (fakeNewsCount * 5));
            
            // Create or update the floating overlay
            this.createFloatingOverlay(foundKeywords, suspiciousElements, fakeNewsCount);
            
            console.log('TrustGuard: Page scan completed');
        } catch (error) {
            console.error('TrustGuard: Error scanning page:', error);
        }
    }
    
    // Find suspicious text within an element without modifying it
    findSuspiciousText(element) {
        const originalText = element.textContent;
        if (!originalText || originalText.trim().length === 0) {
            return { keywords: [], text: '' };
        }
        
        const foundKeywords = [];
        const textLower = originalText.toLowerCase();
        
        // Check each suspicious keyword
        this.suspiciousKeywords.forEach(keyword => {
            if (textLower.includes(keyword.toLowerCase())) {
                foundKeywords.push(keyword);
            }
        });
        
        return {
            keywords: foundKeywords,
            text: originalText
        };
    }
    
    // Detect fake news patterns in text
    detectFakeNews(text) {
        const suspiciousSentences = [];
        
        // Split text into sentences
        const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 10);
        
        sentences.forEach(sentence => {
            const sentenceLower = sentence.toLowerCase();
            let suspiciousScore = 0;
            
            // Check fake news patterns
            this.fakeNewsPatterns.forEach(pattern => {
                if (pattern.test(sentence)) {
                    suspiciousScore += 1;
                }
            });
            
            // Check for suspicious keywords in this sentence
            this.suspiciousKeywords.forEach(keyword => {
                if (sentenceLower.includes(keyword.toLowerCase())) {
                    suspiciousScore += 1;
                }
            });
            
            // If sentence has suspicious patterns, mark it
            if (suspiciousScore >= 1) {
                suspiciousSentences.push({
                    sentence: sentence.trim(),
                    score: suspiciousScore
                });
            }
        });
        
        return suspiciousSentences;
    }
    
    // Highlight fake news sentences in an element
    highlightFakeNews(element) {
        // Skip if element is already processed
        if (element.hasAttribute('data-trustguard-fake-news-processed')) {
            return;
        }
        
        const originalText = element.textContent;
        if (!originalText || originalText.trim().length < 20) {
            return; // Skip very short elements
        }
        
        // Detect fake news sentences
        const suspiciousSentences = this.detectFakeNews(originalText);
        
        if (suspiciousSentences.length > 0) {
            let modifiedText = originalText;
            
            // Highlight each suspicious sentence
            suspiciousSentences.forEach(({ sentence }) => {
                const escapedSentence = this.escapeRegex(sentence);
                const regex = new RegExp(`(${escapedSentence})`, 'gi');
                
                modifiedText = modifiedText.replace(regex, 
                    '<span class="trustguard-fake-news" title="⚠️ TrustGuard: Possibly AI-generated or fake content">$1</span>'
                );
            });
            
            // Apply changes if modifications were made
            if (modifiedText !== originalText) {
                element.innerHTML = modifiedText;
                element.setAttribute('data-trustguard-fake-news-processed', 'true');
            }
        }
    }
    
    // Create floating overlay with scan results
    createFloatingOverlay(foundKeywords, suspiciousElements, fakeNewsCount = 0) {
        // Remove existing overlay if it exists
        const existingOverlay = document.getElementById('trustguard-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Calculate trust score
        const uniqueKeywords = [...new Set(foundKeywords)];
        const trustScore = Math.max(0, 100 - (uniqueKeywords.length * 10) - (fakeNewsCount * 5));
        
        // Create or update the trust badge
        this.createTrustBadge(trustScore);
        
        // Only create detailed overlay if there are suspicious keywords
        if (uniqueKeywords.length > 0) {
            // Create overlay element
            const overlay = document.createElement('div');
            overlay.id = 'trustguard-overlay';
            
            // Create header
            const header = document.createElement('div');
            header.id = 'trustguard-header';
            header.innerHTML = `
                <h3>🛡️ TrustGuard</h3>
                <div id="trustguard-controls">
                    <button class="trustguard-btn" id="trustguard-minimize" title="Minimize">−</button>
                    <button class="trustguard-btn" id="trustguard-close" title="Close">×</button>
                </div>
            `;
            
            // Create content
            const content = document.createElement('div');
            content.id = 'trustguard-content';
            
            content.innerHTML = `
                <div class="trustguard-score">
                    <div class="trustguard-score-value ${this.getScoreClass(trustScore)}">${trustScore}%</div>
                    <div>Trust Score</div>
                </div>
                <div class="trustguard-keywords">
                    <h4>⚠️ Suspicious Keywords Found (${uniqueKeywords.length})</h4>
                    ${uniqueKeywords.map(keyword => 
                        `<div class="trustguard-keyword-item">${keyword}</div>`
                    ).join('')}
                </div>
                ${fakeNewsCount > 0 ? `
                <div class="trustguard-keywords">
                    <h4>🤖 AI/Fake Content Detected (${fakeNewsCount} sentences)</h4>
                    <div style="color: #ef4444; font-size: 11px; margin-top: 5px;">
                        Sentences with suspicious patterns have been highlighted with red underlines.
                    </div>
                </div>
                ` : ''}
            `;
            
            // Create minimized content
            const minimizedContent = document.createElement('div');
            minimizedContent.className = 'trustguard-minimized-content';
            minimizedContent.innerHTML = `
                <div style="font-size: 20px;">🛡️</div>
                <div style="font-size: 10px; margin-top: 5px;">${trustScore}%</div>
            `;
            
            // Assemble overlay
            overlay.appendChild(header);
            overlay.appendChild(content);
            overlay.appendChild(minimizedContent);
            
            // Add to page
            document.body.appendChild(overlay);
            
            // Add event listeners
            this.addOverlayEventListeners(overlay);
            
            // Make draggable
            this.makeDraggable(overlay, header);
        }
    }
    
    // Get CSS class for trust score
    getScoreClass(score) {
        if (score >= 70) return 'trustguard-score-high';
        if (score >= 40) return 'trustguard-score-medium';
        return 'trustguard-score-low';
    }
    
    // Add event listeners to overlay
    addOverlayEventListeners(overlay) {
        const minimizeBtn = overlay.querySelector('#trustguard-minimize');
        const closeBtn = overlay.querySelector('#trustguard-close');
        
        minimizeBtn.addEventListener('click', () => {
            overlay.classList.toggle('minimized');
            minimizeBtn.textContent = overlay.classList.contains('minimized') ? '+' : '−';
        });
        
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });
    }
    
    // Create trust badge
    createTrustBadge(trustScore) {
        // Remove existing badge if it exists
        const existingBadge = document.getElementById('trustguard-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Create badge element
        const badge = document.createElement('div');
        badge.id = 'trustguard-badge';
        
        // Add appropriate class based on trust score
        if (trustScore >= 70) {
            badge.classList.add('trustguard-badge-high');
        } else if (trustScore >= 40) {
            badge.classList.add('trustguard-badge-medium');
        } else {
            badge.classList.add('trustguard-badge-low');
        }
        
        // Set badge content
        badge.innerHTML = `
            <div id="trustguard-badge-score">${trustScore}</div>
            <div id="trustguard-badge-icon">🛡️</div>
        `;
        
        // Add tooltip
        badge.title = `TrustGuard: ${trustScore}% trust score. Click for details.`;
        
        // Add click event to show detailed overlay
        badge.addEventListener('click', () => {
            // Show detailed overlay if it doesn't exist
            const existingOverlay = document.getElementById('trustguard-overlay');
            if (!existingOverlay) {
                // Trigger a rescan to show the detailed overlay
                this.scanAndHighlight();
            } else {
                // Toggle overlay visibility
                existingOverlay.style.display = existingOverlay.style.display === 'none' ? 'block' : 'none';
            }
        });
        
        // Add to page
        document.body.appendChild(badge);
        
        // Add entrance animation
        badge.style.opacity = '0';
        badge.style.transform = 'scale(0.5)';
        
        setTimeout(() => {
            badge.style.opacity = '1';
            badge.style.transform = 'scale(1)';
        }, 100);
    }
    
    // Make overlay draggable
    makeDraggable(overlay, header) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        
        header.addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            
            if (e.target === header || header.contains(e.target)) {
                isDragging = true;
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                xOffset = currentX;
                yOffset = currentY;
                
                overlay.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    // Escape special regex characters
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Observe page changes for dynamically loaded content
    observePageChanges() {
        try {
            const observer = new MutationObserver((mutations) => {
                let hasNewContent = false;
                
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Check if new content contains suspicious keywords
                                const results = this.findSuspiciousText(node);
                                if (results.keywords.length > 0) {
                                    hasNewContent = true;
                                }
                                
                                // Check for fake news patterns
                                const fakeNewsSentences = this.detectFakeNews(node.textContent);
                                if (fakeNewsSentences.length > 0) {
                                    hasNewContent = true;
                                }
                                
                                // Also check child elements
                                const childElements = node.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, main, div, span');
                                childElements.forEach(element => {
                                    const childResults = this.findSuspiciousText(element);
                                    if (childResults.keywords.length > 0) {
                                        hasNewContent = true;
                                    }
                                    
                                    const childFakeNews = this.detectFakeNews(element.textContent);
                                    if (childFakeNews.length > 0) {
                                        hasNewContent = true;
                                    }
                                });
                            }
                        });
                    }
                });
                
                // If new suspicious content was found, update the overlay
                if (hasNewContent) {
                    setTimeout(() => this.scanAndHighlight(), 500); // Small delay to ensure content is fully loaded
                }
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