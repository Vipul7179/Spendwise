const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Isolated guard execution: never connects to Supabase or customer databases.
function fixture({ verified = true, admin = true, profileError = false, demo, allowedEmail, production = true } = {}) {
  const queries = [], calls = [], cache = new Map();
  const env = { NODE_ENV: production ? 'production' : 'development', NEXT_PUBLIC_SUPABASE_URL: 'https://klvbtoxyeixxjydnanlz.supabase.co', ADMIN_ALLOWED_EMAILS: allowedEmail };
  const user = { id: 'verified-admin', email: 'admin@example.test' };
  const client = {
    auth: {
      getSession() { assert.fail('Cookie session identity must not authorize an admin'); },
      async getUser() { calls.push('verify'); return { data: { user: verified ? user : null }, error: verified ? null : Error('Invalid identity') }; },
      async signOut() { calls.push('signOut'); return { error: null }; },
    },
    from(table) { queries.push(table); return {
      select() { return this; }, eq(column, id) { assert.equal(id, user.id); return this; },
      async maybeSingle() { return { data: { ...user, is_admin: admin, name: 'Admin' }, error: profileError ? Error('Unavailable') : null }; },
    }; },
  };
  const mocks = {
    'next/headers': { cookies: async () => ({ get: name => name === 'hisbo_control_demo' && demo ? { value: demo } : undefined }) },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => client },
    './audit': { logAuthEvent() {} },
  };
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, process: { env }, console, decodeURIComponent,
      require(name) {
        if (mocks[name]) return mocks[name];
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
        throw Error('Unexpected guard dependency: ' + name);
      },
    });
    return exports;
  }
  return { api: load('src/lib/auth/admin-guard.ts').verifyRealAdminSession, page: load('src/lib/auth/session.ts').verifyAdminSession, queries, calls, env };
}

for (const kind of ['api', 'page']) {
  test(`${kind}: verified admins keep access; cookie-only identity is rejected`, async () => {
    const good = fixture(); const result = await good[kind]();
    assert.equal(kind === 'api' ? result.authorized : result.isAdmin, true);
    assert.equal(result.user.id, 'verified-admin');
    assert.deepEqual(good.calls, ['verify']);
    const bad = fixture({ verified: false }); const denied = await bad[kind]();
    assert.equal(kind === 'api' ? denied.authorized : denied.isAdmin, false);
    assert.equal(bad.queries.length, 0, 'Do not query profile using unverified identity');
  });
  for (const options of [{ admin: false }, { admin: 'true' }, { profileError: true }, { allowedEmail: 'different@example.test' }]) {
    test(`${kind}: denies failed admin/allowlist checks ${JSON.stringify(options)}`, async () => {
      const result = await fixture(options)[kind]();
      assert.equal(kind === 'api' ? result.authorized : result.isAdmin, false);
      assert.equal(result.user, null);
    });
  }
}
test('API rejects demo before verified identity or production content access', async () => {
  for (const demo of ['true', 'super_admin']) {
    const f = fixture();
    const result = await f.api(new Request('http://local/api/admin/blogs', { headers: { cookie: `hisbo_control_demo=${demo}` } }));
    assert.equal(result.statusCode, 403); assert.deepEqual(f.calls, []); assert.deepEqual(f.queries, []);
  }
});
test('malformed unrelated cookie cannot turn a controlled denial into a thrown error', async () => {
  const f = fixture({ verified: false });
  const result = await f.api(new Request('http://local/api/admin/blogs', { headers: { cookie: 'other=%E0%A4%A; hisbo_control_demo=false' } }));
  assert.equal(result.statusCode, 401);
});
test('production demo cookie never authorizes an unverified dashboard session', async () => {
  assert.equal((await fixture({ verified: false, demo: 'super_admin' }).page()).isAuthenticated, false);
  const dev = fixture({ verified: false, demo: 'super_admin', production: false });
  const result = await dev.page();
  assert.equal(result.isDemo, true); assert.deepEqual(dev.calls, []);
});

test('late concurrent login failures cannot erase an active lockout after the observation window', () => {
  let now = 0;
  const exports = {}, storeHost = {};
  const source = ts.transpileModule(fs.readFileSync('src/lib/auth/rate-limiter.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const config = { MAX_FAILED_ATTEMPTS: 5, WINDOW_MS: 900000, LOCKOUT_MS: 900000 };
  vm.runInNewContext(source, { exports, globalThis: storeHost, Date: { now: () => now }, Map, require: () => ({ RATE_LIMIT_CONFIG: config }) });
  exports.recordFailedAttempt('account');
  now = 899000;
  for (let i = 0; i < 4; i++) exports.recordFailedAttempt('account');
  assert.equal(exports.checkRateLimit('account').allowed, false);
  now = 900001;
  exports.recordFailedAttempt('account'); // An earlier in-flight login response arrives late.
  assert.equal(exports.checkRateLimit('account').allowed, false);
  now = 1800001;
  assert.equal(exports.checkRateLimit('account').allowed, true);
});

function contentFixture(file, authorized) {
  const calls = [];
  const result = { posts: [{ id: 'fixture' }], post: { id: 'fixture' }, count: 1, categories: [], category: { id: 'category', name: 'Finance' }, banners: [{ id: 'fixture' }], banner: { id: 'fixture' }, settings: {}, success: true };
  const operator = new Proxy({}, { get: (_, name) => name === 'getProductionOperatorStatus'
    ? () => ({ enabled: true, configured: true })
    : async (...args) => { calls.push([name, args]); return result; } });
  const mocks = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/auth/admin-guard': { verifyRealAdminSession: async () => ({ authorized, statusCode: authorized ? 200 : 403, error: 'Denied', user: { email: 'fixture@example.test' } }) },
    '@/lib/production/operator': operator, '@/lib/auth/audit': { logAuthEvent() {} },
    '@/lib/analytics/ga4-client': { fetchAdvancedGA4Report: async options => { calls.push(['analytics', options]); return { success: true }; }, fetchLiveGA4Realtime: async () => ({ success: true }) },
    '@supabase/supabase-js': { createClient: () => ({ storage: { from(bucket) { return {
      async upload(name) { calls.push(['upload', bucket, name]); return { error: null }; },
      getPublicUrl: name => ({ data: { publicUrl: 'https://fixture.test/' + name } }),
    }; } } }) },
    '@/lib/storage/image-validator': (() => {
      const exports = {};
      vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/storage/image-validator.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
      return exports;
    })(),
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, console, Buffer, Blob,
    process: { env: { PROD_SUPABASE_URL: 'https://fixture.test', PROD_SUPABASE_SERVICE_KEY: 'fixture-only' } },
    require(name) { if (mocks[name]) return mocks[name]; if (name === 'crypto') return require('node:crypto'); throw Error('Unexpected external dependency: ' + name); },
  });
  return { exports, calls };
}
for (const route of ['blogs', 'banners', 'settings', 'blogs/categories', 'analytics/data', 'analytics/realtime']) {
  test(`protected ${route} handlers reject before touching downstream services`, async () => {
    const f = contentFixture(`src/app/api/admin/${route}/route.ts`, false);
    for (const handler of Object.values(f.exports).filter(value => typeof value === 'function')) {
      assert.equal((await handler(new Request('http://fixture/'))).status, 403);
    }
    assert.equal(f.calls.length, 0);
  });
}
for (const route of ['blogs', 'banners']) {
  test(`authorized ${route} CRUD retains API contracts using isolated operator fixtures`, async () => {
    const f = contentFixture(`src/app/api/admin/${route}/route.ts`, true);
    const request = (method, body) => new Request('http://fixture/?id=fixture', { method, ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const payload = route === 'blogs' ? { title: 'Fixture', slug: 'fixture', content: 'Fixture only' } : { image_url: 'https://fixture.test/image.png' };
    for (const [method, body] of [['GET'], ['POST', payload], ['PUT', { id: 'fixture', updates: { title: 'Edited' } }], ['DELETE']]) {
      const response = await f.exports[method](request(method, body));
      assert.equal(response.status, 200); assert.equal((await response.json()).success, true);
    }
    assert.ok(f.calls.some(([name]) => name.startsWith('createProduction')));
    assert.ok(f.calls.some(([name]) => name.startsWith('updateProduction')));
    assert.ok(f.calls.some(([name]) => name.startsWith('deleteProduction')));
  });
}
for (const route of ['blogs', 'banners']) {
  test(`${route} upload rejects unauthorized/SVG requests and retains authorized storage response with a fixture`, async () => {
    const file = `src/app/api/admin/${route}/upload/route.ts`;
    const denied = contentFixture(file, false);
    assert.equal((await denied.exports.POST({})).status, 403); assert.equal(denied.calls.length, 0);
    const allowed = contentFixture(file, true);
    const request = bytes => ({ formData: async () => new Map([['file', new Blob([bytes], { type: 'image/png' })]]) });
    assert.equal((await allowed.exports.POST(request('<svg><script>unsafe</script></svg>'))).status, 400);
    assert.equal(allowed.calls.length, 0);
    const response = await allowed.exports.POST(request(Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])));
    assert.equal(response.status, 200);
    const data = await response.json(); assert.equal(data.success, true); assert.match(data.publicUrl, /^https:\/\/fixture\.test\//);
    assert.equal(allowed.calls[0][0], 'upload'); assert.match(allowed.calls[0][2], /\.png$/);
  });
}
