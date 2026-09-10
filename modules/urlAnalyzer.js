// modules/urlAnalyzer.js
export function analyzeURL(urlString) {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    const path = url.pathname;
    const full = urlString;

    const urlLength = full.length;
    const hostnameLength = hostname.length;
    const dotCount = (hostname.match(/\./g) || []).length;
    const subdomains = Math.max(0, dotCount - 1); // exclude TLD dot
    const hyphenCount = (hostname.match(/-/g) || []).length;
    const digitCount = (hostname.match(/[0-9]/g) || []).length;
    const specialCharCount = (hostname.match(/[^a-zA-Z0-9.-]/g) || []).length;
    const containsAtSymbol = full.includes('@');
    const containsIPAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const https = url.protocol === 'https:';
    const urlEncoded = /%[0-9A-Fa-f]{2}/.test(full);
    const pathDepth = path.split('/').filter(Boolean).length;
    const excessivePathDepth = pathDepth > 3;
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq'];
    const tld = hostname.substring(hostname.lastIndexOf('.')).toLowerCase();
    const suspiciousTLD = suspiciousTLDs.includes(tld);
    const punycode = hostname.startsWith('xn--');

    const suspiciousTermsList = [
      'login', 'verify', 'account', 'secure', 'update', 'bank', 'paypal', 'confirm', 'reset'
    ];
    const suspiciousTerms = suspiciousTermsList.filter(term => hostname.toLowerCase().includes(term));

    return {
      https,
      urlLength,
      hostnameLength,
      dotCount,
      subdomains,
      hyphenCount,
      digitCount,
      specialCharCount,
      containsAtSymbol,
      containsIPAddress,
      urlEncoded,
      excessivePathDepth,
      suspiciousTLD,
      punycode,
      suspiciousTerms,
    };
  } catch (e) {
    return { error: e.message };
  }
}
