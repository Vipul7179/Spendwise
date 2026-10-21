const origin = process.env.ORIGIN || 'http://localhost:3100';
for (let round = 0; round < 2; round++) {
  for (const path of ['/login', '/signup', '/privacy', '/blog/500-se-investment-shuru-karo', '/blog']) {
    const start = performance.now();
    const response = await fetch(origin + path);
    const html = await response.text();
    console.log(JSON.stringify({ round, path, status: response.status, ms: Math.round(performance.now() - start), article: html.includes('<article'), serverError: html.includes('This page couldn') }));
  }
}
