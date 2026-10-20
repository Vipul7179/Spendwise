const { test } = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('./helpers/source-runtime.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));

function appFixture({ signedIn = true, guest = false, saved, readFailure = false, writeFailure = false, pending = false, now } = {}) {
  const hooks = [], effects = [], timers = new Map(), storage = new Map();
  const cloud = { cats: [{ id: 'food', name: 'Food', limit: 10000 }], exps: [], rec: [], alerts: [], goals: [], groups: [], fired: {}, name: 'Test', theme: 'dark', hide: false };
  if (saved) storage.set('spendwise_v1', JSON.stringify(saved));
  if (guest) storage.set('sw_guest', '1');
  if (pending) storage.set('sw_pending_user', 'fixture-user');
  let cursor = 0, firstRender = true, signOutCount = 0, authListener;
  const writes = [], routes = [];
  const failures = { read: readFailure, write: writeFailure, signOut: false };
  const session = signedIn ? { user: { id: 'fixture-user' } } : null;
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: listener => { authListener = listener; return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: async () => { signOutCount++; if (!failures.signOut) authListener('SIGNED_OUT'); return { error: failures.signOut ? Error('Sign-out failed') : null }; },
    },
    from(table) {
      return {
        select() { return this; }, eq() { return this; },
        maybeSingle: async () => table === 'profiles' ? { data: { is_admin: false }, error: null }
          : failures.read ? { data: null, error: Error('Read offline') } : { data: { data: clone(cloud) }, error: null },
        upsert: async payload => {
          writes.push(clone(payload));
          if (failures.write) return { error: Error('Write offline') };
          Object.keys(cloud).forEach(key => delete cloud[key]);
          Object.assign(cloud, clone(payload.data));
          return { error: null };
        },
      };
    },
  };
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useCallback: fn => fn, useEffect: fn => { if (firstRender) effects.push(fn); },
  };
  class FixtureDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return new Date(now).getTime(); }
  }
  const load = runtime({
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'next/navigation': { useRouter: () => ({ push: route => routes.push(route) }) },
    '@/lib/supabase/client': { createClient: () => client },
  }, {
    ...(now ? { Date: FixtureDate } : {}),
    window: {}, document: { documentElement: { setAttribute() {}, removeAttribute() {} }, createElement: () => ({ style: {}, remove() {} }), body: { appendChild() {} } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout: fn => { const id = Symbol(); timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
  });
  const { AppProvider } = load('src/context/AppContext.tsx');
  function render(publicView = false) { cursor = 0; const node = AppProvider({ children: null, publicView }); firstRender = false; return node.props.value; }
  render();
  let cleanup;
  return {
    async boot() { const cleanups = effects.map(effect => effect()); cleanup = () => cleanups.forEach(fn => fn?.()); await tick(); await tick(); return render(); },
    render, failures, writes, storage, cloud, routes,
    async flushTimers() { const pendingTimers = [...timers.values()]; timers.clear(); pendingTimers.forEach(fn => fn()); await tick(); await tick(); },
    async unmount() { cleanup(); await tick(); await tick(); },
    get signOutCount() { return signOutCount; },
  };
}

test('private-route access keeps anonymous, guest, signed-in and public Blog rules distinct', () => {
  const { appAccess } = runtime()('src/lib/auth-access.ts');
  assert.equal(appAccess(false, true, false, false), 'loading');
  assert.equal(appAccess(false, false, false, false), 'login');
  assert.equal(appAccess(false, false, false, true), 'allow');
  assert.equal(appAccess(false, false, true, false), 'allow');
  assert.equal(appAccess(true, true, false, false), 'allow');
});

test('the actual app shell withholds private children and redirects only resolved anonymous visits', () => {
  for (const [loading, signedIn, guest, publicView] of [
    [true, false, false, false], [false, false, false, false],
    [false, false, true, false], [false, true, false, false], [true, false, false, true],
  ]) {
    const routes = [], effects = [];
    const mocks = {
      react: { useState: value => [value, () => {}], useEffect: effect => effects.push(effect) },
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      'next/navigation': { useRouter: () => ({ replace: route => routes.push(route) }) },
      '@/context/AppContext': { useApp: () => ({ state: { name: 'Fixture' }, isLoading: loading, user: signedIn ? {} : null, isGuest: guest }) },
      '@/context/ModalContext': { useModal: () => ({ openName() {}, openAccount() {} }) },
    };
    for (const name of ['DesktopSidebar', 'TopBar', 'MobileNav', 'MobileDrawer', 'AppFooter', 'FloatingAddButton', 'ToastContainer', 'modals/ModalHost']) {
      mocks['@/components/app/' + name] = { default: name };
    }
    const { AppShellContent } = runtime(mocks)('src/components/app/AppLayout.tsx');
    const tree = AppShellContent({ children: 'PRIVATE_CHILD_MARKER', publicView });
    effects.forEach(effect => effect());
    const allowed = publicView || (!loading && (signedIn || guest));
    assert.equal(JSON.stringify(tree).includes('PRIVATE_CHILD_MARKER'), allowed);
    assert.deepEqual(routes, !publicView && !loading && !signedIn && !guest ? ['/login'] : []);
  }
});

test('failed sync retains local data, reports failure, retries, and blocks destructive sign-out', async () => {
  const fixture = appFixture({ writeFailure: true });
  await fixture.boot();
  fixture.render().updateName('Unsynced name');
  assert.equal(await fixture.render().syncNow(), false);
  assert.equal(fixture.render().syncStatus, 'error');
  assert.match(fixture.render().toastInfo.msg, /Could not sync/);
  assert.equal(JSON.parse(fixture.storage.get('spendwise_v1')).name, 'Unsynced name');
  assert.equal(fixture.storage.get('sw_pending_user'), 'fixture-user');
  assert.equal(await fixture.render().logout(), false);
  assert.equal(fixture.signOutCount, 0);
  assert.ok(fixture.render().user);
  fixture.failures.write = false;
  assert.equal(await fixture.render().syncNow(), true);
  assert.equal(fixture.cloud.name, 'Unsynced name');
  assert.equal(fixture.render().syncStatus, 'synced');
  assert.match(fixture.render().toastInfo.msg, /Synced to your account/);
  assert.equal(fixture.storage.has('sw_pending_user'), false);
  await fixture.unmount();
});

test('navigation flushes pending writes and a failed sign-out request preserves the session', async () => {
  const fixture = appFixture();
  await fixture.boot();
  fixture.render().updateName('Before navigation');
  await fixture.unmount();
  assert.equal(fixture.cloud.name, 'Before navigation');
  const second = appFixture();
  await second.boot();
  second.failures.signOut = true;
  assert.equal(await second.render().logout(), false);
  assert.ok(second.render().user);
  assert.ok(second.storage.has('spendwise_v1'));
  second.failures.signOut = false;
  assert.equal(await second.render().logout(), true);
  assert.equal(second.signOutCount, 2);
  assert.equal(second.storage.has('spendwise_v1'), false);
  await second.unmount();
});

test('failed cloud bootstrap never overwrites remote data and manual retry re-reads before saving', async () => {
  const fixture = appFixture({ readFailure: true });
  await fixture.boot();
  await fixture.flushTimers();
  assert.equal(fixture.writes.length, 0);
  assert.equal(await fixture.render().syncNow(), false);
  assert.equal(fixture.writes.length, 0);
  fixture.failures.read = false;
  assert.equal(await fixture.render().syncNow(), true);
  assert.equal(fixture.cloud.name, 'Test');
  await fixture.unmount();
});

test('guest reload retains deleted defaults, explicit false settings and hero override', async () => {
  const saved = { cats: [], exps: [], rec: [], goals: [], groups: [], alerts: [], fired: {}, name: 'Guest', theme: 'dark', hide: false, hh: true };
  const fixture = appFixture({ signedIn: false, guest: true, saved });
  await fixture.boot();
  assert.equal(fixture.render().state.cats.length, 0);
  assert.equal(fixture.render().state.theme, 'dark');
  assert.equal(fixture.render().state.hh, true);
  fixture.render().toggleHeroHide();
  assert.equal(fixture.render().state.hide, false);
  assert.equal(fixture.render().state.hh, false);
  fixture.render().toggleHide();
  assert.equal(fixture.render().state.hide, true);
  assert.equal('hh' in fixture.render().state, false);
  assert.equal(fixture.writes.length, 0);
  await fixture.unmount();
});

test('pending full snapshot survives reload with deletions and edits intact', async () => {
  const saved = { cats: [], exps: [], rec: [], goals: [], groups: [], alerts: [], fired: {}, name: 'Pending edit' };
  const fixture = appFixture({ saved, pending: true });
  await fixture.boot();
  assert.equal(fixture.render().state.cats.length, 0);
  assert.equal(fixture.render().state.name, 'Pending edit');
  assert.equal(await fixture.render().syncNow(), true);
  assert.equal(fixture.cloud.cats.length, 0);
  await fixture.unmount();
});

test('serialized writes retain order after a failure and never race snapshots', async () => {
  const { serializeStateWrite, settleStateWrites } = runtime()('src/lib/state/sync.ts');
  const calls = [];
  let release;
  const first = serializeStateWrite(async () => { calls.push('first'); await new Promise(resolve => { release = resolve; }); throw Error('offline'); });
  const failure = assert.rejects(first, /offline/);
  const second = serializeStateWrite(async () => { calls.push('second'); });
  await tick();
  assert.deepEqual(calls, ['first']);
  release();
  await failure; await second; await settleStateWrites();
  assert.deepEqual(calls, ['first', 'second']);
});

test('recurring expenses generate legacy threshold alerts once, including February clamping', () => {
  for (const today of ['2026-02-28T12:00:00', '2024-02-29T12:00:00']) {
    class FixedDate extends Date {
      constructor(...args) { super(...(args.length ? args : [today])); }
      static now() { return new Date(today).getTime(); }
    }
    const { applyRecurringExpenses } = runtime({}, { Date: FixedDate })('src/lib/state/transitions.ts');
    const initial = { cats: [{ id: 'food', name: 'Food', limit: 10000 }],
      exps: [{ id: 'manual', cat: 'food', date: today.slice(0, 10), amt: 2000 }],
      rec: [{ id: 'r1', name: 'First', amt: 4000, cat: 'food', day: 31 }, { id: 'r2', name: 'Second', amt: 6000, cat: 'food', day: 31 }],
      alerts: [], fired: {}, groups: [], goals: [] };
    const before = JSON.stringify(initial);
    const next = applyRecurringExpenses(initial);
    assert.equal(next.exps.length, 3);
    assert.equal(next.exps[1].date, today.slice(0, 10));
    assert.equal(next.exps[1].nt, undefined, 'Auto expenses preserve legacy metadata');
    assert.equal(next.alerts.length, 4);
    assert.match(next.alerts[0].msg, /^Over budget/);
    assert.match(next.alerts[3].msg, /50%/);
    assert.equal(Object.keys(next.fired).length, 4);
    assert.equal(applyRecurringExpenses(next), next, 'Reload does not recreate monthly expenses or alerts');
    assert.equal(JSON.stringify(initial), before, 'Transition does not mutate input state');
  }
});

test('failed recurring-expense persistence survives retry/reload without duplicate expenses or alerts', async () => {
  const saved = { cats: [{ id: 'food', name: 'Food', limit: 10000 }],
    exps: [{ id: 'manual', cat: 'food', date: '2026-02-01', amt: 2000 }],
    rec: [{ id: 'monthly', name: 'Monthly', cat: 'food', amt: 10000, day: 31 }],
    alerts: [], fired: {}, groups: [], goals: [] };
  const first = appFixture({ saved, writeFailure: true, now: '2026-02-28T12:00:00' });
  await first.boot();
  assert.equal(first.render().state.exps.length, 2);
  assert.equal(first.render().state.alerts.length, 4);
  assert.equal(await first.render().syncNow(), false);
  await first.unmount();
  const pending = JSON.parse(first.storage.get('spendwise_v1'));
  assert.equal(pending.rec[0].last, '2026-02');
  const reloaded = appFixture({ saved: pending, pending: true, now: '2026-02-28T12:00:00' });
  await reloaded.boot();
  assert.equal(reloaded.render().state.exps.length, 2);
  assert.equal(reloaded.render().state.alerts.length, 4);
  assert.equal(await reloaded.render().syncNow(), true);
  assert.equal(reloaded.cloud.exps.length, 2);
  assert.equal(reloaded.cloud.alerts.length, 4);
  await reloaded.unmount();
});

test('all hero/global combinations follow legacy hh, tgHero and tgHide semantics', () => {
  const { heroIsHidden, toggleGlobalPrivacy } = runtime()('src/lib/state/transitions.ts');
  for (const hide of [false, true]) for (const hh of [undefined, false, true]) {
    const state = { hide, ...(hh === undefined ? {} : { hh }), exps: [{ amt: 123 }] };
    assert.equal(heroIsHidden(state), hh === undefined ? hide : hh);
    const heroToggled = { ...state, hh: !heroIsHidden(state) };
    assert.equal(heroToggled.hide, hide);
    assert.equal(heroIsHidden(heroToggled), !heroIsHidden(state));
    const globalToggled = toggleGlobalPrivacy(state);
    assert.equal(globalToggled.hide, !hide);
    assert.equal('hh' in globalToggled, false);
    assert.equal(heroIsHidden(globalToggled), !hide);
    assert.equal(globalToggled.exps[0].amt, 123);
  }
});

test('global message masking preserves legacy glyphs and hides money without changing counts', () => {
  const { maskAmounts, MASK_AMOUNT } = runtime()('src/lib/state/calculations.ts');
  assert.equal(MASK_AMOUNT, '\u20b9\u00a0\u25cf\u202f\u25cf\u202f\u25cf\u202f\u25cf');
  assert.equal(maskAmounts('50% used: ₹1,200.50 of ₹2000. 2 expenses.'), `50% used: ${MASK_AMOUNT} of ${MASK_AMOUNT}. 2 expenses.`);
});

test('guest CRUD, savings milestones, group settlement and settings survive synthetic reload', async () => {
  const saved = { cats: [{ id: 'food', name: 'Food', limit: 10000 }], exps: [], rec: [], alerts: [], goals: [], groups: [], fired: {}, name: 'Fixture' };
  const fixture = appFixture({ signedIn: false, guest: true, saved });
  await fixture.boot();
  fixture.render().addExpense({ amt: 6000, cat: 'food', date: '2026-10-01', note: 'Lunch' });
  const expenseId = fixture.render().state.exps[0].id;
  assert.equal(fixture.render().state.alerts.length, 1);
  fixture.render().deleteExpense(expenseId);
  assert.equal(fixture.render().state.exps.length, 0);
  assert.equal(fixture.render().addCategory('Food', 500), false);
  assert.equal(fixture.render().addCategory('Transport', 500), true);
  const categoryId = fixture.render().state.cats[1].id;
  fixture.render().setCategoryLimit(categoryId, 1000);
  assert.equal(fixture.render().state.cats[1].limit, 1000);
  fixture.render().deleteCategory(categoryId);
  assert.equal(fixture.render().state.cats.length, 1);
  fixture.render().addGoal('Trip', 1000);
  const goalId = fixture.render().state.goals[0].id;
  fixture.render().addSavings(goalId, 300);
  fixture.render().addSavings(goalId, 800);
  assert.equal(fixture.render().state.goals[0].saved, 1100);
  assert.deepEqual(clone(fixture.render().state.goals[0].ms), [25, 50, 75, 100]);
  fixture.render().addGroup('Home', ['Alex']);
  const groupId = fixture.render().state.groups[0].id;
  fixture.render().addSharedExpense(groupId, { amt: 101, desc: 'Tea', payer: 0, with: [0, 1] });
  const sharedId = fixture.render().state.groups[0].exps[0].id;
  fixture.render().toggleGroupExpensePaid(groupId, sharedId, 1);
  assert.equal(fixture.render().state.groups[0].exps[0].paid[1], true);
  fixture.render().toggleGroupExpensePaid(groupId, sharedId, 1);
  fixture.render().markAllGroupDuesSettled(groupId, 1, 0);
  fixture.render().saveMemberPhone(groupId, 1, '919999999999');
  fixture.render().updateEmailSettings('fixture@example.test', true);
  fixture.render().updatePhoneSettings('918888888888', 'sms');
  const persisted = JSON.parse(fixture.storage.get('spendwise_v1'));
  const reloaded = appFixture({ signedIn: false, guest: true, saved: persisted });
  await reloaded.boot();
  assert.deepEqual(clone(reloaded.render().state), persisted);
  reloaded.render().deleteSharedExpense(groupId, sharedId);
  reloaded.render().deleteGroup(groupId);
  reloaded.render().deleteGoal(goalId);
  reloaded.render().clearAlerts();
  assert.equal(reloaded.render().state.groups.length, 0);
  assert.equal(reloaded.render().state.goals.length, 0);
  assert.equal(reloaded.render().state.alerts.length, 0);
  assert.equal(fixture.writes.length + reloaded.writes.length, 0, 'Guest actions never write to Supabase');
  await fixture.unmount(); await reloaded.unmount();
});

test('guest confirmation never establishes guest mode before explicit acceptance', () => {
  let open = false;
  const storage = new Map(), routes = [];
  const { default: Entry } = runtime({
    react: { useState: initial => [open || initial, value => { open = value; }] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/navigation': { useRouter: () => ({ push: route => routes.push(route) }) },
    'next/link': { default: 'Link' },
  }, { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } })('src/components/auth/GuestEntryButton.tsx');
  const render = () => Entry({ className: 'lk', children: 'Continue' });
  const walk = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat().flatMap(walk)] : [];
  render().props.children[0].props.onClick();
  assert.equal(storage.has('sw_guest'), false);
  const tree = render();
  assert.ok(walk(tree).some(node => node.props?.role === 'dialog'));
  walk(tree).find(node => node.type === 'button' && node.props.children === 'Continue as guest').props.onClick();
  assert.equal(storage.get('sw_guest'), '1');
  assert.deepEqual(routes, ['/overview']);
});

test('signed-in auth visits return to Overview without affecting password-recovery routes', async () => {
  for (const pathname of ['/login', '/signup', '/forgot-password', '/reset-password']) {
    const routes = [];
    let effect;
    const { default: Redirect } = runtime({
      react: { useEffect: fn => { effect = fn; } },
      'next/navigation': { usePathname: () => pathname, useRouter: () => ({ replace: route => routes.push(route) }) },
      '@/lib/supabase/client': { createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: 'fixture' } } } }) } }) },
    })('src/components/auth/AuthSessionRedirect.tsx');
    Redirect(); effect(); await tick();
    assert.deepEqual(routes, ['/login', '/signup'].includes(pathname) ? ['/overview'] : []);
  }
});

test('landing guests retain login and signup links while real account sessions retain app access', () => {
  for (const signedIn of [false, true]) {
    const { default: Navbar } = runtime({
      react: { useState: () => [signedIn, () => {}], useEffect: () => {}, useSyncExternalStore: () => '1' },
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      'next/navigation': { usePathname: () => '/' },
      'next/link': { default: 'Link' },
      'next/image': { default: 'Image' },
      '@/lib/supabase/client': { createClient: () => { throw Error('No network in fixture'); } },
    })('src/components/marketing/Navbar.tsx');
    const walk = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat().flatMap(walk)] : [];
    const hrefs = walk(Navbar()).filter(node => node.type === 'Link').map(node => node.props.href);
    assert.equal(hrefs.includes('/login'), !signedIn);
    assert.equal(hrefs.includes('/signup'), !signedIn);
    assert.ok(hrefs.includes('/overview'));
  }
});

test('toast replacement, manual dismissal and unmount cancel stale expiry timers', async () => {
  const fixture = appFixture({ signedIn: false, guest: true });
  await fixture.boot();
  fixture.render().showToast('First');
  fixture.render().showToast('Replacement');
  assert.equal(fixture.render().toastInfo.msg, 'Replacement');
  await fixture.flushTimers();
  assert.equal(fixture.render().toastInfo, null);
  fixture.render().showToast('Dismiss me');
  fixture.render().dismissToast();
  await fixture.flushTimers();
  assert.equal(fixture.render().toastInfo, null);
  fixture.render().showToast('Unmount');
  await fixture.unmount();
  await fixture.flushTimers();
  assert.equal(fixture.render().toastInfo.msg, 'Unmount');
});
