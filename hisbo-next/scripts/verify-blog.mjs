import assert from 'node:assert/strict';

const origin = `http://localhost:${process.env.PORT || 3000}`;
async function page(path) {
  const response = await fetch(origin + path, { redirect: 'manual' });
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK'), `${path}: no streamed error`);
  return html;
}

const landing = await page('/');
assert.match(landing, /href="\/blog"/, 'Marketing header/footer link to listing');
const overview = await page('/overview');
assert.match(overview, /aria-label="Checking session"/, 'Anonymous private view waits for session/guest verification');

const listing = await page('/blog');
assert.match(listing, /class="app"/, 'Blog uses the tracker shell');
assert.match(listing, /id="nav"/, 'Desktop navigation is present');
assert.match(listing, /id="mobileNav"/, 'Mobile navigation is present');
assert.match(listing, /class="ft"/, 'App footer is present');
assert.ok(!listing.includes('class="lp"'), 'No marketing shell inside Blog');
const links = [...new Set([...listing.matchAll(/href="(\/blog\/[^"?#]+)"/g)].map(match => match[1]))];
assert.ok(links.length, 'Published article links loaded from Supabase');
const category = [...listing.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]).find(value => value !== 'all');
assert.ok(category, 'Categories loaded from Supabase');

for (const link of links) {
  const article = await page(link);
  assert.match(article, /<article class="story"/, `${link}: article body loaded`);
  assert.match(article, /class="backlink" href="\/blog"/, `${link}: return link`);
  const refreshed = await page(link);
  assert.match(refreshed, /<article class="story"/, `${link}: repeated direct request`);
}
const filtered = await page(`/blog?category=${encodeURIComponent(category)}`);
assert.match(filtered, /class="blog-card/, 'Category filter returns published posts');
const searched = await page('/blog?q=salary');
assert.match(searched, /\/blog\/salary-aati-hai-kahan-jaati-hai/, 'Search returns the known published article');
const empty = await page('/blog?q=hisbo-no-matching-article-987654321');
assert.match(empty, /No articles match those filters/, 'Empty search state');
const refreshed = await page('/blog');
assert.match(refreshed, /class="blog-card/, 'Repeated listing request');
console.log(`PASS: public listing, ${links.length} live articles, repeated direct requests, categories, search, and navigation markup`);
console.log('HTTP checks do not verify browser clicks, Back, hydration, or visual layout.');
