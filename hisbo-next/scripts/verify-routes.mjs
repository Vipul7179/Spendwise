const routes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/overview',
  '/budgets',
  '/automate',
  '/savings',
  '/groups',
  '/alerts',
  '/admin/banners',
  '/blog',
  '/blog/salary-aati-hai-kahan-jaati-hai',
  '/privacy',
  '/sitemap.xml',
  '/robots.txt',
];

async function run() {
  const port = process.env.PORT || 3000;
  console.log(`Testing Next.js routes on http://localhost:${port} ...\n`);
  let failures = 0;
  for (const r of routes) {
    try {
      const res = await fetch(`http://localhost:${port}${r}`);
      const text = await res.text();
      // App Router streams loading.tsx before the completed page. A skeleton in
      // that response is expected and does not mean the route is a placeholder.
      const hasBad = /placeholder\s*route|coming\s*soon/i.test(text);
      const ok = res.status === 200 && !hasBad;
      if (!ok) failures++;
      console.log(
        (ok ? '[PASS]' : '[FAIL]') + ' ' +
        r.padEnd(42) + ' ' +
        'HTTP ' + res.status + ' ' +
        'Len: ' + text.length +
        (hasBad ? ' [CONTAINS PLACEHOLDER TEXT!]' : '')
      );
    } catch (e) {
      failures++;
      console.error('[FAIL] ' + r.padEnd(42) + ' ERROR: ' + e.message);
    }
  }

  console.log('\nVerification completed with ' + failures + ' failures.');
  process.exit(failures > 0 ? 1 : 0);
}

run();

