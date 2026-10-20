async function verifyAuthParity() {
  const port = process.env.PORT || 3000;
  const [loginHtml, signupHtml] = await Promise.all([
    fetch(`http://localhost:${port}/login`).then(r => r.text()),
    fetch(`http://localhost:${port}/signup`).then(r => r.text()),
  ]);

  const checks = [
    { name: 'Outer auth wrapper class', check: (h) => h.includes('class="auth"') },
    { name: 'Auth split wrapper .aw', check: (h) => h.includes('class="aw"') },
    { name: 'Auth sidebar .ah', check: (h) => /class="[^"]*\bah\b[^"]*"/.test(h) },
    { name: 'Auth panel .ap', check: (h) => h.includes('class="ap"') },
    { name: 'Auth card container .ab', check: (h) => h.includes('class="ab"') },
    { name: 'Auth tabs indicator .ind', check: (h) => h.includes('class="ind"') },
    { name: 'Form container #af', check: (h) => h.includes('id="af"') },
    { name: 'Input wrapper .fl', check: (h) => h.includes('class="fl"') },
    { name: 'Password toggle .eye', check: (h) => h.includes('class="eye"') },
    { name: 'Submit button .b.cta', check: (h) => h.includes('class="b cta"') },
    { name: 'Guest continue button', check: (h) => h.includes('Continue without an account') },
    { name: 'Trust badge 1 (Guest data)', check: (h) => h.includes('Guest data stays only on this device') },
    { name: 'Trust badge 2 (Encrypted & private)', check: (h) => h.includes('Your data is encrypted and private') },
  ];

  console.log('Comparing /login and /signup visual structure:\n');
  let diffCount = 0;
  for (const c of checks) {
    const loginOk = c.check(loginHtml);
    const signupOk = c.check(signupHtml);
    const pass = loginOk && signupOk;
    if (!pass) diffCount++;
    console.log(`${pass ? '[MATCH]' : '[DIFF ]'} ${c.name}: login=${loginOk} signup=${signupOk}`);
  }

  // Also check that login has forgot password
  const hasForgot = loginHtml.includes('Forgot password?');
  console.log(`[INFO ] Login has 'Forgot password?': ${hasForgot}`);

  // Check that signup has name, terms, and password strength
  const hasName = signupHtml.includes('Your name');
  const hasTerms = signupHtml.includes('Terms and Privacy Policy');
  const hasPws = signupHtml.includes('pws');
  console.log(`[INFO ] Signup has name input: ${hasName}`);
  console.log(`[INFO ] Signup has terms checkbox: ${hasTerms}`);
  console.log(`[INFO ] Signup has password strength bar: ${hasPws}`);

  console.log(`\nAuth visual parity check finished with ${diffCount} differences in shared layout.`);
  process.exitCode = diffCount > 0 ? 1 : 0;
}

verifyAuthParity();
