// modules/contentAnalyzer.js
export function analyzeContent(text) {
  const lower = text.toLowerCase();

  const marketingPhrases = [
    'free trial', 'limited time', 'act now', 'exclusive', 'clickbait', 'viral', 'breaking news',
    'money back guarantee', 'guaranteed results', '100% guaranteed', 'miracle cure', 'secret revealed'
  ];
  const urgencyPhrases = [
    'urgent', 'last chance', 'final warning', 'immediate', 'now', 'hurry', 'deadline', 'soon'
  ];
  const credentialPhrases = [
    'verify your account', 'account suspended', 'password', 'login', 'reset password', 'confirm your identity',
    'payment required', 'credit card', 'bank account', 'paypal', 'bank details'
  ];

  const weightMap = {
    marketing: 1,
    urgency: 3,
    credential: 5,
  };

  const found = {
    marketing: [],
    urgency: [],
    credential: [],
  };

  const countMatches = (list) => list.filter(p => lower.includes(p)).length;

  marketingPhrases.forEach(p => { if (lower.includes(p)) found.marketing.push(p); });
  urgencyPhrases.forEach(p => { if (lower.includes(p)) found.urgency.push(p); });
  credentialPhrases.forEach(p => { if (lower.includes(p)) found.credential.push(p); });

  const score = Math.min(
    (found.marketing.length * weightMap.marketing) +
    (found.urgency.length * weightMap.urgency) +
    (found.credential.length * weightMap.credential),
    20
  ); // cap at 20

  return {
    contentScore: score,
    details: found,
  };
}
