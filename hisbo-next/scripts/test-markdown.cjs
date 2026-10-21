const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const runtime = require('./helpers/source-runtime.cjs');

async function renderer() {
  // Use the real parsers. Wrap the CJS default export for the source harness.
  return runtime({
    marked: await import('marked'),
    xss: require('xss'),
  })('src/lib/markdown.ts');
}

test('article sanitizer loads in CommonJS without require(ESM) support', () => {
  const output = execFileSync(process.execPath, ['--no-experimental-require-module', '-e',
    `const sanitize = require('xss'); console.log(sanitize('<p>Article</p>'));`
  ], { encoding: 'utf8' });
  assert.equal(output.trim(), '<p>Article</p>');
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  for (const name of ['isomorphic-dompurify', 'jsdom', 'html-encoding-sniffer', '@exodus/bytes', 'sanitize-html']) {
    assert.ok(!Object.keys(lock.packages).some(key => key.endsWith('node_modules/' + name)), name);
  }
});

test('real Markdown rendering preserves headings, lists, links, images, code and tables', async () => {
  const { renderMarkdown } = await renderer();
  const html = renderMarkdown('# Money guide\n\n**Save** and *plan*.\n\n- First\n- Second\n\n[Blog](/blog)\n\n![Savings](https://images.example.test/save.jpg "Photo")\n\n```js\nconst x = "<safe>";\n```\n\n| Month | Plan |\n| --- | --- |\n| Jan | Save |');
  for (const pattern of [/<h1>Money guide<\/h1>/, /<strong>Save<\/strong>/, /<em>plan<\/em>/, /<ul>/, /<li>First<\/li>/, /href="\/blog"/, /src="https:\/\/images.example.test\/save.jpg"/, /alt="Savings"/, /<pre><code>/, /&lt;safe&gt;/, /<div class="table-wrap"><table>/, /<th>Month<\/th>/, /<\/table><\/div>/]) assert.match(html, pattern);
  assert.ok(!html.includes('There is no content'), 'Must not silently fall back after an import/parser error');
});

test('raw article HTML retains formatting and image/table attributes', async () => {
  const { sanitizeHtml } = await renderer();
  const html = sanitizeHtml('<figure><img src="/photo.jpg" alt="Photo" title="Title"><figcaption>Caption</figcaption></figure><blockquote><u>Keep</u> <del>old</del> <sub>2</sub><sup>3</sup><mark>new</mark></blockquote><table><tbody><tr><th scope="col">A</th><td colspan="2" rowspan="2" align="right">B</td></tr></tbody></table>');
  for (const pattern of [/<figure>/, /src="\/photo.jpg"/, /<figcaption>Caption/, /<blockquote>/, /<u>Keep<\/u>/, /<del>old<\/del>/, /<sub>2<\/sub>/, /<sup>3<\/sup>/, /<mark>new<\/mark>/, /scope="col"/, /colspan="2" rowspan="2" align="right"/]) assert.match(html, pattern);
});

test('sanitization rejects executable HTML, unsafe URLs, styles and event attributes', async () => {
  const { sanitizeHtml } = await renderer();
  const html = sanitizeHtml('<script>alert(1)</script><style>body{display:none}</style><iframe src="https://evil.test"></iframe><svg onload="evil()"></svg><p onclick="evil()" style="color:red">Safe</p><img src="javascript:evil()" onerror="evil()"><a href="jav&#x61;script:evil()">link</a><a href="data:text/html,evil">data</a><a href="https://hisbo.in/blog">Blog</a>');
  assert.match(html, /<p>Safe<\/p>/);
  assert.match(html, /href="https:\/\/hisbo.in\/blog"/);
  assert.doesNotMatch(html, /script|iframe|svg|onclick|onerror|style=|javascript:|data:text|evil\(\)/i);
});

test('empty content fallback and Unicode article text remain intact', async () => {
  const { sanitizeHtml, renderMarkdown } = await renderer();
  assert.equal(renderMarkdown(''), '<p>There is no content for this article yet.</p>');
  assert.equal(sanitizeHtml('   '), '<p>There is no content for this article yet.</p>');
  const heading = '\u092c\u091a\u0924 \u20b9500';
  assert.ok(renderMarkdown('## ' + heading).includes(heading));
  assert.match(renderMarkdown('Salary & savings'), /Salary &(?:amp;)? savings/);
});
