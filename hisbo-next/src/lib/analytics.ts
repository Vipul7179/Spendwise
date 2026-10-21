// All payloads pass through this allowlist. Never pass application records here.
export const ANALYTICS_EVENTS = [
  'page_view', 'feature_opened', 'dashboard_viewed', 'onboarding_started', 'onboarding_completed',
  'guest_mode_started', 'guest_session_started', 'guest_feature_used', 'guest_signup_started', 'guest_signup_completed',
  'sign_up', 'login', 'logout', 'login_failed',
  'expense_created', 'expense_updated', 'expense_deleted', 'budget_created', 'budget_updated', 'budget_deleted',
  'savings_goal_created', 'savings_goal_updated', 'savings_goal_completed', 'savings_goal_deleted',
  'group_created', 'group_joined', 'group_member_invited', 'group_deleted',
  'split_expense_created', 'split_expense_settled', 'split_expense_reopened', 'split_expense_deleted',
  'recurring_expense_created', 'recurring_expense_deleted', 'notification_settings_updated',
  'theme_changed', 'privacy_changed', 'chart_changed', 'alerts_updated', 'sync_completed',
] as const;
export type AnalyticsEvent = typeof ANALYTICS_EVENTS[number];
export type UserMode = 'anonymous' | 'guest' | 'authenticated';
export type Feature = 'overview' | 'expenses' | 'budgets' | 'savings' | 'groups' | 'automate' | 'alerts' | 'blog' | 'account' | 'settings';
export type ActionSource = 'navigation' | 'email_form' | 'google_oauth' | 'guest_entry' | 'quick_add' | 'overview' | 'budgets' | 'savings' | 'groups' | 'automate' | 'sms_import' | 'csv_import' | 'alerts' | 'account' | 'settings' | 'onboarding';
export interface AnalyticsProperties {
  user_mode?: UserMode;
  feature_name?: Feature;
  action_source?: ActionSource;
  success?: boolean;
  method?: 'email' | 'google';
}
type Consent = 'unknown' | 'granted' | 'denied';
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag; }
}
const CONSENT_KEY = 'hisbo_analytics_consent_v1';
const OAUTH_KEY = 'hisbo_analytics_oauth_v1';
const CONVERSION_KEY = 'hisbo_analytics_conversion_v1';
const GUEST_SESSION_KEY = 'hisbo_analytics_guest_session_v1';
const SIGNUP_KEY = 'hisbo_analytics_signup_started_v1';
const CREATED_KEY = 'hisbo_analytics_signup_created_v1';
const CHANGE = 'hisbo:analytics';
const ORIGIN = 'https://www.hisbo.in';
export const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
// This gate certifies that Enhanced Measurement and automatic user-data
// collection have been disabled in the GA4 stream. See docs/analytics.md.
export const analyticsConfigured = /^G-[A-Z0-9]+$/.test(measurementId)
  && process.env.NEXT_PUBLIC_GA_MANUAL_TRACKING_READY === 'true';
let initialized = false;
let scriptReady = false;
let identityReady = false;
let userId: string | null = null;
let mode: UserMode = 'anonymous';
let lastPage: string | null = null;
let consentOverride: Consent | null = null;
let queue: Array<{ name: AnalyticsEvent; params: Record<string, unknown>; userId: string | null }> = [];

function browser() { return typeof window !== 'undefined'; }
function read(key: string, session = false): string | null {
  try { return (session ? window.sessionStorage : window.localStorage).getItem(key); } catch { return null; }
}
function write(key: string, value: string | null, session = false) {
  try {
    const storage = session ? window.sessionStorage : window.localStorage;
    if (value === null) storage.removeItem(key); else storage.setItem(key, value);
  } catch { /* Analytics must never interfere with the app. */ }
}
function notify() { if (browser() && window.dispatchEvent) window.dispatchEvent(new Event(CHANGE)); }
export function browserOptOut(): boolean {
  if (!browser()) return false;
  const nav = window.navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav?.globalPrivacyControl === true || nav?.doNotTrack === '1';
}
export function getAnalyticsConsent(): Consent {
  if (!browser()) return 'unknown';
  if (browserOptOut()) return 'denied';
  const saved = consentOverride || read(CONSENT_KEY);
  return saved === 'granted' || saved === 'denied' ? saved : 'unknown';
}
function permitted() { return browser() && analyticsConfigured && getAnalyticsConsent() === 'granted'; }
export function analyticsFeaturesEnabled() { return permitted(); }
function disabled(value: boolean) {
  (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = value;
}
function command(...args: unknown[]) {
  try { window.gtag?.(...args); } catch { /* Blockers and tag failures are non-fatal. */ }
}
export function subscribeAnalytics(callback: () => void) {
  const changed = (event: Event) => {
    if (event.type === 'storage') consentOverride = null;
    if (getAnalyticsConsent() !== 'granted') stopAnalytics();
    callback();
  };
  window.addEventListener(CHANGE, changed);
  window.addEventListener('storage', changed);
  window.addEventListener('focus', changed);
  return () => {
    window.removeEventListener(CHANGE, changed);
    window.removeEventListener('storage', changed);
    window.removeEventListener('focus', changed);
  };
}
export function analyticsSnapshot() {
  return `${getAnalyticsConsent()}:${initialized}:${scriptReady}:${identityReady}:${browserOptOut() ? 'optout' : 'normal'}`;
}
export function analyticsServerSnapshot() { return 'unknown:false:false:false:normal'; }
export function analyticsIdentityReady() { return identityReady; }
export function analyticsInitialized() { return initialized; }
export function safePage(path: string): { path: string; title: string; feature?: Feature } {
  const pathname = path.split(/[?#]/, 1)[0];
  const routes: Record<string, { title: string; feature?: Feature }> = {
    '/': { title: 'Hisbo' }, '/login': { title: 'Log in' }, '/signup': { title: 'Create account' },
    '/forgot-password': { title: 'Account recovery' }, '/reset-password': { title: 'Account recovery' },
    '/privacy': { title: 'Terms and Privacy Policy' }, '/terms': { title: 'Terms and Privacy Policy' },
    '/overview': { title: 'Overview', feature: 'overview' }, '/budgets': { title: 'Budgets', feature: 'budgets' },
    '/savings': { title: 'Savings', feature: 'savings' }, '/groups': { title: 'Groups', feature: 'groups' },
    '/automate': { title: 'Automate', feature: 'automate' }, '/alerts': { title: 'Alerts', feature: 'alerts' },
    '/blog': { title: 'Blog', feature: 'blog' },
  };
  if (routes[pathname]) return { path: pathname, ...routes[pathname] };
  // Do not leak arbitrary slugs, tokens, user-entered paths or admin URLs.
  if (/^\/blog\/[^/]+$/.test(pathname)) return { path: '/blog/article', title: 'Blog article', feature: 'blog' };
  return { path: '/other', title: 'Hisbo' };
}
function context() {
  const page = safePage(window.location.pathname);
  return { page_location: ORIGIN + page.path, page_path: page.path, page_title: page.title, page_referrer: '' };
}
export function initializeAnalytics() {
  if (!permitted()) return;
  disabled(false);
  if (!initialized) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer!.push(arguments); };
    command('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    command('js', new Date());
    // Keep changing identity/page fields at global scope: a fixed config-level
    // value would override later `set` calls (including logout's null user ID).
    command('set', { user_id: userId, ...context() });
    command('config', measurementId, {
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      ...(process.env.NEXT_PUBLIC_GA_DEBUG === 'true' ? { debug_mode: true } : {}),
    });
    initialized = true;
  }
  command('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  notify();
}
export function analyticsScriptReady() {
  scriptReady = true;
  if (permitted()) {
    for (const event of queue) send(event);
    queue = [];
    command('set', { user_id: userId, ...context() });
  }
  notify();
}
function send(event: typeof queue[number]) {
  if (!permitted()) return;
  command('set', { user_id: event.userId, page_location: event.params.page_location, page_title: event.params.page_title, page_referrer: '' });
  command('event', event.name, event.params);
}
function enqueue(name: AnalyticsEvent, params: Record<string, unknown>) {
  const event = { name, params: { ...context(), ...params, send_to: measurementId }, userId };
  if (scriptReady) send(event);
  else { if (queue.length >= 100) queue.shift(); queue.push(event); }
}
export function trackEvent(name: AnalyticsEvent, properties: AnalyticsProperties = {}) {
  if (!permitted() || !(ANALYTICS_EVENTS as readonly string[]).includes(name)) return;
  const params: Record<string, unknown> = { user_mode: mode };
  // Runtime filtering protects against unsafe values from JS callers and casts.
  const allowed = {
    user_mode: ['anonymous', 'guest', 'authenticated'], method: ['email', 'google'],
    feature_name: ['overview', 'expenses', 'budgets', 'savings', 'groups', 'automate', 'alerts', 'blog', 'account', 'settings'],
    action_source: ['navigation', 'email_form', 'google_oauth', 'guest_entry', 'quick_add', 'overview', 'budgets', 'savings', 'groups', 'automate', 'sms_import', 'csv_import', 'alerts', 'account', 'settings', 'onboarding'],
  };
  for (const key of Object.keys(allowed) as Array<keyof typeof allowed>) {
    const value = properties[key];
    if (typeof value === 'string' && allowed[key].includes(value)) params[key] = value;
  }
  if (typeof properties.success === 'boolean') params.success = properties.success;
  enqueue(name, params);
}
export function trackFeatureEvent(name: AnalyticsEvent, feature: Feature, source?: ActionSource) {
  if (!permitted()) return;
  const route = safePage(window.location.pathname).path.slice(1);
  const action_source = source || (['overview', 'budgets', 'savings', 'groups', 'automate', 'alerts'].includes(route) ? route as ActionSource : 'settings');
  trackEvent(name, { feature_name: feature, action_source, success: true });
  if (mode === 'guest') trackEvent('guest_feature_used', { feature_name: feature, action_source, success: true });
}
export function trackPageView(path: string) {
  if (!permitted() || !identityReady) return;
  // Deduplicate effect replays and identity changes, but count real Back/Forward.
  const page = safePage(path);
  const navigationKey = path.split(/[?#]/, 1)[0];
  if (lastPage === navigationKey) return;
  lastPage = navigationKey;
  enqueue('page_view', { page_location: ORIGIN + page.path, page_path: page.path, page_title: page.title, page_referrer: '', user_mode: mode });
  if (page.feature) trackEvent('feature_opened', { feature_name: page.feature, action_source: 'navigation' });
  if (page.path === '/overview' && mode !== 'anonymous') trackEvent('dashboard_viewed', { feature_name: 'overview', action_source: 'navigation' });
  if (page.path === '/signup' && mode === 'guest' && !read(SIGNUP_KEY, true)) {
    write(SIGNUP_KEY, '1', true);
    trackEvent('guest_signup_started', { action_source: 'navigation', success: true });
  }
}
export function setAnalyticsUser(id: string | null) {
  userId = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
  mode = userId ? 'authenticated' : read('sw_guest') === '1' ? 'guest' : 'anonymous';
  identityReady = true;
  if (permitted() && scriptReady) command('set', { user_id: userId });
  if (mode === 'guest') guestSession();
  notify();
}
export function clearAnalyticsUser() {
  userId = null; mode = 'anonymous'; identityReady = true;
  for (const key of [GUEST_SESSION_KEY, SIGNUP_KEY, 'hisbo_analytics_onboarding_v1']) write(key, null, true);
  if (permitted() && scriptReady) command('set', { user_id: null });
  notify();
}
function guestSession() {
  if (!permitted() || read(GUEST_SESSION_KEY, true)) return;
  write(GUEST_SESSION_KEY, '1', true);
  trackEvent('guest_session_started', { action_source: 'guest_entry', success: true });
}
export function trackGuestModeStarted() {
  userId = null; mode = 'guest'; identityReady = true;
  if (permitted() && scriptReady) command('set', { user_id: null });
  trackEvent('guest_mode_started', { action_source: 'guest_entry', success: true });
  guestSession();
  notify();
}
export function beginGoogleAnalyticsFlow() {
  if (!permitted()) return;
  write(OAUTH_KEY, JSON.stringify({ started: Date.now(), guest: read('sw_guest') === '1' }), true);
}
function storedObject(key: string, session = false): Record<string, unknown> | null {
  try { const value = JSON.parse(read(key, session) || 'null'); return value && typeof value === 'object' ? value : null; } catch { return null; }
}
export function trackAuthFailure(method: 'email' | 'google') {
  if (method === 'google') write(OAUTH_KEY, null, true);
  trackEvent('login_failed', { method, action_source: method === 'google' ? 'google_oauth' : 'email_form', success: false });
}
export function trackAuthSuccess(method: 'email' | 'google', event: 'login' | 'sign_up', id: string, wasGuest: boolean) {
  setAnalyticsUser(id);
  trackEvent(event, { method, action_source: method === 'google' ? 'google_oauth' : 'email_form', success: true });
  const conversion = storedObject(CONVERSION_KEY);
  if ((event === 'sign_up' && wasGuest) || (conversion?.id === id && typeof conversion.started === 'number' && Date.now() - conversion.started < 86400000)) {
    trackEvent('guest_signup_completed', { method, success: true });
    write(CONVERSION_KEY, null); write(SIGNUP_KEY, null, true);
  }
}
export function trackEmailSignupCreated(id: string, hasSession: boolean, wasGuest: boolean, createdAt: string, attemptStarted: number) {
  if (!permitted() || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return;
  const created = Date.parse(createdAt);
  // Resubmitting for an existing unconfirmed account can return a real user.
  // Require evidence of creation during this request, not just a user object.
  if (!(created >= attemptStarted && created <= Date.now())) return;
  const previous = storedObject(CREATED_KEY);
  if (previous?.id === id && typeof previous.started === 'number' && Date.now() - previous.started < 86400000) return;
  write(CREATED_KEY, JSON.stringify({ id, started: Date.now() }));
  if (hasSession) { trackAuthSuccess('email', 'sign_up', id, wasGuest); return; }
  trackEvent('sign_up', { method: 'email', action_source: 'email_form', success: true });
  if (permitted() && wasGuest) write(CONVERSION_KEY, JSON.stringify({ id, started: Date.now() }));
}
export function consumeGoogleAnalyticsFlow(user: { id: string; created_at?: string } | null, pathname: string) {
  const pending = storedObject(OAUTH_KEY, true);
  if (!pending || typeof pending.started !== 'number') return;
  if (Date.now() - pending.started > 1800000) { write(OAUTH_KEY, null, true); return; }
  if (pathname === '/login' && new URLSearchParams(window.location.search).has('error')) { trackAuthFailure('google'); return; }
  if (!user || ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname)) return;
  write(OAUTH_KEY, null, true);
  // Conservative: only count OAuth signup when Supabase reports that the
  // account was created during this explicitly initiated OAuth flow.
  const created = Date.parse(user.created_at || '');
  trackAuthSuccess('google', created >= pending.started && created <= Date.now() ? 'sign_up' : 'login', user.id, pending.guest === true);
}
function stopAnalytics() {
  if (!browser()) return;
  disabled(true); queue = []; lastPage = null; userId = null; mode = 'anonymous'; identityReady = false;
  if (initialized) {
    command('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    command('set', { user_id: null });
    if (!scriptReady) {
      if (window.dataLayer) window.dataLayer.length = 0;
      initialized = false;
    }
  }
  for (const key of [OAUTH_KEY, GUEST_SESSION_KEY, SIGNUP_KEY, 'hisbo_analytics_onboarding_v1']) write(key, null, true);
  write(CONVERSION_KEY, null);
  write(CREATED_KEY, null);
  // Clear first-party GA cookies for this host and its parent domains.
  try {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      const parts = window.location.hostname.split('.');
      document.cookie = `${name}=; Max-Age=0; Path=/`;
      for (let index = 0; index < parts.length - 1; index++) document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${parts.slice(index).join('.')}`;
    }
  } catch { /* Browser cookie policies may forbid access. */ }
}
export function setAnalyticsConsent(value: 'granted' | 'denied') {
  consentOverride = value;
  write(CONSENT_KEY, value);
  if (value === 'denied' || browserOptOut()) stopAnalytics();
  notify();
}

export function trackOnboardingStarted() {
  if (!analyticsFeaturesEnabled() || read('hisbo_analytics_onboarding_v1', true)) return;
  write('hisbo_analytics_onboarding_v1', '1', true);
  trackEvent('onboarding_started', { feature_name: 'account', action_source: 'onboarding' });
}
