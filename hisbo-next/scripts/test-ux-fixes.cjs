const { test } = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('./helpers/source-runtime.cjs');

for (const path of ['/', '/login', '/signup', '/overview', '/reset-password']) {
  for (const valid of [true, false]) test(`server session routing ${path}, valid=${valid}`, async () => {
    let validations = 0;
    const cookies = new Map([['sb-test-auth-token.0', 'persisted']]);
    const response = () => ({ headers: new Headers(), cookies: { values: [], set(...value) { this.values.push(value); }, getAll() { return [{ name: 'sb-test-auth-token', value: 'rotated' }]; } } });
    const load = runtime({
      '@supabase/ssr': { createServerClient(url, key, options) { return { auth: { async getClaims() {
        validations++;
        options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'rotated', options: { path: '/' } }]);
        return { data: valid ? { claims: { sub: 'user' } } : null, error: valid ? null : Error('Expired') };
      } } }; } },
      'next/server': { NextResponse: { next: response, redirect(url) { return { ...response(), destination: String(url) }; } } },
    }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test' } } });
    const result = await load('src/lib/supabase/middleware.ts').updateSession({ url: 'https://www.hisbo.in' + path, nextUrl: { pathname: path }, cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })), set: (key, value) => cookies.set(key, value) } });
    assert.equal(validations, 1);
    assert.equal(result.destination, valid && ['/', '/login', '/signup'].includes(path) ? 'https://www.hisbo.in/overview' : undefined);
    assert.ok(result.cookies.values.length, 'Refreshed cookies survive both normal and redirect responses');
  });
}

test('anonymous requests never wait for auth validation', async () => {
  const result = {};
  const load = runtime({ '@supabase/ssr': { createServerClient: () => ({ auth: { getClaims() { assert.fail('Anonymous request validated'); } } }) }, 'next/server': { NextResponse: { next: () => result } } }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test' } } });
  assert.equal(await load('src/lib/supabase/middleware.ts').updateSession({ cookies: { getAll: () => [] } }), result);
});

for (const [history, previous, referrer, from, expected] of [
  [2, '/overview', '', '', 'back'], [2, null, 'https://www.hisbo.in/blog', '', 'back'],
  [1, null, '', '', '/'], [2, null, 'https://external.test', '', '/'],
  [1, null, '', '?from=signup', 'close,/signup'],
]) test(`policy back: ${history}, ${previous}, ${referrer}, ${from}`, () => {
  const calls = [];
  const load = runtime({ react: { useRef: () => ({ current: false }), useState: () => [false, () => {}] }, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) }, 'next/navigation': { useRouter: () => ({ back: () => calls.push('back'), replace: path => calls.push(path) }) } }, {
    window: { location: { origin: 'https://www.hisbo.in', search: from }, history: { length: history }, close: () => calls.push('close') }, sessionStorage: { getItem: () => previous }, document: { referrer }, URLSearchParams,
  });
  const tree = load('src/components/common/PolicyBackButton.tsx').default();
  tree.props.onClick(); tree.props.onClick();
  assert.equal(calls.join(','), expected, 'Duplicate clicks do not stack navigation');
});

const walk = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat().flatMap(walk)] : [];
test('PostgREST out-of-range errors recover the filtered count for redirection', async () => {
  const ranges = [];
  const load = runtime({ './supabase/public': { createPublicClient: () => ({ from() {
    let offset;
    const query = {};
    for (const method of ['select', 'eq', 'not', 'lte', 'order', 'or']) query[method] = () => query;
    query.range = (start, end) => { offset = start; ranges.push([start, end]); return query; };
    query.then = resolve => Promise.resolve(resolve(offset ? { error: { code: 'PGRST103' }, data: null, count: null } : { error: null, data: [{ id: 'one' }], count: 5 }));
    return query;
  } }) } });
  const result = await load('src/lib/blog.ts').getPublishedBlogPosts({ limit: 6, offset: 5988, categoryId: 'finance', search: 'money' });
  assert.equal(result.total, 5); assert.equal(result.error, undefined); assert.equal(result.posts.length, 0);
  assert.deepEqual(ranges, [[5988, 5993], [0, 0]]);
});
for (const [total, page, expected] of [[13, '2', 'Page 2 of 3'], [6, '1', 'Page 1 of 1'], [7, '999', '/blog?category=finance&q=money&page=2']]) {
  test(`blog pagination total=${total} page=${page}`, async () => {
    let options;
    const load = runtime({
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      'next/navigation': { redirect: value => { throw Error(value); } }, 'next/link': { default: 'link' },
      '@/components/blog/BlogCard': {}, '@/components/blog/BlogEmptyState': {}, '@/components/blog/BlogToolbar': {},
      '@/components/common/NavigationFeedback': {},
      '@/lib/blog': { BLOG_PAGE_SIZE: 6, getBlogCategoriesResult: async () => ({ categories: [] }), getPublishedBlogPosts: async value => { options = value; return { posts: [{ id: 'post' }], total }; } },
    }, { URLSearchParams });
    const render = () => load('src/app/(marketing)/blog/page.tsx').default({ searchParams: Promise.resolve({ page, category: 'finance', q: 'money' }) });
    if (+page > 3) await assert.rejects(render, { message: expected });
    else {
      const tree = await render();
      const nodes = walk(tree);
      assert.ok(nodes.some(node => node.props?.children?.join?.('') === expected));
      for (const link of nodes.filter(node => node.type === 'link')) {
        assert.match(link.props.href, /category=finance/); assert.match(link.props.href, /q=money/);
      }
    }
    assert.equal(options.offset, (+page - 1) * 6);
  });
}
