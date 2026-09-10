// TrustGuard Popup Script
class TrustGuardPopup {
    constructor() {
        this.scanButton = document.getElementById('scanButton');
        this.rescanButton = document.getElementById('rescanButton');
        this.loading = document.getElementById('loading');
        this.results = document.getElementById('results');
        this.error = document.getElementById('error');
        this.scoreValue = document.getElementById('scoreValue');
        this.suspiciousCount = document.getElementById('suspiciousCount');
        this.classificationElem = document.getElementById('classification');
        this.indicatorsElem = document.getElementById('indicators');



        this.init();
    }

    init() {
        this.scanButton.addEventListener('click', () => this.scanPage());
        this.rescanButton.addEventListener('click', () => this.rescanPage());

        // Also trigger highlighting when popup opens
        this.triggerHighlighting();
    }

    async triggerHighlighting() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, { action: 'scanAndHighlight' });
            }
        } catch (error) {
            console.log('TrustGuard: Could not trigger highlighting (content script may not be loaded yet)');
        }
    }

    async rescanPage() {
        try {
            this.showLoading('Rescanning page...');
            this.hideError();

            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('No active tab found');
            }

            // Execute the scanAndHighlight function in the content script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    // Call the scanAndHighlight function directly
                    if (window.trustGuardContentScript && typeof window.trustGuardContentScript.scanAndHighlight === 'function') {
                        window.trustGuardContentScript.scanAndHighlight();
                        return true;
                    } else {
                        // Fallback: try to send a message to the content script
                        try {
                            chrome.runtime.sendMessage({ action: 'scanAndHighlight' });
                        } catch (e) {
                            console.log('Could not trigger rescan');
                        }
                        return false;
                    }
                }
            });

            // Show success message
            this.showRescanSuccess();

        } catch (error) {
            console.error('Rescan error:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async scanPage() {
        try {
            this.showLoading('Scanning page...');
            this.hideError();
            this.hideResults();

            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('No active tab found');
            }

            // Execute content script to extract text
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'scanAndHighlight' });
                if (response && response.result) {
                    this.displayResults(response.result);
                    // After deterministic analysis, request ML prediction for the current URL
                    const currentUrl = tab.url;
                    chrome.runtime.sendMessage({ action: 'mlPredict', url: currentUrl }, (mlResp) => {
                        const mlElem = document.getElementById('mlStatus');
                        if (mlResp && mlResp.prediction) {
                            const confidence = (mlResp.confidence * 100).toFixed(1);
                            mlElem.textContent = `ML Prediction: ${mlResp.prediction} (${confidence}%)`;
                        } else {
                            mlElem.textContent = 'ML Prediction: unavailable';
                        }
                    });
                } else {
                    throw new Error('No result from content script');
                }

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

    // New deterministic result display
    displayResults(result) {
        const { riskScore, classification, indicators = [], positives = [], mlPrediction } = result;
        // Update risk score UI
        this.scoreValue.textContent = `${riskScore}%`;
        this.scoreValue.className = 'score-value';
        if (riskScore >= 75) {
            this.scoreValue.classList.add('score-high');
        } else if (riskScore >= 50) {
            this.scoreValue.classList.add('score-medium');
        } else {
            this.scoreValue.classList.add('score-low');
        }
        // Classification text
        if (this.classificationElem) {
            this.classificationElem.textContent = `Classification: ${classification}`;
        }
        // Indicator count
        if (this.suspiciousCount) {
            this.suspiciousCount.textContent = indicators.length;
        }
        // Render indicators
        if (this.indicatorsElem) {
            if (indicators.length > 0) {
                const html = indicators.map(ind => {
                    const sign = ind.severity === 'high' ? '⚠️' : ind.severity === 'medium' ? '⚠️' : '✅';
                    const title = ind.type ? ind.type : '';
                    return `<div class="indicator-item" title="${title}">${sign} ${ind.message}</div>`;
                }).join('');
                this.indicatorsElem.innerHTML = html;
            } else {
                this.indicatorsElem.innerHTML = '<div class="indicator-item">No security indicators detected.</div>';
            }
        }
        // Render positives if container exists
        const positivesElem = document.getElementById('positives');
        if (positivesElem) {
            if (positives.length > 0) {
                const html = positives.map(p => `<div class="positive-item">✓ ${p}</div>`).join('');
                positivesElem.innerHTML = html;
            } else {
                positivesElem.innerHTML = '<div class="positive-item">No positive indicators.</div>';
            }
        }
        // ML prediction status
        const mlElem = document.getElementById('mlStatus');
        if (mlElem) {
            mlElem.textContent = mlPrediction ? `ML Prediction: ${mlPrediction}` : 'ML Prediction: N/A';
        }
        this.showResults();
    }

    showLoading(message = 'Scanning page...') {
        this.scanButton.disabled = true;
        this.rescanButton.disabled = true;
        this.loading.style.display = 'block';

        // Update the loading message
        const loadingText = this.loading.querySelector('div:last-child');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    hideLoading() {
        this.scanButton.disabled = false;
        this.rescanButton.disabled = false;
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

    showRescanSuccess() {
        // Show a brief success message
        const successMessage = document.createElement('div');
        successMessage.style.cssText = `
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 6px;
            padding: 10px;
            margin-top: 15px;
            font-size: 12px;
            text-align: center;
            color: #22c55e;
        `;
        successMessage.textContent = '✅ Page rescanned successfully!';

        // Insert after the rescan button
        this.rescanButton.parentNode.insertBefore(successMessage, this.rescanButton.nextSibling);

        // Remove the message after 3 seconds
        setTimeout(() => {
            if (successMessage.parentNode) {
                successMessage.parentNode.removeChild(successMessage);
            }
        }, 3000);
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrustGuardPopup();
}); 