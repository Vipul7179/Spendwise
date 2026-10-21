const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(path, imports, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name in imports) return imports[name];
      throw new Error(`Unexpected import: ${name}`);
    },
    console, setTimeout, clearTimeout, ...globals,
  }, { filename: path });
  return exports;
}

for (const [hash, expected] of [
  ['#blog', '/blog'], ['#blog/', '/blog'], ['#BLOG/', '/blog'],
  ['#journal', '/blog'], ['#blog/money%20habits', '/blog/money%20habits'],
  ['#blog/a%2Fb', '/blog/a%2Fb'], ['#blog/100%', '/blog/100%25'],
  ['#features', undefined],
]) {
  test(`legacy entry ${hash}`, () => {
    const routes = [];
    const listeners = new Map();
    const window = {
      location: { hash },
      addEventListener: (event, fn) => listeners.set(event, fn),
      removeEventListener: (event) => listeners.delete(event),
    };
    let cleanup;
    const { default: Handler } = loadSource('src/components/common/LegacyHashHandler.tsx', {
      react: { useCallback: fn => fn, useEffect: fn => { cleanup = fn(); } },
      'next/navigation': { useRouter: () => ({ replace: url => routes.push(url) }) },
    }, { window });
    Handler();
    assert.equal(routes[0], expected);
    window.location.hash = '#blog/next-article';
    listeners.get('hashchange')();
    assert.equal(routes.at(-1), '/blog/next-article');
    cleanup();
    assert.equal(listeners.size, 0);
  });
}

for (const mode of ['anonymous', 'guest', 'signed-in']) {
  test(`public Blog bootstrap is read-only for ${mode}`, async () => {
    const effects = [];
    const states = [];
    const reads = [];
    const session = mode === 'signed-in' ? { user: { id: 'test-user' } } : null;
    const initial = { name: 'Local name', theme: 'light', rec: [], cats: [] };
    const storage = {
      getItem: key => key === 'sw_guest' && mode === 'guest' ? '1' : null,
      setItem: () => assert.fail('Public bootstrap wrote local state'),
      removeItem: () => assert.fail('Public bootstrap changed guest state'),
    };
    const client = {
      auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from(table) {
        reads.push(table);
        return {
          select() { return this; }, eq() { return this; },
          async maybeSingle() {
            return { data: table === 'user_data' ? { data: { name: 'Cloud name' } } : { is_admin: true } };
          },
        };
      },
    };
    const react = {
      createContext: () => ({ Provider() {} }), useContext() {},
      useState(value) { const index = states.length; states.push(value); return [value, next => { states[index] = next; }]; },
      useRef: current => ({ current }), useCallback: fn => fn,
      useEffect: fn => effects.push(fn),
    };
    const { AppProvider } = loadSource('src/context/AppContext.tsx', {
      react, 'react/jsx-runtime': { jsx: () => null },
      'next/navigation': { useRouter: () => ({ push: () => assert.fail('Public Blog redirected') }) },
      '@/lib/state/initial-state': { INITIAL_STATE: initial },
      '@/lib/state/merge': { mergeS: (a, b) => ({ ...a, ...b }) },
      '@/lib/state/calculations': { runRecurringExpenses: () => assert.fail('Public bootstrap ran expenses') },
      '@/lib/state/transitions': {
        restoreState: saved => ({ ...initial, ...saved }),
        applyRecurringExpenses: () => assert.fail('Public bootstrap ran expenses'),
      },
      '@/lib/state/sync': { serializeStateWrite: fn => fn(), settleStateWrites: async () => {} },
      '@/lib/supabase/client': { createClient: () => client },
      '@/lib/analytics-state': { trackSavedStateChanges: () => assert.fail('Public bootstrap emitted a mutation event') },
      '@/lib/analytics': {},
    }, { window: {}, localStorage: storage, document: { documentElement: { setAttribute() {}, removeAttribute() {} } } });
    AppProvider({ children: null, publicView: true });
    const cleanups = effects.map(effect => effect());
    const cleanup = () => cleanups.forEach(fn => fn?.());
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(states[3], false, 'Bootstrap finished');
    assert.equal(states[1]?.id || null, session?.user.id || null);
    assert.equal(states[2], mode === 'guest');
    assert.equal(states[0].name, mode === 'signed-in' ? 'Cloud name' : 'Local name');
    assert.deepEqual(reads, mode === 'signed-in' ? ['user_data', 'profiles'] : []);
    cleanup();
  });
}

test('Blog search follows history/restored URL props and submits the current value', () => {
  let stored;
  const routes = [];
  const { default: Toolbar } = loadSource('src/components/blog/BlogToolbar.tsx', {
    react: {
      useState(initial) { stored ??= initial; return [stored, value => { stored = value; }]; },
      useEffect: fn => fn(),
      useTransition: () => [false, fn => fn()],
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/navigation': {
      useRouter: () => ({ push: url => routes.push(url), replace: url => routes.push(url) }),
      useSearchParams: () => new URLSearchParams(),
    },
    'next/link': {},
  }, { URLSearchParams });
  const find = (node, type) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat()) {
      const found = find(child, type);
      if (found) return found;
    }
  };
  const render = currentSearch => Toolbar({ categories: [], currentSearch });
  render('salary');
  render('savings');
  let tree = render('savings');
  assert.equal(find(tree, 'input').props.value, 'savings');
  render('salary'); // Browser Back restores the previous server props.
  tree = render('salary');
  assert.equal(find(tree, 'input').props.value, 'salary');
  find(tree, 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(routes.at(-1), '/blog?q=salary');
  find(tree, 'input').props.onChange({ target: { value: 'savings' } });
  assert.equal(routes.at(-1), '/blog?q=savings', 'Typing searches without pressing Enter');
});

test('Blog load-more appends six-post pages, retains filters, and retries without skipping posts', async () => {
  let cursor = 0;
  const hooks = [];
  const calls = [];
  let response;
  const { default: List } = loadSource('src/components/blog/BlogPostList.tsx', {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = initial;
        return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }];
      },
      useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    './BlogCard': { default: 'card' },
    '@/lib/blog': { BLOG_PAGE_SIZE: 6, getPublishedBlogPosts: options => {
      calls.push(options);
      return new Promise(resolve => { response = resolve; });
    } },
  });
  const find = (node, type) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat()) {
      const match = find(child, type);
      if (match) return match;
    }
  };
  const props = { initialPosts: Array.from({ length: 6 }, (_, id) => ({ id })), total: 8,
    categories: [], categoryId: 'finance', search: 'money' };
  const render = () => { cursor = 0; return List(props); };
  const first = find(render(), 'button').props.onClick();
  await find(render(), 'button').props.onClick();
  assert.equal(calls.length, 1, 'Concurrent clicks do not duplicate requests');
  assert.equal(calls[0].offset, 6);
  assert.equal(calls[0].limit, 6);
  assert.equal(calls[0].categoryId, 'finance');
  assert.equal(calls[0].search, 'money');
  response({ posts: [], total: 0, error: 'network' });
  await first;
  assert.equal(find(render(), 'button').props.children, 'Try again');
  const retry = find(render(), 'button').props.onClick();
  assert.equal(calls[1].offset, 6, 'Failure does not advance the offset');
  response({ posts: [{ id: 6 }, { id: 7 }], total: 8 });
  await retry;
  const tree = render();
  assert.equal(find(tree, 'div').props.children.length, 8);
  assert.equal(find(tree, 'button'), undefined, 'No load-more action after the last page');
});

test('shared confirmation preserves confirm, cancel, backdrop, and Escape behavior', () => {
  let confirmed = 0;
  let cancelled = 0;
  const { default: Dialog } = loadSource('src/components/common/ConfirmDialog.tsx', {
    react: { useRef: () => ({ current: null }), useEffect: fn => fn() },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  }, { document: { activeElement: null } });
  const overlay = Dialog({ title: 'Delete phone?', confirmLabel: 'Delete',
    onConfirm: () => confirmed++, onCancel: () => cancelled++ });
  assert.equal(confirmed, 0);
  const box = overlay.props.children;
  const [, confirm, cancel] = box.props.children.props.children;
  cancel.props.onClick();
  box.props.onKeyDown({ key: 'Escape' });
  const target = {};
  overlay.props.onClick({ target, currentTarget: target });
  assert.equal(cancelled, 3);
  assert.equal(confirmed, 0);
  confirm.props.onClick();
  assert.equal(confirmed, 1);
});

test('published Blog paging keeps publication, date, category and search constraints', async () => {
  const calls = [];
  const query = {};
  for (const method of ['select', 'eq', 'not', 'lte', 'order', 'or', 'range']) {
    query[method] = (...args) => { calls.push([method, ...args]); return query; };
  }
  query.then = resolve => Promise.resolve(resolve({ data: [{ id: 'published' }], count: 7, error: null }));
  const blog = loadSource('src/lib/blog.ts', {
    './supabase/public': { createPublicClient: () => ({ from: table => {
      assert.equal(table, 'blog_posts');
      return query;
    } }) },
  });
  const result = await blog.getPublishedBlogPosts({ limit: 6, offset: 6, categoryId: 'finance', search: 'salary' });
  assert.equal(result.total, 7);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'status' && call[2] === 'published'));
  assert.ok(calls.some(call => call[0] === 'not' && call[1] === 'published_at' && call[2] === 'is' && call[3] === null));
  assert.ok(calls.some(call => call[0] === 'lte' && call[1] === 'published_at' && !Number.isNaN(Date.parse(call[2]))));
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'category_id' && call[2] === 'finance'));
  assert.ok(calls.some(call => call[0] === 'or' && call[1].includes('salary')));
  assert.ok(calls.some(call => call[0] === 'range' && call[1] === 6 && call[2] === 11));
});

test('missing Blog configuration is distinct from a genuinely empty listing', async () => {
  const blog = loadSource('src/lib/blog.ts', {
    './supabase/public': { createPublicClient: () => { throw Error('Not configured'); } },
  }, { process: { env: {} }, console: { error() {}, warn() {} } });
  const result = await blog.getPublishedBlogPosts();
  assert.equal(result.error, 'config');
  assert.equal(result.posts.length, 0);
});
