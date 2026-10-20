const { test } = require('node:test');
const assert = require('node:assert/strict');
const runtime = require('./helpers/source-runtime.cjs');
const { saveBannerWithImage } = runtime()('src/lib/banners.ts');
const previous = { id: 'banner', title: null, description: null, image_url: 'https://fixture.test/old.webp', image_path: 'owner/old.webp', link_url: null, sort_order: 0, is_active: true };
const { id, ...payload } = previous;
const upload = { path: 'owner/new.webp', file: { type: 'image/webp' } };

function fixture(options = {}) {
  const events = [];
  let stored = { ...previous };
  return {
    events,
    client: {
      storage: { from: () => ({
        upload: async path => { events.push('upload:' + path); return { error: options.uploadFailure ? Error('Upload failed') : null }; },
        getPublicUrl: path => ({ data: { publicUrl: 'https://fixture.test/' + path } }),
        remove: async paths => { events.push('remove:' + paths[0]); return { error: options.removeFailure ? Error('Remove failed') : null }; },
      }) },
      from() {
        let next, lookup;
        return {
          update(value) { next = value; return this; }, insert(value) { next = value; return this; },
          eq(key, value) { if (key === 'image_path') lookup = value; return this; }, select() { return this; },
          single: async () => {
            events.push('db');
            if (!options.saveFailure || options.commitDespiteError) stored = { id: 'banner', ...next };
            return { data: options.saveFailure ? null : stored, error: options.saveFailure ? Error('DB failed') : null };
          },
          limit: async () => {
            events.push('references:' + lookup);
            return { data: options.readFailure ? null : (stored.image_path === lookup || options.sharedReference ? [{ id: 'reference' }] : []), error: options.readFailure ? Error('Read failed') : null };
          },
        };
      },
    },
  };
}

test('replacement commits row before deleting its old storage object', async () => {
  const f = fixture();
  const result = await saveBannerWithImage(f.client, payload, previous, upload);
  assert.equal(result.banner.image_path, upload.path);
  assert.equal(result.cleanupWarning, false);
  assert.deepEqual(f.events, ['upload:owner/new.webp', 'db', 'references:owner/old.webp', 'remove:owner/old.webp']);
});
test('failed DB save removes only a confirmed unreferenced new upload', async () => {
  const f = fixture({ saveFailure: true });
  await assert.rejects(saveBannerWithImage(f.client, payload, previous, upload), /DB failed/);
  assert.deepEqual(f.events, ['upload:owner/new.webp', 'db', 'references:owner/new.webp', 'remove:owner/new.webp']);
});
test('lost DB response or failed read-back never deletes a potentially referenced upload', async () => {
  for (const options of [{ saveFailure: true, commitDespiteError: true }, { saveFailure: true, readFailure: true }]) {
    const f = fixture(options);
    await assert.rejects(saveBannerWithImage(f.client, payload, previous, upload), /DB failed/);
    assert.ok(!f.events.some(event => event.startsWith('remove:')));
  }
});
test('upload failure performs no DB update or deletion', async () => {
  const f = fixture({ uploadFailure: true });
  await assert.rejects(saveBannerWithImage(f.client, payload, previous, upload), /Upload failed/);
  assert.deepEqual(f.events, ['upload:owner/new.webp']);
});
test('cleanup failure keeps successful save and reports a warning', async () => {
  for (const options of [{ removeFailure: true }, { readFailure: true }]) {
    const f = fixture(options);
    const result = await saveBannerWithImage(f.client, payload, previous, upload);
    assert.equal(result.banner.image_path, upload.path);
    assert.equal(result.cleanupWarning, true);
  }
});
test('external replacement is committed before cleanup and shared old objects are retained', async () => {
  const f = fixture();
  await saveBannerWithImage(f.client, { ...payload, image_url: 'https://fixture.test/external.png', image_path: null }, previous);
  assert.equal(f.events[0], 'db');
  assert.equal(f.events.at(-1), 'remove:owner/old.webp');
  const shared = fixture({ sharedReference: true });
  await saveBannerWithImage(shared.client, payload, previous, upload);
  assert.ok(!shared.events.some(event => event.startsWith('remove:')));
});
test('metadata-only edit and initial create do not delete existing images', async () => {
  const edit = fixture();
  await saveBannerWithImage(edit.client, { ...payload, title: 'Updated' }, previous);
  assert.deepEqual(edit.events, ['db']);
  const create = fixture();
  await saveBannerWithImage(create.client, { ...payload, image_path: null }, null);
  assert.deepEqual(create.events, ['db']);
});
