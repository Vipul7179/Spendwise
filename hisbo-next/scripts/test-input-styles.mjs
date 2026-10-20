import fs from 'fs';

async function test() {
  console.log('Testing Input & Form Styling on http://localhost:3000 ...\n');

  // 1. Verify globals.css rules
  const css = fs.readFileSync('./src/app/globals.css', 'utf-8');
  const checks = [
    { name: '--input-bg: #ffffff in :root', pass: css.includes('--input-bg: #ffffff;') },
    { name: '--input-border: #d8e9df in :root', pass: css.includes('--input-border: #d8e9df;') },
    { name: '--input-bg in dark theme', pass: css.includes('--input-bg: #0e2219;') },
    { name: 'Universal input:not([type="checkbox"]) rule', pass: css.includes('input:not([type="checkbox"])') },
    { name: 'Universal select rule', pass: css.includes('select {') || css.includes('select,') },
    { name: 'Universal textarea rule', pass: css.includes('textarea {') || css.includes('textarea,') },
    { name: '.fl input has var(--input-bg) !important', pass: css.includes('background-color: var(--input-bg) !important') },
    { name: '.fl input has border: 1px solid var(--input-border)', pass: css.includes('border: 1px solid var(--input-border)') },
    { name: '.fl input has height: 48px', pass: css.includes('height: 48px') },
    { name: '.fl input focus ring', pass: css.includes('box-shadow: 0 0 0 3.5px var(--input-focus-ring)') },
    { name: 'Desktop .ap has background: var(--card)', pass: css.includes('background: var(--card);\n    border-left: 1px solid var(--line)') },
  ];

  let failCount = 0;
  for (const c of checks) {
    if (!c.pass) failCount++;
    console.log(`${c.pass ? '[PASS]' : '[FAIL]'} ${c.name}`);
  }

  // 2. Fetch pages and test rendered contents
  const pages = [
    { url: '/login', expected: ['id="login-email"', 'id="login-password"', 'class="fl"', 'class="b cta"'] },
    { url: '/signup', expected: ['id="signup-name"', 'id="signup-email"', 'id="signup-password"', 'class="pws"', 'class="chk"'] },
    { url: '/forgot-password', expected: ['id="reset-email"', 'class="fl"'] },
    { url: '/reset-password', expected: ['id="new-password"', 'class="pws"'] },
    { url: '/overview', expected: ['class="app"', 'class="hero"', 'class="dbar"'] },
    { url: '/budgets', expected: ['id="cn"', 'id="cl"', 'Your budgets'] },
    { url: '/automate', expected: ['id="sms"', 'id="rn"', 'id="ra"', 'id="rc"', 'id="rd"'] },
    { url: '/savings', expected: ['id="gn"', 'id="gt"', 'Create goal'] },
    { url: '/groups', expected: ['Groups', 'Add shared expense'] },
    { url: '/alerts', expected: ['id="em"', 'id="ph"', 'id="chan"'] },
  ];

  console.log('\nChecking rendered page inputs and shell:\n');
  for (const p of pages) {
    try {
      const res = await fetch('http://localhost:3000' + p.url);
      const text = await res.text();
      const allFound = p.expected.every(e => text.includes(e));
      if (!allFound) {
        failCount++;
        const missing = p.expected.filter(e => !text.includes(e));
        console.log(`[FAIL] ${p.url.padEnd(20)} missing: ${missing.join(', ')}`);
      } else {
        console.log(`[PASS] ${p.url.padEnd(20)} HTTP ${res.status} (Len: ${text.length})`);
      }
    } catch (e) {
      failCount++;
      console.log(`[FAIL] ${p.url.padEnd(20)} Error: ${e.message}`);
    }
  }

  console.log(`\nInput styling & page checks completed with ${failCount} failures.`);
  process.exitCode = failCount > 0 ? 1 : 0;
}

test();
