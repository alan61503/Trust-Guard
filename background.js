// TrustGuard Background Service Worker
import { analyzeURL } from './modules/urlAnalyzer.js';
import { analyzeContent } from './modules/contentAnalyzer.js';
import { analyzeForms } from './modules/formAnalyzer.js';
import { computeRisk } from './modules/riskEngine.js';

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('TrustGuard extension installed:', details.reason);
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ trustGuardInstalled: true }, () => {
            if (chrome.runtime.lastError) {
                console.warn('Storage set error:', chrome.runtime.lastError);
            } else {
                console.log('TrustGuard install flag set in storage');
            }
        });
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('TrustGuard extension started');
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['trustGuardInstalled'], (result) => {
            if (chrome.runtime.lastError) {
                console.warn('Storage get error:', chrome.runtime.lastError);
            } else {
                console.log('TrustGuard installed flag:', result.trustGuardInstalled);
            }
        });
    }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action);

    switch (request.action) {
        case 'scanAndHighlight': {
            (async () => {
                try {
                    // Resolve active tab
                    let tab = sender.tab;
                    if (!tab || !tab.id) {
                        if (request.tabId) {
                            try {
                                tab = await chrome.tabs.get(request.tabId);
                            } catch (e) {
                                // fallback to activeTab query
                            }
                        }
                        if (!tab || !tab.id) {
                            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                            tab = activeTab;
                        }
                    }

                    const targetUrl = (tab && tab.url) || request.url;
                    if (!tab || !tab.id || !targetUrl) {
                        sendResponse({ error: 'No active tab found' });
                        return;
                    }

                    // Check for internal browser URLs where scripting is forbidden
                    if (targetUrl.startsWith('chrome://') || targetUrl.startsWith('chrome-extension://') || targetUrl.startsWith('edge://') || targetUrl.startsWith('about:')) {
                        sendResponse({
                            result: {
                                riskScore: 0,
                                classification: 'LOW',
                                indicators: [],
                                positives: ['Internal browser page (safe)'],
                                mlPrediction: 'legitimate (100.0%)'
                            }
                        });
                        return;
                    }

                    // 1. Extract content and form features from the active page via scripting
                    let pageData = {
                        text: '',
                        formFeatures: { loginFormDetected: false, passwordField: false, emailField: false, otpField: false, paymentField: false }
                    };

                    try {
                        const execResults = await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => {
                                const text = (document.body ? document.body.innerText || '' : '').slice(0, 50000);
                                const forms = Array.from(document.forms || []);
                                let loginFormDetected = false;
                                let passwordField = false;
                                let emailField = false;
                                let otpField = false;
                                let paymentField = false;

                                forms.forEach(form => {
                                    const inputs = Array.from(form.elements || []).filter(el => el.tagName === 'INPUT');
                                    if (inputs.some(i => i.type === 'password')) {
                                        loginFormDetected = true;
                                        passwordField = true;
                                    }
                                    if (inputs.some(i => i.type === 'email' || (i.type === 'text' && /e-?mail/i.test(i.name)))) emailField = true;
                                    if (inputs.some(i => /otp|code|pin/i.test(i.name) || /\b\d{4,6}\b/.test(i.value))) otpField = true;
                                    if (inputs.some(i => /card|pay|cc|cvc|expiration|cvv|zip|postal/i.test(i.name) || /\b\d{13,19}\b/.test(i.value))) paymentField = true;
                                });

                                return {
                                    text,
                                    formFeatures: {
                                        loginFormDetected,
                                        passwordField,
                                        emailField,
                                        otpField,
                                        paymentField
                                    }
                                };
                            }
                        });

                        if (execResults && execResults[0] && execResults[0].result) {
                            pageData = execResults[0].result;
                        }
                    } catch (scriptErr) {
                        console.warn('Script execution warning:', scriptErr);
                    }

                    // 2. Deterministic Security Analysis (PRIMARY VERDICT)
                    const urlFeatures = analyzeURL(targetUrl);
                    const contentFeatures = analyzeContent(pageData.text);
                    const formFeatures = pageData.formFeatures;
                    const deterministic = computeRisk(urlFeatures, contentFeatures, formFeatures);

                    // 3. Inject / Update Trust Badges in the page
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: (classification) => {
                                const colorClass = classification === 'LOW' ? 'green' : (classification === 'MODERATE' ? 'yellow' : 'red');
                                const icon = classification === 'LOW' ? '✓' : (classification === 'MODERATE' ? '!' : '⚠');

                                if (!document.getElementById('trustguard-badge-style')) {
                                    const style = document.createElement('style');
                                    style.id = 'trustguard-badge-style';
                                    style.textContent = `
                                        .trust-badge {
                                            display: inline-block;
                                            vertical-align: middle;
                                            margin-left: 6px;
                                            font-size: 11px;
                                            font-weight: 500;
                                            border-radius: 7px;
                                            padding: 1px 7px 1px 5px;
                                            user-select: none;
                                            cursor: help;
                                            transition: background 0.2s;
                                            line-height: 1.2;
                                        }
                                        .trust-badge.green { color: #15803d; background: #bbf7d0; border: 1px solid #22c55e; }
                                        .trust-badge.yellow { color: #92400e; background: #fef9c3; border: 1px solid #fbbf24; }
                                        .trust-badge.red { color: #b91c1c; background: #fee2e2; border: 1px solid #ef4444; }
                                        .trust-badge:hover { filter: brightness(0.97); }
                                    `;
                                    document.head.appendChild(style);
                                }

                                document.querySelectorAll('a[href]').forEach(link => {
                                    let next = link.nextSibling;
                                    while (next && next.nodeType === Node.TEXT_NODE) next = next.nextSibling;
                                    if (next && next.classList && next.classList.contains('trustguard-badge')) {
                                        next.className = `trustguard-badge trust-badge ${colorClass}`;
                                        next.textContent = `${icon}`;
                                        next.title = `Page risk: ${classification}`;
                                        link.classList.add('trustguard-processed');
                                        return;
                                    }
                                    if (link.classList.contains('trustguard-processed')) return;
                                    let el = link;
                                    for (let i = 0; i < 5 && el; i++) {
                                        const tag = (el.tagName || '').toLowerCase();
                                        if (tag === 'header' || tag === 'nav' || tag === 'footer') return;
                                        el = el.parentElement;
                                    }
                                    const text = link.innerText ? link.innerText.trim() : '';
                                    if (text.length <= 15) return;

                                    const badge = document.createElement('span');
                                    badge.className = `trustguard-badge trust-badge ${colorClass}`;
                                    badge.textContent = `${icon}`;
                                    badge.title = `Page risk: ${classification}`;
                                    badge.style.verticalAlign = 'middle';
                                    badge.style.pointerEvents = 'auto';
                                    badge.setAttribute('tabindex', '-1');
                                    badge.addEventListener('click', e => e.stopPropagation());
                                    if (link.parentNode) {
                                        link.parentNode.insertBefore(badge, link.nextSibling);
                                    }
                                    link.classList.add('trustguard-processed');
                                });
                            },
                            args: [deterministic.classification]
                        });
                    } catch (badgeErr) {
                        console.warn('Badge update warning:', badgeErr);
                    }

                    // 4. Query Local ML API as SECOND OPINION (Do NOT average or combine scores)
                    let mlStatusText = null;
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 4000);
                        const mlRes = await fetch('http://127.0.0.1:8000/predict', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: targetUrl }),
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        if (mlRes.ok) {
                            const mlData = await mlRes.json();
                            if (mlData && mlData.prediction) {
                                const conf = (mlData.confidence * 100).toFixed(1);
                                mlStatusText = `${mlData.prediction} (${conf}%)`;
                            }
                        }
                    } catch (mlErr) {
                        console.warn('ML predict second opinion unavailable:', mlErr.message);
                    }

                    // Format indicators cleanly for popup
                    const formattedIndicators = deterministic.indicators.map(ind => {
                        if (typeof ind === 'string') {
                            return { severity: 'medium', message: ind, type: 'Security Indicator' };
                        }
                        return ind;
                    });

                    sendResponse({
                        result: {
                            riskScore: deterministic.riskScore,
                            classification: deterministic.classification,
                            indicators: formattedIndicators,
                            positives: deterministic.positives,
                            mlPrediction: mlStatusText
                        }
                    });
                } catch (err) {
                    console.error('scanAndHighlight handling error:', err);
                    sendResponse({
                        error: err.message,
                        result: {
                            riskScore: 0,
                            classification: 'LOW',
                            indicators: [],
                            positives: ['Error during scan: ' + err.message],
                            mlPrediction: 'unavailable'
                        }
                    });
                }
            })();
            return true; // Keep message channel open for async response
        }

        case 'getExtensionInfo':
            sendResponse({
                name: 'TrustGuard',
                version: '1.0.0',
                description: 'Phishing & Malicious Website Detection Extension'
            });
            break;

        case 'apiCall':
            console.log('API call requested:', request.data);
            sendResponse({ status: 'placeholder' });
            break;

        case 'mlPredict':
            if (!request.url) {
                sendResponse({ error: 'Missing url' });
            } else {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                fetch('http://127.0.0.1:8000/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: request.url }),
                    signal: controller.signal,
                })
                    .then(res => {
                        clearTimeout(timeoutId);
                        if (!res.ok) throw new Error('Network response was not ok');
                        return res.json();
                    })
                    .then(data => {
                        sendResponse(data);
                    })
                    .catch(err => {
                        console.warn('ML API call failed:', err);
                        sendResponse({ prediction: null });
                    });
            }
            return true;

        case 'logScan':
            console.log('Scan logged:', request.data);
            sendResponse({ success: true });
            break;

        default:
            console.log('Unknown message action:', request.action);
            sendResponse({ error: 'Unknown action' });
    }

    return true;
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Optional future hook
    }
});

console.log('TrustGuard background service worker loaded');