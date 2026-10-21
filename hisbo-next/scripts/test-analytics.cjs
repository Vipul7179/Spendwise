const { test } = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('./helpers/source-runtime.cjs');
const USER = '12345678-1234-4234-9234-123456789abc';

for (const consent of ['unknown', 'denied', 'granted']) test(`preferences stay collapsed and do not change saved ${consent} consent on render`, () => {
  const choices = [];
  let closed = false, focused = false;
  const details = { open: true, querySelector: () => ({ focus: () => { focused = true; } }) };
  Object.defineProperty(details, 'open', { set(value) { closed = value === false; } });
  const load = runtime({
    react: { useRef: () => ({ current: details }), useSyncExternalStore: () => `${consent}:false:false:false:normal` },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/link': { default: 'link' },
    '@/lib/analytics': { setAnalyticsConsent: value => choices.push(value) },
  });
  const tree = load('src/components/common/AnalyticsPreferences.tsx').default();
  const walk = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat().flatMap(walk)] : [];
  const nodes = walk(tree);
  assert.equal(tree.type, 'section');
  assert.equal(nodes.find(node => node.type === 'details').props.open, undefined, 'No automatic expansion');
  assert.equal(nodes.find(node => node.type === 'summary').props.children, 'Analytics Preferences');
  assert.deepEqual(choices, [], 'Rendering never records consent');
  nodes.find(node => node.type === 'button' && node.props.children === 'Reject analytics').props.onClick();
  assert.deepEqual(choices, ['denied']); assert.equal(closed, true); assert.equal(focused, true);
});

test('Privacy Policy preferences respect a browser opt-out and do not show a popup', () => {
  const load = runtime({
    react: { useRef: () => ({ current: null }), useSyncExternalStore: () => 'denied:false:false:false:optout' },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/link': { default: 'link' }, '@/lib/analytics': {},
  });
  const tree = load('src/components/common/AnalyticsPreferences.tsx').default();
  const walk = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat().flatMap(walk)] : [];
  const nodes = walk(tree);
  assert.equal(tree.type, 'section');
  assert.equal(nodes.find(node => node.type === 'button' && node.props.children === 'Allow analytics').props.disabled, true);
  assert.ok(!JSON.stringify(tree).includes('Help improve Hisbo?'));
  assert.ok(!nodes.some(node => node.props?.role === 'dialog'));
});

function fixture({ configured = true, optOut = false, storageBlocked = false } = {}) {
  const local = new Map(), session = new Map(), listeners = new Map();
  let now = 1800000000000;
  const storage = map => ({ getItem(key) { if (storageBlocked) throw Error('Blocked'); return map.get(key) ?? null; }, setItem(key, value) { if (storageBlocked) throw Error('Blocked'); map.set(key, value); }, removeItem(key) { if (storageBlocked) throw Error('Blocked'); map.delete(key); } });
  const window = {
    localStorage: storage(local), sessionStorage: storage(session), navigator: { globalPrivacyControl: optOut },
    location: { pathname: '/', hostname: 'www.hisbo.in', search: '' },
    addEventListener(name, callback) { listeners.set(name, callback); }, removeEventListener(name) { listeners.delete(name); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
  };
  const document = { cookie: '_ga=test; _ga_LCMEK1R5HY=test; essential_auth=keep' };
  class Clock extends Date { static now() { return now; } }
  const api = runtime({}, { window, document, Event, URLSearchParams, Date: Clock,
    process: { env: { NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-LCMEK1R5HY', NEXT_PUBLIC_GA_MANUAL_TRACKING_READY: String(configured) } },
  })('src/lib/analytics.ts');
  const commands = () => (window.dataLayer || []).map(args => Array.from(args));
  const events = () => commands().filter(args => args[0] === 'event');
  const grant = () => { api.setAnalyticsConsent('granted'); api.initializeAnalytics(); api.analyticsScriptReady(); };
  return { api, window, document, local, session, commands, events, grant, advance: value => { now += value; }, now: () => now };
}

test('no tag initialization, events, identity commands, or replay before consent', () => {
  const f = fixture();
  f.api.trackEvent('expense_created'); f.api.setAnalyticsUser(USER); f.api.trackPageView('/overview?token=SECRET'); f.api.initializeAnalytics();
  assert.equal(f.window.gtag, undefined); assert.equal(f.window.dataLayer, undefined);
  f.grant(); assert.equal(f.events().length, 0);
});

test('deployment gate and browser opt-out prevent collection even after Allow', () => {
  for (const options of [{ configured: false }, { optOut: true }]) {
    const f = fixture(options); f.grant(); f.api.trackEvent('login', { method: 'email' });
    assert.equal(f.commands().length, 0);
  }
});

test('blocked preference storage still allows a reversible in-memory choice', () => {
  const f = fixture({ storageBlocked: true }); f.grant();
  f.api.trackEvent('feature_opened', { feature_name: 'blog' }); assert.equal(f.events().length, 1);
  f.api.setAnalyticsConsent('denied'); f.api.trackEvent('feature_opened'); assert.equal(f.events().length, 1);
});

test('only manual page views; effect replays deduplicate and real Back counts', () => {
  const f = fixture(); f.grant(); f.api.setAnalyticsUser(null);
  f.api.trackPageView('/'); f.api.trackPageView('/'); f.api.trackPageView('/overview'); f.api.trackPageView('/overview'); f.api.trackPageView('/');
  assert.equal(f.events().filter(event => event[1] === 'page_view').length, 3);
  const config = f.commands().find(args => args[0] === 'config')[2];
  assert.equal(config.send_page_view, false); assert.equal(config.allow_google_signals, false); assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal('user_id' in config, false, 'Config must not override later global login/logout identity changes');
  assert.equal('page_location' in config, false, 'Config must not pin automatic engagement to the first route');
});

test('payload allowlists remove PII, financial values, raw paths, queries, titles and referrers', () => {
  const f = fixture(); f.window.location.pathname = '/groups'; f.window.location.search = '?token=SECRET'; f.grant();
  f.api.trackEvent('expense_created', { feature_name: 'expenses', action_source: 'sms_import', method: 'secret@example.com', amount: 12345, note: 'PRIVATE', user_id: 'email@example.com', success: true });
  f.api.trackEvent('PRIVATE_EVENT', { feature_name: 'PRIVATE' });
  f.api.setAnalyticsUser(null); f.api.trackPageView('/blog/private@example.com?token=SECRET#private');
  const serialized = JSON.stringify(f.commands());
  for (const secret of ['SECRET', 'PRIVATE', 'private@example.com', '12345', 'email@example.com', 'token=']) assert.ok(!serialized.includes(secret), secret);
  assert.equal(f.events()[0][2].action_source, 'sms_import');
  assert.equal(f.events().find(event => event[1] === 'page_view')[2].page_path, '/blog/article');
});

test('authenticated identity uses only internal UUID and is cleared for later events', () => {
  const f = fixture(); f.grant(); f.api.setAnalyticsUser('someone@example.com'); f.api.trackEvent('feature_opened');
  f.api.trackAuthSuccess('email', 'login', USER, false); f.api.clearAnalyticsUser(); f.api.trackEvent('feature_opened');
  const commands = f.commands(); const lastEvent = commands.findLastIndex(event => event[0] === 'event');
  assert.equal(commands[lastEvent - 1][1].user_id, null);
  assert.ok(!JSON.stringify(commands).includes('someone@example.com'));
  assert.equal(f.events().filter(event => event[1] === 'login').length, 1);
});

test('guest mode and per-tab session events carry no authenticated identity', () => {
  const f = fixture(); f.grant(); f.local.set('sw_guest', '1');
  f.api.trackGuestModeStarted(); f.api.setAnalyticsUser(null); f.api.setAnalyticsUser(null);
  f.api.trackFeatureEvent('expense_created', 'expenses', 'quick_add');
  assert.equal(f.events().filter(event => event[1] === 'guest_mode_started').length, 1);
  assert.equal(f.events().filter(event => event[1] === 'guest_session_started').length, 1);
  assert.equal(f.events().filter(event => event[1] === 'guest_feature_used').length, 1);
  for (const event of f.events()) assert.equal(event[2].user_mode, 'guest');
  assert.ok(!JSON.stringify(f.commands()).includes(USER));
});

test('email confirmation signup tracks creation now and guest conversion only after matching authentication', () => {
  const f = fixture(); f.grant(); f.local.set('sw_guest', '1'); f.api.setAnalyticsUser(null);
  f.api.trackPageView('/signup'); f.api.trackPageView('/privacy'); f.api.trackPageView('/signup');
  const created = new Date(f.now()).toISOString();
  f.api.trackEmailSignupCreated(USER, false, true, created, f.now());
  f.api.trackEmailSignupCreated(USER, false, true, created, f.now()); // Resend for an unconfirmed account.
  assert.equal(f.events().filter(event => event[1] === 'sign_up').length, 1);
  assert.equal(f.events().filter(event => event[1] === 'guest_signup_started').length, 1);
  assert.equal(f.events().filter(event => event[1] === 'guest_signup_completed').length, 0);
  f.api.trackAuthSuccess('email', 'login', USER, true);
  f.api.trackAuthSuccess('email', 'login', USER, false);
  assert.equal(f.events().filter(event => event[1] === 'guest_signup_completed').length, 1);
});

test('an existing unconfirmed email account is not counted as a fresh signup', () => {
  const f = fixture(); f.grant();
  f.api.trackEmailSignupCreated(USER, false, false, new Date(f.now() - 86400000).toISOString(), f.now());
  assert.equal(f.events().filter(event => event[1] === 'sign_up').length, 0);
});

test('OAuth callbacks consume only explicit attempts and distinguish new accounts conservatively', () => {
  for (const isNew of [true, false]) {
    const f = fixture(); f.grant(); f.local.set('sw_guest', '1'); f.api.setAnalyticsUser(null);
    f.api.beginGoogleAnalyticsFlow(); const created_at = new Date(f.now() + (isNew ? 500 : -86400000)).toISOString(); f.advance(1000);
    f.api.consumeGoogleAnalyticsFlow({ id: USER, created_at }, '/overview');
    f.api.consumeGoogleAnalyticsFlow({ id: USER, created_at }, '/overview');
    f.api.setAnalyticsUser(USER); // SIGNED_IN on focus / token refresh.
    assert.equal(f.events().filter(event => ['sign_up', 'login'].includes(event[1])).length, 1);
    assert.equal(f.events().find(event => ['sign_up', 'login'].includes(event[1]))[1], isNew ? 'sign_up' : 'login');
    assert.equal(f.events().filter(event => event[1] === 'guest_signup_completed').length, isNew ? 1 : 0);
  }
});

test('OAuth cancellation produces one safe failure without leaking callback errors', () => {
  const f = fixture(); f.grant(); f.api.beginGoogleAnalyticsFlow(); f.window.location.search = '?error=SECRET';
  f.api.consumeGoogleAnalyticsFlow(null, '/login'); f.api.consumeGoogleAnalyticsFlow(null, '/login');
  assert.equal(f.events().filter(event => event[1] === 'login_failed').length, 1);
  assert.ok(!JSON.stringify(f.commands()).includes('SECRET'));
});

test('revocation clears buffered events, identity, flow markers and disables future hits', () => {
  const f = fixture(); f.api.subscribeAnalytics(() => {}); f.api.setAnalyticsConsent('granted'); f.api.initializeAnalytics();
  f.api.setAnalyticsUser(USER); f.api.trackEvent('expense_created'); f.api.beginGoogleAnalyticsFlow();
  f.api.setAnalyticsConsent('denied'); f.api.analyticsScriptReady();
  assert.equal(f.events().length, 0); assert.equal(f.session.size, 0); assert.equal(f.window['ga-disable-G-LCMEK1R5HY'], true);
  f.grant(); f.api.setAnalyticsUser(null); f.api.trackEvent('feature_opened');
  assert.ok(!JSON.stringify(f.commands()).includes(USER));
});

test('cross-tab rejection disables collection and blocked Google does not throw', () => {
  const f = fixture(); f.api.subscribeAnalytics(() => {}); f.grant();
  f.window.gtag = () => { throw Error('Blocked by browser'); };
  assert.doesNotThrow(() => { f.api.trackEvent('expense_created'); f.api.setAnalyticsUser(USER); });
  f.local.set('hisbo_analytics_consent_v1', 'denied'); f.window.dispatchEvent(new Event('storage'));
  assert.equal(f.window['ga-disable-G-LCMEK1R5HY'], true);
  assert.doesNotThrow(() => f.api.trackEvent('expense_created'));
});

test('saved financial transitions emit safe actions and skip no-op settlements/completions', () => {
  const emitted = [];
  const track = runtime({ './analytics': { analyticsFeaturesEnabled: () => true, trackFeatureEvent: (...args) => emitted.push(args) } })('src/lib/analytics-state.ts').trackSavedStateChanges;
  const initial = { exps: [], cats: [], goals: [], rec: [], groups: [], alerts: [], fired: {} };
  const added = { ...initial, exps: [{ id: 'PRIVATE', amt: 555, cat: 'PRIVATE', note: 'PRIVATE' }], cats: [{ id: 'b', name: 'PRIVATE', limit: 123 }], goals: [{ id: 'g', name: 'PRIVATE', saved: 0, target: 100, ms: [] }], groups: [{ id: 'group', name: 'PRIVATE', members: ['PRIVATE'], exps: [{ id: 'e', payer: 0, with: [1], paid: {}, amt: 555 }] }] };
  track(initial, added, 'quick_add');
  assert.deepEqual(emitted.map(event => event[0]), ['expense_created', 'budget_created', 'savings_goal_created', 'group_created', 'split_expense_created']);
  assert.ok(!JSON.stringify(emitted).includes('PRIVATE')); assert.ok(!JSON.stringify(emitted).includes('555'));
  emitted.length = 0;
  const updated = { ...added, goals: [{ ...added.goals[0], saved: 100 }], groups: [{ ...added.groups[0], exps: [{ ...added.groups[0].exps[0], paid: { 1: true } }] }] };
  track(added, updated); track(updated, updated);
  assert.equal(emitted.filter(event => event[0] === 'savings_goal_completed').length, 1);
  assert.equal(emitted.filter(event => event[0] === 'split_expense_settled').length, 1);
});

test('initialization is idempotent and grants analytics before configuration', () => {
  const f = fixture(); f.grant(); f.api.initializeAnalytics(); f.api.analyticsScriptReady();
  assert.equal(f.commands().filter(c => c[0] === 'config').length, 1);
  const configIndex = f.commands().findIndex(c => c[0] === 'config');
  assert.ok(f.commands().slice(0, configIndex).some(c => c[0] === 'consent' && c[1] === 'update' && c[2].analytics_storage === 'granted'));
});

test('duplicate auth successes are suppressed but a new login after logout counts', () => {
  const f = fixture(); f.grant();
  f.api.trackAuthSuccess('email', 'login', USER, false);
  f.api.trackAuthSuccess('email', 'login', USER, false);
  assert.equal(f.events().filter(e => e[1] === 'login').length, 1);
  f.api.clearAnalyticsUser(); f.api.trackAuthSuccess('email', 'login', USER, false);
  assert.equal(f.events().filter(e => e[1] === 'login').length, 2);
});

test('saved rejection wins on focus even before a storage notification', () => {
  const f = fixture(); f.api.subscribeAnalytics(() => {}); f.grant();
  f.local.set('hisbo_analytics_consent_v1', 'denied');
  f.window.dispatchEvent(new Event('focus'));
  f.api.initializeAnalytics(); f.api.trackEvent('expense_created');
  assert.equal(f.api.getAnalyticsConsent(), 'denied');
  assert.equal(f.events().length, 0);
  assert.equal(f.window['ga-disable-G-LCMEK1R5HY'], true);
});

test('revocation during tag load preserves the loaded command function on regrant', () => {
  const f = fixture(); f.api.setAnalyticsConsent('granted'); f.api.initializeAnalytics();
  f.api.trackEvent('expense_created'); f.api.setAnalyticsConsent('denied');
  const loaded = [];
  f.window.gtag = (...args) => loaded.push(args);
  f.api.analyticsScriptReady(); f.api.setAnalyticsConsent('granted'); f.api.initializeAnalytics();
  f.api.setAnalyticsUser(null); f.api.trackPageView('/');
  assert.equal(loaded.filter(c => c[0] === 'event' && c[1] === 'expense_created').length, 0);
  assert.equal(loaded.filter(c => c[0] === 'event' && c[1] === 'page_view').length, 1);
});

test('preferences exist only in Privacy Policy and never mount globally', () => {
  const fs = require('node:fs');
  assert.ok(!fs.readFileSync('src/app/layout.tsx', 'utf8').includes('AnalyticsPreferences'));
  assert.ok(fs.readFileSync('src/app/(marketing)/privacy/page.tsx', 'utf8').includes('<AnalyticsPreferences />'));
});

test('provider gates the tag and session restoration cannot overwrite newer auth', async () => {
  const effects = []; const identities = []; let resolveSession, authCallback;
  let consent = 'granted';
  const api = {
    analyticsConfigured: true, measurementId: 'G-LCMEK1R5HY',
    analyticsSnapshot: () => '', analyticsServerSnapshot: () => '', subscribeAnalytics: () => () => {},
    initializeAnalytics: () => {}, analyticsInitialized: () => true,
    analyticsIdentityReady: () => true, getAnalyticsConsent: () => consent,
    analyticsScriptReady: () => {}, setAnalyticsUser: id => identities.push(id),
    clearAnalyticsUser: () => identities.push(null), consumeGoogleAnalyticsFlow: () => {}, trackPageView: () => {},
  };
  const load = runtime({
    react: { useEffect: effect => effects.push(effect), useRef: () => ({ current: null }), useSyncExternalStore: () => `${consent}:true:true:true:normal` },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'next/script': { default: 'script' }, 'next/navigation': { usePathname: () => '/overview' },
    '@/lib/analytics': api,
    '@/lib/supabase/client': { createClient: () => ({ auth: {
      getSession: () => new Promise(resolve => { resolveSession = resolve; }),
      onAuthStateChange: callback => { authCallback = callback; return { data: { subscription: { unsubscribe() {} } } }; },
    } }) },
  });
  const Provider = load('src/components/common/AnalyticsProvider.tsx').default;
  const tree = Provider();
  assert.equal(tree.props.src, 'https://www.googletagmanager.com/gtag/js?id=G-LCMEK1R5HY');
  const cleanups = effects.map(effect => effect());
  authCallback('SIGNED_OUT', null);
  resolveSession({ data: { session: { user: { id: USER } } } });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(identities, [null]);
  cleanups.forEach(cleanup => cleanup?.());
  consent = 'denied'; assert.equal(Provider(), null);
  consent = 'unknown'; assert.equal(Provider(), null);
});
