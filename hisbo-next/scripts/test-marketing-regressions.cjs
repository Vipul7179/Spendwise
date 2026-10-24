const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const fixture = require('./helpers/marketing-fixture.cjs');
const runtime = require('./helpers/source-runtime.cjs');

const carousel = options => fixture('src/components/marketing/TestimonialCarousel.tsx', options);
const next = f => f.find(node => node.props?.['aria-label'] === 'Next feature examples').props.onClick();
const prev = f => f.find(node => node.props?.['aria-label'] === 'Previous feature examples').props.onClick();
const track = f => f.find(node => node.props?.className === 'testimonials-track');
const index = f => Number(track(f).props.style.transform.match(/calc\(-([\d]+)/)[1]);

test('reduced-motion carousel wraps repeatedly in both directions without transition events', () => {
  const f = carousel({ reduced: true }); f.render();
  for (let i = 0; i < 50; i++) { next(f); f.render(); assert.ok(index(f) >= 3 && index(f) < 9); }
  for (let i = 0; i < 50; i++) { prev(f); f.render(); assert.ok(index(f) >= 3 && index(f) < 9); }
  assert.equal(index(f), 3); assert.equal(track(f).props.style.transition, 'none');
  assert.equal([...f.timers.values()].some(timer => timer.interval), false, 'No reduced-motion autoplay');
  f.unmount(); assert.equal(f.timers.size, 0);
});
test('animated carousel bounds rapid clicks and settles even if transitionend is missing', () => {
  const f = carousel(); f.render();
  for (let step = 0; step < 20; step++) {
    const before = index(f);
    for (let burst = 0; burst < 15; burst++) next(f);
    f.render(); assert.equal(index(f), before + 1, 'Only one in-flight move');
    f.tick(600); f.render(); assert.ok(index(f) >= 3 && index(f) < 9);
  }
  f.unmount(); assert.equal(f.timers.size, 0);
});
test('autoplay advances every five seconds and hover/focus/manual pause remain independent', () => {
  const f = carousel(); f.render();
  f.tick(4999); f.render(); assert.equal(index(f), 3);
  f.tick(1); f.render(); assert.equal(index(f), 4);
  f.tick(600); f.render();
  f.find(n => n.type === 'section').props.onFocus(); f.render();
  f.find(n => n.type === 'section').props.onMouseEnter(); f.render();
  f.find(n => n.type === 'section').props.onMouseLeave(); f.render();
  f.tick(10000); f.render(); assert.equal(index(f), 4, 'Mouse leave cannot resume while focus remains');
  f.find(n => n.type === 'section').props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null }); f.render();
  f.find(n => n.type === 'button' && n.props.children === 'Pause automatic scrolling').props.onClick(); f.render();
  f.tick(10000); f.render(); assert.equal(index(f), 4);
  f.find(n => n.type === 'button' && n.props.children === 'Resume automatic scrolling').props.onClick(); f.render();
  f.tick(5000); f.render(); assert.equal(index(f), 5);
  f.unmount();
});
test('swipe and pagination work with reduced motion; content contains no endorsements', () => {
  const f = carousel({ reduced: true }); f.render();
  const viewport = () => f.find(n => n.props?.className === 'testimonials-viewport');
  viewport().props.onTouchStart({ touches: [{ clientX: 160 }] }); f.render();
  viewport().props.onTouchEnd({ changedTouches: [{ clientX: 40 }] }); f.render(); assert.equal(index(f), 4);
  f.find(n => n.props?.['aria-label'] === 'Show try guest mode').props.onClick(); f.render(); assert.equal(index(f), 8);
  const json = JSON.stringify(f.render());
  assert.match(json, /These are not customer reviews/);
  assert.doesNotMatch(json, /Aditi Sharma|Rohan Mehta|Priya Patel|out of 5 stars|Join thousands/);
  f.unmount();
});

function calculator() { const f = fixture('src/components/marketing/ExpenseCalculator.tsx'); f.render(); return f; }
const input = f => f.find(n => n.props?.id === 'calc-amount-input');
const submit = f => f.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
const message = f => f.find(n => n.props?.role === 'status')?.props.children;
const amount = (f, value) => { input(f).props.onChange({ target: { value } }); f.render(); submit(f); f.render(); };
test('calculator accepts paise, rejects malformed/sub-paise/negative/zero/over-limit amounts', () => {
  const f = calculator();
  for (const value of ['', '-1', '0', '0.001', '0.009', '1.001', '12oops', 'NaN', 'Infinity', '1000000.01']) {
    amount(f, value); assert.equal(input(f).props['aria-invalid'], true, value); assert.equal(message(f), undefined);
  }
  for (const value of ['0.01', '500.50', '1000000']) {
    amount(f, value); assert.equal(input(f).props['aria-invalid'], false); assert.ok(message(f));
  }
  assert.equal(input(f).props.step, 'any'); assert.equal(f.find(n => n.type === 'form').props.noValidate, true);
  f.unmount(); assert.equal(f.timers.size, 0);
});
test('category keyboard navigation selects a category and reset preserves demo totals', () => {
  const f = calculator();
  const key = value => { f.find(n => n.props?.role === 'combobox').props.onKeyDown({ key: value, preventDefault() {}, stopPropagation() {} }); f.render(); };
  key('ArrowDown'); key('ArrowDown'); key('Enter');
  assert.equal(f.find(n => n.props?.id === 'calc-current-category').props.children, 'Bills');
  amount(f, '0.01'); assert.match(JSON.stringify(message(f)), /Bills/);
  key('End'); key('Enter'); assert.equal(f.find(n => n.props?.id === 'calc-current-category').props.children, 'Other');
  key('Home'); key('Escape'); assert.equal(f.find(n => n.props?.role === 'combobox').props['aria-expanded'], false);
  f.find(n => n.props?.className === 'calc-ghost-btn').props.onClick(); f.render();
  assert.equal(input(f).props.value, '500');
  assert.equal(f.find(n => n.props?.id === 'calc-current-category').props.children, 'Food');
  assert.ok(f.find(n => n.type === 'GuestEntry'), 'Guest CTA retained');
  f.unmount();
});
test('replacing calculator notices cancels stale timers; unmount cancels pending expiry', () => {
  const f = calculator(); amount(f, '100'); f.tick(2000);
  f.find(n => n.props?.className === 'calc-ghost-btn').props.onClick(); f.render();
  f.tick(1000); f.render(); assert.match(JSON.stringify(message(f)), /Demo reset/);
  f.tick(1499); f.render(); assert.ok(message(f));
  f.tick(1); f.render(); assert.equal(message(f), undefined);
  amount(f, '1'); f.unmount(); assert.equal(f.timers.size, 0);
});

test('prepaint theme script restores app/legacy preferences without changing finance data', () => {
  const { THEME_INIT_SCRIPT } = runtime()('src/lib/theme.ts');
  for (const [app, legacy, expected] of [
    [{ theme: 'dark', exps: [{ amt: 9 }] }, 'light', 'dark'],
    [{ theme: 'light' }, 'dark', 'light'],
    [{ theme: 'auto' }, 'dark', null],
    [{ theme: 'auto' }, null, null],
    [null, 'dark', 'dark'],
    [null, 'light', 'light'],
    [null, 'auto', null],
    [null, null, 'light'],
  ]) {
    const storage = new Map(); if (app) storage.set('spendwise_v1', JSON.stringify(app)); if (legacy) storage.set('sw_theme', legacy);
    const before = [...storage]; let attr = 'stale';
    vm.runInNewContext(THEME_INIT_SCRIPT, {
      localStorage: { getItem: key => storage.get(key) },
      document: { documentElement: { setAttribute: (key, value) => { attr = value; }, removeAttribute: () => { attr = null; } } },
    });
    assert.equal(attr, expected); assert.deepEqual([...storage], before);
  }
  assert.doesNotThrow(() => vm.runInNewContext(THEME_INIT_SCRIPT, {
    localStorage: { getItem() { throw Error('Unavailable'); } }, document: { documentElement: { setAttribute() {}, removeAttribute() {} } },
  }));
  const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
  assert.ok(layout.indexOf('id="hisbo-theme-init"') < layout.indexOf('<body>'), 'Restore before body content paints');
});

test('existing toggle persists only theme fields and follows storage/system changes', () => {
  const storage = new Map([['spendwise_v1', JSON.stringify({ theme: 'dark', exps: [{ amt: 123 }], name: 'Fixture' })]]);
  const listeners = new Map(); let attribute = 'dark', cleanup;
  const media = { matches: false, addEventListener: (name, fn) => listeners.set('system', fn), removeEventListener: () => listeners.delete('system') };
  const win = {
    matchMedia: () => media,
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name),
    dispatchEvent: event => listeners.get(event.type)?.(),
  };
  const { default: Toggle } = runtime({
    react: { useSyncExternalStore(subscribe, snapshot) { if (!cleanup) cleanup = subscribe(() => {}); return snapshot(); } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  }, {
    Event, window: win,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    document: { documentElement: { getAttribute: () => attribute, setAttribute: (key, value) => { attribute = value; }, removeAttribute: () => { attribute = null; } } },
  })('src/components/marketing/ThemeToggle.tsx');
  Toggle({}).props.onClick();
  assert.equal(attribute, 'light'); assert.equal(storage.get('sw_theme'), 'light');
  assert.deepEqual(JSON.parse(storage.get('spendwise_v1')), { theme: 'light', exps: [{ amt: 123 }], name: 'Fixture' });
  assert.equal(Toggle({}).props['aria-checked'], false);
  storage.set('spendwise_v1', JSON.stringify({ theme: 'auto' }));
  listeners.get('storage')({ key: 'spendwise_v1' }); assert.equal(attribute, null);
  media.matches = true; listeners.get('system')(); assert.equal(Toggle({}).props['aria-checked'], true);
  cleanup(); assert.equal(listeners.size, 0);

  // First-time visitor with empty storage defaults to Light Mode regardless of system dark preference
  const emptyStorage = new Map(); let firstAttr = null; cleanup = null;
  const darkSystem = { matches: true, addEventListener: () => {}, removeEventListener: () => {} };
  const { default: FirstToggle } = runtime({
    react: { useSyncExternalStore(subscribe, snapshot) { if (!cleanup) cleanup = subscribe(() => {}); return snapshot(); } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  }, {
    Event, window: { matchMedia: () => darkSystem, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {} },
    localStorage: { getItem: key => emptyStorage.get(key), setItem: (key, value) => emptyStorage.set(key, value) },
    document: { documentElement: { getAttribute: () => firstAttr, setAttribute: (key, value) => { firstAttr = value; }, removeAttribute: () => { firstAttr = null; } } },
  })('src/components/marketing/ThemeToggle.tsx');
  assert.equal(FirstToggle({}).props['aria-checked'], false, 'First-time visitor must default to light theme');
  cleanup();
});

test('preview keeps original logo/daily total and complete circular category legend', () => {
  const f = fixture('src/components/marketing/HeroDeviceMockup.tsx', {
    reduced: true, globals: { performance: { now: () => 0 }, requestAnimationFrame() { assert.fail('No counter motion with reduced motion'); } },
  }); f.render();
  const rows = f.nodes().filter(n => n.props?.className === 'phone-legend-row');
  assert.equal(rows.length, 5);
  assert.equal(rows.map(n => n.props.children.find(child => child.type === 'b').props.children).map(parseFloat).reduce((a, b) => a+b, 0), 100);
  assert.ok(JSON.stringify(f.render()).includes('₹1,200'));
  const css = fs.readFileSync('src/app/(marketing)/landing-reference.css', 'utf8');
  assert.match(css, /\.phone-legend-row \.phone-cat-dot/); assert.match(css, /border-radius: 50% !important/);
  assert.match(css, /--testimonials-visible: 3/); assert.match(css, /--testimonials-visible: 2/); assert.match(css, /--testimonials-visible: 1/);
  f.unmount();
});

function dialogFixture() {
  const listeners = new Map(); let document;
  class Element {
    constructor(button = false) { this.children = []; this.parentElement = null; this.inert = false; this.button = button; this.style = {}; }
    append(child) { child.parentElement = this; this.children.push(child); return child; }
    contains(other) { return other === this || this.children.some(child => child.contains(other)); }
    get isConnected() { return this === document.body || !!this.parentElement?.isConnected; }
    closest() { return this.inert ? this : this.parentElement?.closest() || null; }
    querySelectorAll() { return this.children.flatMap(child => [...(child.button ? [child] : []), ...child.querySelectorAll()]); }
    getClientRects() { return [{}]; }
    focus() { document.activeElement = this; for (const fn of listeners.get('focusin') || []) fn(); }
  }
  document = {
    body: new Element(), activeElement: null,
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
  };
  document.body.style.overflow = 'auto';
  const page = document.body.append(new Element());
  const trigger = page.append(new Element(true)); trigger.focus();
  const overlay = document.body.append(new Element());
  const dialog = overlay.append(new Element());
  const first = dialog.append(new Element(true)), last = dialog.append(new Element(true));
  const { manageDialogFocus } = runtime({}, { document, HTMLElement: Element })('src/lib/dialog-focus.ts');
  return { document, Element, page, trigger, dialog, first, last, manageDialogFocus,
    key(key, shiftKey = false) {
      let prevented = false;
      const event = { key, shiftKey, preventDefault() { prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
      for (const fn of listeners.get('keydown') || []) { fn(event); if (event.stopped) break; }
      return prevented;
    },
    listenerCount: () => [...listeners.values()].reduce((sum, entries) => sum + entries.size, 0),
  };
}
test('dialog moves/traps/restores focus, blocks background and handles Escape', () => {
  const f = dialogFixture(); let closed = 0;
  const cleanup = f.manageDialogFocus(f.dialog, () => closed++);
  assert.equal(f.document.activeElement, f.first); assert.equal(f.page.inert, true);
  f.last.focus(); assert.equal(f.key('Tab'), true); assert.equal(f.document.activeElement, f.first);
  assert.equal(f.key('Tab', true), true); assert.equal(f.document.activeElement, f.last);
  f.trigger.focus(); assert.equal(f.document.activeElement, f.first, 'External focus is redirected');
  assert.equal(f.key('Escape'), true); assert.equal(closed, 1);
  cleanup(); assert.equal(f.page.inert, false); assert.equal(f.document.body.style.overflow, 'auto');
  assert.equal(f.document.activeElement, f.trigger); assert.equal(f.listenerCount(), 0);
});
test('nested guest dialog keeps parent isolated and restores scroll for either unmount order', () => {
  for (const parentFirst of [false, true]) {
    const f = dialogFixture(); let parentClosed = 0, childClosed = 0;
    const parentCleanup = f.manageDialogFocus(f.dialog, () => parentClosed++);
    const child = f.dialog.append(new f.Element()), childButton = child.append(new f.Element(true));
    const childCleanup = f.manageDialogFocus(child, () => childClosed++);
    assert.equal(f.document.activeElement, childButton); assert.equal(f.first.inert, true);
    f.key('Escape'); assert.equal(childClosed, 1); assert.equal(parentClosed, 0);
    if (parentFirst) { parentCleanup(); childCleanup(); }
    else { childCleanup(); assert.equal(f.page.inert, true); assert.equal(f.first.inert, false); parentCleanup(); }
    assert.equal(f.document.body.style.overflow, 'auto'); assert.equal(f.page.inert, false);
    assert.equal(f.first.inert, false); assert.equal(f.listenerCount(), 0);
  }
});
