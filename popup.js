// TrustGuard Popup Script
class TrustGuardPopup {
    constructor() {
        this.scanButton = document.getElementById('scanButton');
        this.loading = document.getElementById('loading');
        this.results = document.getElementById('results');
        this.error = document.getElementById('error');
        this.scoreValue = document.getElementById('scoreValue');
        this.keywordList = document.getElementById('keywordList');
        
        this.suspiciousKeywords = [
            'miracle cure', 'miracle treatment', 'miracle solution',
            'you won\'t believe', 'you won\'t believe what happened',
            'shocking', 'shocking truth', 'shocking discovery',
            'secret revealed', 'secret exposed', 'secret uncovered',
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
        this.scanButton.addEventListener('click', () => this.scanPage());
    }
    
    async scanPage() {
        try {
            this.showLoading();
            this.hideError();
            this.hideResults();
            
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }
            
            // Execute content script to extract text
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: this.extractPageText
            });
            
            if (!results || !results[0] || !results[0].result) {
                throw new Error('Failed to extract page text');
            }
            
            const pageText = results[0].result;
            const scanResults = this.analyzeText(pageText);
            
            this.displayResults(scanResults);
            
        } catch (error) {
            console.error('Scan error:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }
    
    extractPageText() {
        // Function to be injected into the page
        const getVisibleText = () => {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        const style = window.getComputedStyle(node.parentElement);
                        return style.display !== 'none' && 
                               style.visibility !== 'hidden' && 
                               style.opacity !== '0' &&
                               node.textContent.trim().length > 0
                            ? NodeFilter.FILTER_ACCEPT 
                            : NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node.textContent.trim());
            }
            
            return textNodes.join(' ').toLowerCase();
        };
        
        return getVisibleText();
    }
    
    analyzeText(text) {
        const foundKeywords = [];
        const textLower = text.toLowerCase();
        
        // Check for suspicious keywords
        this.suspiciousKeywords.forEach(keyword => {
            if (textLower.includes(keyword.toLowerCase())) {
                foundKeywords.push(keyword);
            }
        });
        
        // Calculate trust score (start at 100%, subtract 10% per keyword)
        const trustScore = Math.max(0, 100 - (foundKeywords.length * 10));
        
        return {
            trustScore,
            foundKeywords,
            totalKeywords: foundKeywords.length
        };
    }
    
    displayResults(results) {
        this.scoreValue.textContent = `${results.trustScore}%`;
        
        // Set color based on trust score
        this.scoreValue.className = 'score-value';
        if (results.trustScore >= 70) {
            this.scoreValue.classList.add('score-high');
        } else if (results.trustScore >= 40) {
            this.scoreValue.classList.add('score-medium');
        } else {
            this.scoreValue.classList.add('score-low');
        }
        
        // Display found keywords
        if (results.foundKeywords.length > 0) {
            const keywordElements = results.foundKeywords.map(keyword => 
                `<span class="keyword-item">${keyword}</span>`
            ).join(' ');
            this.keywordList.innerHTML = keywordElements;
        } else {
            this.keywordList.innerHTML = '<span class="keyword-item">No suspicious keywords detected.</span>';
        }
        
        this.showResults();
    }
    
    showLoading() {
        this.scanButton.disabled = true;
        this.loading.style.display = 'block';
    }
    
    hideLoading() {
        this.scanButton.disabled = false;
        this.loading.style.display = 'none';
    }
    
    showResults() {
        this.results.style.display = 'block';
    }
    
    hideResults() {
        this.results.style.display = 'none';
    }
    
    showError() {
        this.error.style.display = 'block';
    }
    
    hideError() {
        this.error.style.display = 'none';
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrustGuardPopup();
}); 