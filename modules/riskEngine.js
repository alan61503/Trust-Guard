// modules/riskEngine.js
export function computeRisk(urlFeatures, contentFeatures, formFeatures) {
  let score = 0;
  const indicators = [];
  const positives = [];

  // ---- URL analysis (max 25) ----
  if (!urlFeatures.https) { score += 5; indicators.push('HTTPS missing'); } else positives.push('HTTPS enabled');
  if (urlFeatures.subdomains) { score += Math.min(urlFeatures.subdomains * 2, 10); indicators.push(`${urlFeatures.subdomains} subdomains`); }
  if (urlFeatures.hyphenCount) { score += Math.min(urlFeatures.hyphenCount * 1, 5); indicators.push(`${urlFeatures.hyphenCount} hyphens`); }
  if (urlFeatures.digitCount) { score += Math.min(urlFeatures.digitCount * 1, 5); indicators.push(`${urlFeatures.digitCount} digits`); }
  if (urlFeatures.specialCharCount) { score += Math.min(urlFeatures.specialCharCount * 1, 5); indicators.push(`${urlFeatures.specialCharCount} special characters`); }
  if (urlFeatures.containsAtSymbol) { score += 5; indicators.push('Contains @ symbol'); }
  if (urlFeatures.containsIPAddress) { score += 5; indicators.push('IP address in URL'); }
  if (urlFeatures.urlEncoded) { score += 2; indicators.push('URL encoding detected'); }
  if (urlFeatures.excessivePathDepth) { score += 2; indicators.push('Excessive path depth'); }
  if (urlFeatures.suspiciousTLD) { score += 5; indicators.push('Suspicious TLD'); }
  if (urlFeatures.punycode) { score += 5; indicators.push('Punycode domain'); }
  if (urlFeatures.suspiciousTerms && urlFeatures.suspiciousTerms.length) {
    const termScore = Math.min(urlFeatures.suspiciousTerms.length * 2, 6);
    score += termScore;
    indicators.push('Suspicious terms: ' + urlFeatures.suspiciousTerms.join(', '));
  }

  // ---- Content analysis (max 20) ----
  score += contentFeatures.contentScore; // already capped at 20
  const details = contentFeatures.details;
  if (details.marketing.length) indicators.push('Marketing phrases: ' + details.marketing.join(', '));
  if (details.urgency.length) indicators.push('Urgency phrases: ' + details.urgency.join(', '));
  if (details.credential.length) indicators.push('Credential phrases: ' + details.credential.join(', '));

  // ---- Form analysis (max 20) ----
  if (formFeatures.loginFormDetected) { score += 15; indicators.push('Login form detected'); }
  if (formFeatures.passwordField) { score += 5; indicators.push('Password field present'); }
  if (formFeatures.paymentField) { score += 5; indicators.push('Payment field present'); }
  if (formFeatures.otpField) { score += 3; indicators.push('OTP field present'); }
  if (formFeatures.emailField) { score += 2; indicators.push('Email field present'); } else positives.push('No email field detected');

  // ---- Cap score ----
  if (score > 100) score = 100;

  // ---- Classification ----
  let classification = '';
  if (score <= 24) classification = 'LOW';
  else if (score <= 49) classification = 'MODERATE';
  else if (score <= 74) classification = 'HIGH';
  else classification = 'CRITICAL';

  return { riskScore: score, classification, indicators, positives };
}
