const { test } = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('./helpers/source-runtime.cjs');

function blogFixture({ data = null, error = null } = {}) {
  const calls = [], query = {};
  for (const method of ['select', 'eq', 'not', 'lte', 'order']) {
    query[method] = (...args) => { calls.push([method, ...args]); return query; };
  }
  query.maybeSingle = async () => ({ data, error });
  query.then = resolve => Promise.resolve(resolve({ data, error }));
  return {
    calls,
    blog: runtime({ './supabase/public': { createPublicClient: () => ({ from: () => query }) } }, {
      console: { error() {}, warn() {} },
      process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture' } },
    })('src/lib/blog.ts'),
  };
}

test('empty category data is valid while a failed category query is recoverable', async () => {
  const empty = blogFixture({ data: [] });
  const result = await empty.blog.getBlogCategoriesResult();
  assert.equal(result.categories.length, 0);
  assert.equal(result.error, undefined);
  assert.equal((await empty.blog.getBlogCategories()).length, 0);
  const failed = blogFixture({ error: Error('Network down') });
  assert.equal((await failed.blog.getBlogCategoriesResult()).error, 'network');
  await assert.rejects(failed.blog.getBlogCategories(), error => error.name === 'BlogDataError' && error.kind === 'network');
});

test('article absence is distinct from network failure and publication filters remain intact', async () => {
  const absent = blogFixture();
  assert.equal(await absent.blog.getBlogPostBySlug('missing'), null);
  const failed = blogFixture({ error: Error('Network down') });
  await assert.rejects(failed.blog.getBlogPostBySlug('article'), error => error.name === 'BlogDataError' && error.kind === 'network');
  for (const fixture of [absent, failed]) {
    assert.ok(fixture.calls.some(call => call[0] === 'eq' && call[1] === 'status' && call[2] === 'published'));
    assert.ok(fixture.calls.some(call => call[0] === 'not' && call[1] === 'published_at' && call[2] === 'is' && call[3] === null));
    assert.ok(fixture.calls.some(call => call[0] === 'lte' && call[1] === 'published_at'));
  }
});

test('article page and metadata propagate network failures without calling notFound', async () => {
  let notFound = 0;
  const networkError = Error('Recoverable network failure');
  const page = runtime({
    'next/navigation': { notFound: () => { notFound++; throw Error('404'); } },
    'next/link': {}, '@/components/blog/BlogCard': {},
    '@/lib/blog': { getBlogPostBySlug: async () => { throw networkError; } },
    '@/lib/markdown': {}, 'react/jsx-runtime': {},
  })('src/app/(marketing)/blog/[slug]/page.tsx');
  const props = { params: Promise.resolve({ slug: 'article' }) };
  await assert.rejects(page.default(props), /Recoverable network failure/);
  await assert.rejects(page.generateMetadata(props), /Recoverable network failure/);
  assert.equal(notFound, 0);
});
