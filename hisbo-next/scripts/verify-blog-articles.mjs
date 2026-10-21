import assert from 'node:assert/strict';

// Run against `next start`, never the development server.
const origin = process.env.BLOG_TEST_ORIGIN || 'http://localhost:3105';
const slugs = [
  '500-se-investment-shuru-karo',
  'salary-aati-hai-kahan-jaati-hai',
  'college-students-money-saving-tips-india',
];
for (const slug of slugs) {
  const path = '/blog/' + slug;
  for (const visit of ['direct', 'refresh']) {
    const response = await fetch(origin + path, {
      redirect: 'manual',
      headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Hisbo-article-regression-check' },
    });
    const html = await response.text();
    assert.equal(response.status, 200, `${path} ${visit}: HTTP status`);
    assert.doesNotMatch(html, /ERR_REQUIRE_ESM|Failed to load external module|NEXT_HTTP_ERROR_FALLBACK/, `${path}: runtime error`);
    const article = html.match(/<article class="story">([\s\S]*?)<\/article>/);
    assert.ok(article && article[1].length > 100, `${path}: rendered article body`);
    assert.doesNotMatch(article[1], /There is no content for this article yet/, `${path}: real content`);
    assert.match(article[1], /<(?:p|h2|h3|ul|ol)\b/, `${path}: content formatting`);
    assert.ok(html.includes(`href="https://www.hisbo.in${path}"`), `${path}: unchanged canonical URL`);
    assert.match(html, /<meta property="og:type" content="article"/, `${path}: article metadata`);
    assert.match(html, /"@type":"BlogPosting"/, `${path}: structured data`);
    assert.match(html, /<img[^>]+loading="eager"/, `${path}: cover image`);
    console.log(`PASS ${visit} ${path}: HTTP ${response.status}, body, formatting, image, canonical and SEO`);
  }
}
console.log('PASS: all three production-mode article routes on direct request and refresh.');
