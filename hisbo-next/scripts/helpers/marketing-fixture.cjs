const runtime = require('./source-runtime.cjs');
const walk = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat().flatMap(walk)] : [];

module.exports = function fixture(file, { reduced = false, globals = {}, mocks = {} } = {}) {
  const slots = [], timers = new Map();
  let cursor = 0, effects = [], now = 0, nextId = 0;
  const media = { matches: reduced, addEventListener() {}, removeEventListener() {} };
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useCallback(fn, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { deps, fn };
      return slots[index].fn;
    },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) effects.push(() => {
        slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: fn() };
      });
    },
    useSyncExternalStore(subscribe, snapshot) { return snapshot(); },
  };
  const jsx = (type, props) => ({ type, props });
  const schedule = (fn, delay, interval = false) => { const id = ++nextId; timers.set(id, { fn, at: now + delay, delay, interval }); return id; };
  const load = runtime({ react, 'react/jsx-runtime': { jsx, jsxs: jsx }, '@/components/auth/GuestEntryButton': { default: 'GuestEntry' }, ...mocks }, {
    window: { matchMedia: () => media, addEventListener() {}, removeEventListener() {} },
    document: { addEventListener() {}, removeEventListener() {} },
    setTimeout: (fn, delay) => schedule(fn, delay), clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, true), clearInterval: id => timers.delete(id), ...globals,
  });
  const Component = load(file).default;
  let tree;
  function render() { cursor = 0; tree = Component({}); const pending = effects; effects = []; pending.forEach(fn => fn()); return tree; }
  return {
    render, media, timers,
    nodes: () => walk(tree),
    find: predicate => walk(tree).find(predicate),
    tick(ms) {
      const until = now + ms;
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [id, timer] = next; now = timer.at;
        if (timer.interval) timer.at += timer.delay; else timers.delete(id);
        timer.fn();
      }
      now = until;
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
};
