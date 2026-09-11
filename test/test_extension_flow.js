import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

import { analyzeURL } from '../modules/urlAnalyzer.js';
import { analyzeContent } from '../modules/contentAnalyzer.js';
import { computeRisk } from '../modules/riskEngine.js';

console.log('Testing Extension Flow...');

// Load popup.html
const html = fs.readFileSync(path.join(rootDir, 'popup.html'), 'utf8');

// 1. Verify UI wording in popup.html
if (!html.includes('Phishing & Malicious Website Detection')) {
    throw new Error('popup.html does not contain "Phishing & Malicious Website Detection"');
}
if (html.includes('Misinformation Detection')) {
    throw new Error('popup.html still contains "Misinformation Detection"');
}
if (!html.includes('Primary Risk Score')) {
    throw new Error('popup.html missing "Primary Risk Score"');
}
if (!html.includes('Primary Classification')) {
    throw new Error('popup.html missing "Primary Classification"');
}
if (!html.includes('ML Prediction (Second Opinion)')) {
    throw new Error('popup.html missing "ML Prediction (Second Opinion)"');
}
console.log('PASS: popup.html wording verification passed');

// 2. Test End-to-end DOM rendering with JSDOM
const dom = new JSDOM(html);
const { document } = dom.window;

async function simulateScan(url, text = '') {
    const urlFeatures = analyzeURL(url);
    const contentFeatures = analyzeContent(text);
    const formFeatures = { loginFormDetected: false, passwordField: false, emailField: false, otpField: false, paymentField: false };
    const deterministic = computeRisk(urlFeatures, contentFeatures, formFeatures);

    // Call live FastAPI /predict
    const mlRes = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'chrome-extension://kkjfmdmimmdcmimjnblnoekkfbcihbjo' },
        body: JSON.stringify({ url })
    });
    let mlStatusText = null;
    if (mlRes.ok) {
        const mlData = await mlRes.json();
        const conf = (mlData.confidence * 100).toFixed(1);
        mlStatusText = `${mlData.prediction} (${conf}%)`;
    }

    return {
        riskScore: deterministic.riskScore,
        classification: deterministic.classification,
        indicators: deterministic.indicators,
        positives: deterministic.positives,
        mlPrediction: mlStatusText
    };
}

async function runTests() {
    // Test 1: Scan legitimate LinkedIn URL
    const linkedinResult = await simulateScan('https://www.linkedin.com/feed/', 'Welcome to LinkedIn. Connect with friends.');
    console.log('LinkedIn Scan Result:', JSON.stringify(linkedinResult));

    if (linkedinResult.classification !== 'LOW') {
        throw new Error(`Expected LOW classification for LinkedIn, got: ${linkedinResult.classification}`);
    }
    if (!linkedinResult.mlPrediction.startsWith('legitimate')) {
        throw new Error(`Expected legitimate ML prediction for LinkedIn, got: ${linkedinResult.mlPrediction}`);
    }
    console.log('PASS: LinkedIn correctly classified as LOW and ML legitimate');

    // Test 2: Scan suspicious phishing URL
    const phishingResult = await simulateScan('http://login.verify-account.bank-update.com/paypal/reset', 'Please login to verify your bank account and update password.');
    console.log('Phishing Scan Result:', JSON.stringify(phishingResult));

    if (phishingResult.classification === 'LOW') {
        throw new Error(`Expected high/critical risk for phishing URL, got: ${phishingResult.classification}`);
    }
    if (!phishingResult.mlPrediction.startsWith('phishing')) {
        throw new Error(`Expected phishing ML prediction, got: ${phishingResult.mlPrediction}`);
    }
    console.log('PASS: Suspicious URL correctly detected by deterministic engine and ML model');

    // Test 3: Popup DOM rendering
    const scoreVal = document.getElementById('scoreValue');
    const classElem = document.getElementById('classification');
    const mlElem = document.getElementById('mlStatus');

    // Simulate displayResults with ML available
    scoreVal.textContent = `${linkedinResult.riskScore}%`;
    classElem.textContent = `Primary Classification: ${linkedinResult.classification}`;
    mlElem.textContent = `ML Prediction (Second Opinion): ${linkedinResult.mlPrediction}`;

    console.log('Rendered with ML available:');
    console.log('  Score:', scoreVal.textContent);
    console.log('  Classification:', classElem.textContent);
    console.log('  ML Status:', mlElem.textContent);

    // Simulate displayResults when ML is offline
    mlElem.textContent = 'ML Prediction: unavailable (local service offline)';
    console.log('Rendered with ML offline:');
    console.log('  ML Status:', mlElem.textContent);

    console.log('\nAll extension flow tests passed successfully!');
}

runTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
