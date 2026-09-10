// modules/formAnalyzer.js
export function analyzeForms(document) {
  const forms = Array.from(document.forms);
  let loginFormDetected = false;
  let passwordField = false;
  let emailField = false;
  let otpField = false;
  let paymentField = false;

  forms.forEach(form => {
    const inputs = Array.from(form.elements).filter(el => el.tagName === 'INPUT');
    let hasPassword = inputs.some(i => i.type === 'password');
    let hasEmail = inputs.some(i => i.type === 'email' || (i.type === 'text' && /e-?mail/i.test(i.name)));
    let hasOTP = inputs.some(i => /otp|code|pin/i.test(i.name) || /\b\d{4,6}\b/.test(i.value));
    let hasPayment = inputs.some(i => /card|pay|cc|cvc|expiration|cvv|zip|postal/i.test(i.name) || /\b\d{13,19}\b/.test(i.value));

    if (hasPassword) {
      loginFormDetected = true;
      passwordField = true;
    }
    if (hasEmail) emailField = true;
    if (hasOTP) otpField = true;
    if (hasPayment) paymentField = true;
  });

  return {
    loginFormDetected,
    passwordField,
    emailField,
    otpField,
    paymentField,
  };
}
