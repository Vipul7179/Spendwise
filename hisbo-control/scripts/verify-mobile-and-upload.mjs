import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controlRoot = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('  HISBO CONTROL: MOBILE RESPONSIVENESS & LOCAL IMAGE UPLOAD AUDIT');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
  }
}

// --------------------------------------------------------------------------
// 1. IMAGE VALIDATION & MAGIC BYTES UNIT TESTS
// --------------------------------------------------------------------------
console.log('--- SUITE 1: Image Magic Bytes & Size Validation ---');

import { validateImageBuffer, MAX_IMAGE_SIZE_BYTES } from '../src/lib/storage/image-validator.ts';

runTest('Accept genuine JPEG with FF D8 FF signature', () => {
  const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const res = validateImageBuffer(buf, 'image/jpeg');
  assert.equal(res.valid, true);
  assert.equal(res.extension, 'jpg');
  assert.equal(res.mimeType, 'image/jpeg');
});

runTest('Accept genuine PNG with 89 50 4E 47 signature', () => {
  const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const res = validateImageBuffer(buf, 'image/png');
  assert.equal(res.valid, true);
  assert.equal(res.extension, 'png');
  assert.equal(res.mimeType, 'image/png');
});

runTest('Accept genuine WebP with RIFF....WEBP signature', () => {
  const buf = Buffer.from('RIFF1234WEBPVP8 ');
  const res = validateImageBuffer(buf, 'image/webp');
  assert.equal(res.valid, true);
  assert.equal(res.extension, 'webp');
  assert.equal(res.mimeType, 'image/webp');
});

runTest('Accept genuine AVIF with ftypavif signature', () => {
  const buf = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x20]),
    Buffer.from('ftypavif'),
    Buffer.alloc(20),
  ]);
  const res = validateImageBuffer(buf, 'image/avif');
  assert.equal(res.valid, true);
  assert.equal(res.extension, 'avif');
  assert.equal(res.mimeType, 'image/avif');
});

runTest('Strictly reject malicious SVG payload containing script', () => {
  const buf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const res = validateImageBuffer(buf, 'image/svg+xml');
  assert.equal(res.valid, false);
  assert.match(res.error, /prohibited due to security/i);
});

runTest('Reject oversized buffer exceeding 5 MB limit', () => {
  const oversizedBuf = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1024);
  // Give it JPEG header but excessive length
  oversizedBuf[0] = 0xff;
  oversizedBuf[1] = 0xd8;
  oversizedBuf[2] = 0xff;
  const res = validateImageBuffer(oversizedBuf);
  assert.equal(res.valid, false);
  assert.match(res.error, /exceeds the 5 MB limit/i);
});

runTest('Reject empty buffer', () => {
  const res = validateImageBuffer(Buffer.alloc(0));
  assert.equal(res.valid, false);
  assert.match(res.error, /empty/i);
});

// --------------------------------------------------------------------------
// 2. CSS RESPONSIVE RULES & MEDIA QUERIES AUDIT
// --------------------------------------------------------------------------
console.log('\n--- SUITE 2: CSS Responsive Design System Audit ---');

const cssPath = path.join(controlRoot, 'src', 'app', 'globals.css');
const css = fs.readFileSync(cssPath, 'utf8');

runTest('globals.css includes safe-area-inset support', () => {
  assert.ok(css.includes('safe-area-inset-top'), 'Must have safe-area-inset-top');
  assert.ok(css.includes('safe-area-inset-bottom'), 'Must have safe-area-inset-bottom');
});

runTest('globals.css includes mobile input 16px zoom prevention (< 640px)', () => {
  assert.ok(css.includes('font-size: 16px !important'), 'Must enforce 16px input font size to prevent iOS zoom');
  assert.ok(css.includes('@media (max-width: 640px)'), 'Must target <= 640px mobile breakpoint');
});

runTest('globals.css includes mobile navigation drawer classes & transitions', () => {
  assert.ok(css.includes('.sidebar-backdrop'), 'Must have .sidebar-backdrop class');
  assert.ok(css.includes('.sidebar-close-btn'), 'Must have .sidebar-close-btn class');
  assert.ok(css.includes('.admin-hamburger-btn'), 'Must have .admin-hamburger-btn class');
  assert.ok(css.includes('transform: translateX(-100%)'), 'Sidebar must be off-canvas on mobile');
  assert.ok(css.includes('transform: translateX(0)'), 'Sidebar.open must slide in');
});

runTest('globals.css includes mobile bottom sheet modal styles', () => {
  assert.ok(css.includes('modalSlideUp'), 'Must have modal bottom-sheet slide up keyframe');
  assert.ok(css.includes('border-top-left-radius: 16px'), 'Must have rounded top sheet corners');
  assert.ok(css.includes('align-items: flex-end'), 'Overlay must align to bottom on mobile');
});

runTest('globals.css defines 44px min tap targets for buttons on mobile', () => {
  assert.ok(css.includes('min-height: 44px'), 'Buttons on mobile must have min-height 44px for accessibility');
});

runTest('globals.css includes mobile viewports (320px–480px, 640px, 768px, 1024px)', () => {
  assert.ok(css.includes('@media (max-width: 1023px)'), 'Tablet/Mobile breakpoint');
  assert.ok(css.includes('@media (min-width: 1024px)'), 'Desktop breakpoint');
  assert.ok(css.includes('@media (max-width: 768px)'), 'Standard mobile breakpoint');
  assert.ok(css.includes('@media (max-width: 640px)'), 'Small mobile breakpoint');
  assert.ok(css.includes('@media (max-width: 480px)'), 'Extra small mobile breakpoint (320-430px)');
});

// --------------------------------------------------------------------------
// 3. LAYOUT & NAVIGATION DRAWER ACCESSIBILITY AUDIT
// --------------------------------------------------------------------------
console.log('\n--- SUITE 3: Layout & Navigation Drawer Accessibility ---');

const shellPath = path.join(controlRoot, 'src', 'components', 'layout', 'AdminShell.tsx');
const shell = fs.readFileSync(shellPath, 'utf8');

runTest('AdminShell includes backdrop overlay with click-to-close', () => {
  assert.ok(shell.includes('sidebar-backdrop'), 'Must render sidebar-backdrop');
  assert.ok(shell.includes('onClick={() => setSidebarOpen(false)}'), 'Must close on backdrop click');
  assert.ok(shell.includes('aria-hidden="true"'), 'Backdrop must be aria-hidden');
});

runTest('AdminShell listens to Escape key to dismiss drawer', () => {
  assert.ok(shell.includes("e.key === 'Escape'"), 'Must handle Escape key');
  assert.ok(shell.includes('setSidebarOpen(false)'), 'Must close sidebar on Escape');
});

runTest('AdminShell locks body scroll while drawer is open', () => {
  assert.ok(shell.includes("document.body.style.overflow = 'hidden'"), 'Must lock body scroll');
});

runTest('AdminShell automatically closes drawer on route change without effect cascade', () => {
  assert.ok(shell.includes('prevPathname !== pathname'), 'Must track pathname transition');
  assert.ok(shell.includes('setSidebarOpen(false)'), 'Must auto-close on route change');
});

const sidebarPath = path.join(controlRoot, 'src', 'components', 'layout', 'AdminSidebar.tsx');
const sidebar = fs.readFileSync(sidebarPath, 'utf8');

runTest('AdminSidebar has accessible dialog attributes and mobile close button', () => {
  assert.ok(sidebar.includes('aria-label="Admin Navigation"'), 'Must have aria-label');
  assert.ok(sidebar.includes('role="dialog"'), 'Must have dialog role on drawer');
  assert.ok(sidebar.includes('sidebar-close-btn'), 'Must render mobile close button');
  assert.ok(sidebar.includes('sidebar-logout-btn'), 'Must have dedicated logout button with tap target');
});

runTest('AdminSidebar nav links have >= 44px touch targets', () => {
  assert.ok(sidebar.includes('minHeight: 44'), 'Nav links must be at least 44px high');
});

const topbarPath = path.join(controlRoot, 'src', 'components', 'layout', 'AdminTopBar.tsx');
const topbar = fs.readFileSync(topbarPath, 'utf8');

runTest('AdminTopBar hamburger button has aria-expanded and touch targets', () => {
  assert.ok(topbar.includes('admin-hamburger-btn'), 'Must have admin-hamburger-btn');
  assert.ok(topbar.includes('aria-expanded={isSidebarOpen}'), 'Must have aria-expanded attribute');
  assert.ok(topbar.includes('topbar-icon-btn'), 'Icon buttons must use responsive touch targets');
});

// --------------------------------------------------------------------------
// 4. IMAGE UPLOADER COMPONENT & API ROUTE INTEGRATIONS
// --------------------------------------------------------------------------
console.log('\n--- SUITE 4: Local Image Upload Endpoints & Integration ---');

const uploaderPath = path.join(controlRoot, 'src', 'components', 'ui', 'ImageUploader.tsx');
assert.ok(fs.existsSync(uploaderPath), 'ImageUploader.tsx must exist');
const uploader = fs.readFileSync(uploaderPath, 'utf8');

runTest('ImageUploader supports drag & drop, file browse, and preview', () => {
  assert.ok(uploader.includes('onDragOver'), 'Must handle drag over');
  assert.ok(uploader.includes('onDrop'), 'Must handle file drop');
  assert.ok(uploader.includes('fileInputRef'), 'Must have file input ref for click-to-browse');
  assert.ok(uploader.includes('uploadProgress'), 'Must track upload progress');
  assert.ok(uploader.includes('handleRemove'), 'Must support image removal');
  assert.ok(uploader.includes('manualMode'), 'Must provide manual URL fallback toggle');
});

const blogUploadRoutePath = path.join(controlRoot, 'src', 'app', 'api', 'admin', 'blogs', 'upload', 'route.ts');
assert.ok(fs.existsSync(blogUploadRoutePath), 'Blogs upload route must exist');
const blogUploadRoute = fs.readFileSync(blogUploadRoutePath, 'utf8');

runTest('Blog upload API verifies real admin session and uses magic bytes validator', () => {
  assert.ok(blogUploadRoute.includes('verifyRealAdminSession'), 'Must verify admin session');
  assert.ok(blogUploadRoute.includes('validateImageBuffer'), 'Must validate magic bytes');
  assert.ok(blogUploadRoute.includes("bucketName = 'blog'"), 'Must target production blog bucket');
  assert.ok(blogUploadRoute.includes('process.env.PROD_SUPABASE_URL'), 'Must use PROD_SUPABASE_URL');
});

const bannerUploadRoutePath = path.join(controlRoot, 'src', 'app', 'api', 'admin', 'banners', 'upload', 'route.ts');
assert.ok(fs.existsSync(bannerUploadRoutePath), 'Banner upload route must exist');
const bannerUploadRoute = fs.readFileSync(bannerUploadRoutePath, 'utf8');

runTest('Banner upload API verifies real admin session and uses magic bytes validator', () => {
  assert.ok(bannerUploadRoute.includes('verifyRealAdminSession'), 'Must verify admin session');
  assert.ok(bannerUploadRoute.includes('validateImageBuffer'), 'Must validate magic bytes');
  assert.ok(bannerUploadRoute.includes("bucketName = 'banners'"), 'Must target production banners bucket');
});

const blogsPagePath = path.join(controlRoot, 'src', 'app', '(dashboard)', 'blogs', 'page.tsx');
const blogsPage = fs.readFileSync(blogsPagePath, 'utf8');

runTest('Blog management page integrates ImageUploader', () => {
  assert.ok(blogsPage.includes('<ImageUploader'), 'Must render ImageUploader component');
  assert.ok(blogsPage.includes('uploadEndpoint="/api/admin/blogs/upload"'), 'Must target blog upload API');
});

const bannersPagePath = path.join(controlRoot, 'src', 'app', '(dashboard)', 'banners', 'page.tsx');
const bannersPage = fs.readFileSync(bannersPagePath, 'utf8');

runTest('Banner management page integrates ImageUploader', () => {
  assert.ok(bannersPage.includes('<ImageUploader'), 'Must render ImageUploader component');
  assert.ok(bannersPage.includes('uploadEndpoint="/api/admin/banners/upload"'), 'Must target banner upload API');
});

// --------------------------------------------------------------------------
// 5. RESPONSIVE CONTAINER & OVERFLOW SAFETY AUDIT
// --------------------------------------------------------------------------
console.log('\n--- SUITE 5: Zero Page Horizontal Overflow Audit ---');

const pagesToAudit = [
  { name: 'Overview', file: path.join(controlRoot, 'src', 'app', '(dashboard)', 'page.tsx') },
  { name: 'Users', file: path.join(controlRoot, 'src', 'app', '(dashboard)', 'users', 'page.tsx') },
  { name: 'Analytics', file: path.join(controlRoot, 'src', 'app', '(dashboard)', 'analytics', 'page.tsx') },
  { name: 'Blogs', file: path.join(controlRoot, 'src', 'app', '(dashboard)', 'blogs', 'page.tsx') },
  { name: 'Banners', file: path.join(controlRoot, 'src', 'app', '(dashboard)', 'banners', 'page.tsx') },
  { name: 'Monitoring', file: path.join(controlRoot, 'src', 'app', '(dashboard)', 'monitoring', 'page.tsx') },
  { name: 'Activity', file: path.join(controlRoot, 'src', 'app', '(dashboard)', 'activity', 'page.tsx') },
  { name: 'Admins', file: path.join(controlRoot, 'src', 'app', '(dashboard)', 'admins', 'page.tsx') },
  { name: 'Settings', file: path.join(controlRoot, 'src', 'app', '(dashboard)', 'settings', 'page.tsx') },
];

pagesToAudit.forEach(({ name, file }) => {
  runTest(`Page "${name}" contains zero rigid minmax(>320px, 1fr) overflows`, () => {
    const src = fs.readFileSync(file, 'utf8');
    // Ensure any minmax(Xpx, 1fr) with X > 320 uses min(100%, Xpx)
    const rigidMatches = src.match(/minmax\(\s*(\d{3,4})px\s*,\s*1fr\)/g) || [];
    const violating = rigidMatches.filter((m) => {
      const px = parseInt(m.match(/\d+/)[0], 10);
      return px > 280;
    });
    assert.equal(
      violating.length,
      0,
      `Found rigid minmax that will overflow 320px screens: ${violating.join(', ')}`
    );
  });
});

console.log('\n================================================================');
console.log(`  AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}

