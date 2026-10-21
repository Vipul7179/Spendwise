const { test } = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('./helpers/source-runtime.cjs');
const { observeImage } = runtime()('src/lib/image-loading.ts');

function fixture({ cached = false, decode = () => Promise.resolve() } = {}) {
  const listeners = new Map(), attributes = new Map();
  const image = {
    src: 'https://example.test/photo.webp', currentSrc: '', srcset: 'unchanged', sizes: '100vw',
    complete: cached, naturalWidth: cached ? 800 : 0, decode,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
  };
  const frame = { dataset: {}, setAttribute: (name, value) => attributes.set('frame:' + name, value) };
  return { image, frame, attributes, listeners, emit: name => listeners.get(name)?.() };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('shimmer stays until loading and decoding have both completed', async () => {
  let finish;
  const f = fixture({ decode: () => new Promise(resolve => { finish = resolve; }) });
  observeImage(f.image, f.frame);
  assert.equal(f.frame.dataset.imageState, 'loading');
  f.image.naturalWidth = 800; f.emit('load');
  assert.equal(f.frame.dataset.imageState, 'loading');
  finish(); await flush();
  assert.equal(f.frame.dataset.imageState, 'ready');
  assert.equal(f.attributes.get('frame:aria-busy'), 'false');
});

test('already loaded cached images skip the fade transition without a second request', async () => {
  const f = fixture({ cached: true });
  observeImage(f.image, f.frame); await flush();
  assert.equal(f.frame.dataset.imageState, 'ready');
  assert.equal(f.frame.dataset.imageCached, 'true');
  assert.equal(f.image.src, 'https://example.test/photo.webp');
  assert.equal(f.image.srcset, 'unchanged');
});

test('failed image and decode errors terminate shimmer and hide broken-image presentation', async () => {
  for (const decodeFailure of [false, true]) {
    const f = fixture({ decode: () => Promise.reject(Error('Cannot decode')) });
    observeImage(f.image, f.frame);
    if (decodeFailure) { f.image.naturalWidth = 800; f.emit('load'); await flush(); }
    else f.emit('error');
    assert.equal(f.frame.dataset.imageState, 'error');
    assert.equal(f.attributes.get('aria-hidden'), 'true');
    assert.equal(f.attributes.get('frame:aria-busy'), 'false');
  }
});

test('a failed cached response starts in the fallback state', () => {
  const f = fixture(); f.image.complete = true;
  observeImage(f.image, f.frame);
  assert.equal(f.frame.dataset.imageState, 'error');
});

test('cleanup cancels stale decodes and detaches every listener', async () => {
  let finish;
  const f = fixture({ cached: true, decode: () => new Promise(resolve => { finish = resolve; }) });
  const cleanup = observeImage(f.image, f.frame);
  cleanup(); finish(); await flush();
  assert.equal(f.frame.dataset.imageState, 'loading');
  assert.equal(f.listeners.size, 0);
});

test('an error wins over an earlier pending decode', async () => {
  let finish;
  const f = fixture({ cached: true, decode: () => new Promise(resolve => { finish = resolve; }) });
  observeImage(f.image, f.frame); f.emit('error'); finish(); await flush();
  assert.equal(f.frame.dataset.imageState, 'error');
});

test('duplicate load notifications do not decode twice', async () => {
  let decodes = 0;
  const f = fixture({ cached: true, decode: async () => { decodes++; } });
  observeImage(f.image, f.frame); f.emit('load'); await flush();
  assert.equal(decodes, 1);
});

test('explicit retry preserves image URL, responsive sources and sizes', async () => {
  const f = fixture(); observeImage(f.image, f.frame); f.emit('error');
  f.emit('hisbo:image-retry');
  assert.equal(f.frame.dataset.imageState, 'loading');
  assert.equal(f.image.src, 'https://example.test/photo.webp');
  assert.equal(f.image.srcset, 'unchanged'); assert.equal(f.image.sizes, '100vw');
  f.image.naturalWidth = 800; f.emit('load'); await flush();
  assert.equal(f.frame.dataset.imageState, 'ready');
});

test('image component retains the native/optimized strategy, source and loading priority', () => {
  const load = runtime({
    react: { useRef: () => ({ current: null }), useLayoutEffect() {} },
    'next/image': { default: 'optimized-image' },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  });
  const Image = load('src/components/common/SkeletonImage.tsx').default;
  for (const native of [true, false]) {
    const tree = Image({ native, src: '/asset.webp', alt: 'Asset', width: 400, height: 200, loading: 'lazy', sizes: '100vw' });
    const image = tree.props.children[0];
    assert.equal(image.type, native ? 'img' : 'optimized-image');
    assert.equal(image.props.src, '/asset.webp'); assert.equal(image.props.loading, 'lazy');
    assert.equal(image.props.sizes, '100vw');
    assert.equal(tree.props['data-image-state'], 'loading');
  }
});
