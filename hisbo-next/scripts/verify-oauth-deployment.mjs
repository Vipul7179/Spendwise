/** Read-only release check. No cookies, storage access, cache purges, or mutations. */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('Usage: node scripts/verify-oauth-deployment.mjs --local-build [https://www.hisbo.in] [https://<exact-deployment>.vercel.app]');
  process.exitCode = 2;
} else {
  for (const target of targets) {
    try {
      let html, status, headers = {};
      if (target === '--local-build') {
        html = await readFile('.next/server/app/signup.html', 'utf8');
        status = 200;
      } else {
        const url = new URL(target);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Error('Use a public HTTP(S) URL without credentials.');
        url.pathname = '/signup';
        url.search = '';
        url.hash = '';
        const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
        status = response.status;
        for (const name of ['etag', 'age', 'x-vercel-cache', 'x-matched-path']) headers[name] = response.headers.get(name);
        html = await response.text();
      }
      const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || [];
      const google = buttons.find(button => /class="[^"]*\bgoogle-auth-button\b/.test(button));
      const openingTag = google?.slice(0, google.indexOf('>') + 1);
      const enabled = !!openingTag && !/\bdisabled(?:\s|=|>)/.test(openingTag);
      const typeButton = !!openingTag && /\btype="button"/.test(openingTag);
      const result = {
        target, status, enabled, typeButton,
        buildId: html.match(/\\"b\\":\\"([^\\]+)\\"/)?.[1] || null,
        htmlSha256: createHash('sha256').update(html).digest('hex'),
        scripts: [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match => match[1]).filter(src => src.startsWith('/_next/')),
        headers,
      };
      console.log(JSON.stringify(result, null, 2));
      if (status !== 200 || !enabled || !typeButton) process.exitCode = 1;
    } catch (error) {
      console.error(JSON.stringify({ target, error: error.message }));
      process.exitCode = 1;
    }
  }
}
