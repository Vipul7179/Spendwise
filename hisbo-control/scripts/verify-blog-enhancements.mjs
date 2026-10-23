// ====================================================================
// HISBO CONTROL: Blog Enhancements & Article Editor Verification Suite
// ====================================================================

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugifyBlogTitle, validateBlogSlug, SLUG_REGEX } from '../src/lib/blog/slug-utils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controlRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log('  HISBO CONTROL: BLOG ARTICLE MANAGEMENT ENHANCEMENT AUDIT');
console.log('================================================================\n');

// --- SUITE 1: Slug Generation & Constraint Compliance ---
console.log('--- SUITE 1: Slug Generation & Constraint Compliance ---');

runTest('Generates clean, compliant slug from standard English title', () => {
  const slug = slugifyBlogTitle('5 Habits of People Who Never Overspend');
  assert.strictEqual(slug, '5-habits-of-people-who-never-overspend');
  assert.ok(SLUG_REGEX.test(slug), 'Must match database regex');
  assert.ok(validateBlogSlug(slug).valid, 'Must be valid');
});

runTest('Normalizes accents, diacritics, and special characters', () => {
  const slug = slugifyBlogTitle('Café & Crème: How to Budget in 2026! ($100 Savings)');
  assert.strictEqual(slug, 'cafe-creme-how-to-budget-in-2026-100-savings');
  assert.ok(SLUG_REGEX.test(slug));
  assert.ok(validateBlogSlug(slug).valid);
});

runTest('Collapses multiple consecutive dashes and removes leading/trailing hyphens', () => {
  const slug = slugifyBlogTitle('---Smart---Money---Tips---');
  assert.strictEqual(slug, 'smart-money-tips');
  assert.ok(SLUG_REGEX.test(slug));
});

runTest('Enforces maximum 90 characters without leaving trailing hyphens', () => {
  const longTitle = 'This is an exceedingly long article title that should be clamped to ninety characters maximum without trailing hyphens or broken formatting at all';
  const slug = slugifyBlogTitle(longTitle);
  assert.ok(slug.length <= 90, `Slug length was ${slug.length}, expected <= 90`);
  assert.ok(!slug.endsWith('-'), 'Cannot end with a hyphen');
  assert.ok(SLUG_REGEX.test(slug));
});

runTest('Slug validator strictly rejects violating formats', () => {
  assert.strictEqual(validateBlogSlug('ab').valid, false, 'Reject shorter than 3 chars');
  assert.strictEqual(validateBlogSlug('-leading-dash').valid, false, 'Reject leading dash');
  assert.strictEqual(validateBlogSlug('trailing-dash-').valid, false, 'Reject trailing dash');
  assert.strictEqual(validateBlogSlug('double--hyphens').valid, false, 'Reject double hyphen');
  assert.strictEqual(validateBlogSlug('UPPERCASE-SLUG').valid, false, 'Reject uppercase');
  assert.strictEqual(validateBlogSlug('invalid_underscore').valid, false, 'Reject underscores');
  assert.strictEqual(validateBlogSlug('spaces in slug').valid, false, 'Reject spaces');
});

runTest('Slug validator accepts valid slugs within 3-90 characters', () => {
  assert.ok(validateBlogSlug('abc').valid);
  assert.ok(validateBlogSlug('budget-tips-2026').valid);
  assert.ok(validateBlogSlug('investing-in-index-funds-guide').valid);
});

// --- SUITE 2: Database Migrations Architecture ---
console.log('\n--- SUITE 2: Database Migrations Architecture ---');

runTest('005_blog_enhancements.sql exists and includes author_position, tags, and is_featured', () => {
  const migPath = path.join(controlRoot, 'migrations', '005_blog_enhancements.sql');
  assert.ok(fs.existsSync(migPath), 'Migration 005 setup file must exist');
  const content = fs.readFileSync(migPath, 'utf8');
  assert.ok(content.includes('author_position text'), 'Must add author_position');
  assert.ok(content.includes('tags text[]'), 'Must add tags array');
  assert.ok(content.includes('is_featured boolean'), 'Must add is_featured');
  assert.ok(content.includes('idx_blog_posts_tags'), 'Must create GIN index on tags');
  assert.ok(content.includes('hisbo_platform_operator'), 'Must refresh operator grants');
});

runTest('005_blog_enhancements_rollback.sql exists and safely drops columns & indexes', () => {
  const rollbackPath = path.join(controlRoot, 'migrations', '005_blog_enhancements_rollback.sql');
  assert.ok(fs.existsSync(rollbackPath), 'Migration 005 rollback file must exist');
  const content = fs.readFileSync(rollbackPath, 'utf8');
  assert.ok(content.includes('DROP COLUMN IF EXISTS author_position'), 'Must drop author_position');
  assert.ok(content.includes('DROP COLUMN IF EXISTS tags'), 'Must drop tags');
  assert.ok(content.includes('DROP COLUMN IF EXISTS is_featured'), 'Must drop is_featured');
});

// --- SUITE 3: Backend Operator & API Endpoints ---
console.log('\n--- SUITE 3: Backend Operator & API Endpoints ---');

const operatorPath = path.join(controlRoot, 'src', 'lib', 'production', 'operator.ts');
const operatorCode = fs.readFileSync(operatorPath, 'utf8');

runTest('Operator exports createProductionBlogCategory', () => {
  assert.ok(operatorCode.includes('export async function createProductionBlogCategory'), 'Must export createProductionBlogCategory');
  assert.ok(operatorCode.includes('public.blog_categories'), 'Must target blog_categories');
});

runTest('Operator createProductionBlogPost supports author, position, tags, featured, and SEO', () => {
  assert.ok(operatorCode.includes('author_position'), 'Must support author_position');
  assert.ok(operatorCode.includes('tags'), 'Must support tags');
  assert.ok(operatorCode.includes('is_featured'), 'Must support is_featured');
  assert.ok(operatorCode.includes('seo_title'), 'Must support seo_title');
  assert.ok(operatorCode.includes('seo_description'), 'Must support seo_description');
  assert.ok(operatorCode.includes('validateBlogSlug'), 'Must validate slug against constraint');
});

runTest('Operator updateProductionBlogPost supports all new fields without data loss', () => {
  assert.ok(operatorCode.includes('payload.author_position'), 'Must update author_position');
  assert.ok(operatorCode.includes('payload.tags'), 'Must update tags');
  assert.ok(operatorCode.includes('payload.is_featured'), 'Must update is_featured');
  assert.ok(operatorCode.includes('payload.seo_title'), 'Must update seo_title');
  assert.ok(operatorCode.includes('payload.seo_description'), 'Must update seo_description');
});

runTest('Category API route exists and guards with verifyRealAdminSession', () => {
  const catRoutePath = path.join(controlRoot, 'src', 'app', 'api', 'admin', 'blogs', 'categories', 'route.ts');
  assert.ok(fs.existsSync(catRoutePath), 'Category route file must exist');
  const catCode = fs.readFileSync(catRoutePath, 'utf8');
  assert.ok(catCode.includes('verifyRealAdminSession'), 'Must enforce admin auth');
  assert.ok(catCode.includes('createProductionBlogCategory'), 'Must call createProductionBlogCategory');
});

// --- SUITE 4: UI Components & Blog Page Integration ---
console.log('\n--- SUITE 4: UI Components & Blog Page Integration ---');

const richEditorPath = path.join(controlRoot, 'src', 'components', 'blog', 'RichBlogEditor.tsx');
assert.ok(fs.existsSync(richEditorPath), 'RichBlogEditor component must exist');
const richEditorCode = fs.readFileSync(richEditorPath, 'utf8');

runTest('RichBlogEditor includes Write, Preview, and direct image upload', () => {
  assert.ok(richEditorCode.includes("activeTab === 'write'"), 'Must have Write tab');
  assert.ok(richEditorCode.includes("activeTab === 'preview'"), 'Must have Preview tab');
  assert.ok(richEditorCode.includes('/api/admin/blogs/upload'), 'Must support direct image upload');
  assert.ok(richEditorCode.includes('words.toLocaleString()'), 'Must show word count');
});

const categoryModalPath = path.join(controlRoot, 'src', 'components', 'blog', 'BlogCategoryModal.tsx');
assert.ok(fs.existsSync(categoryModalPath), 'BlogCategoryModal component must exist');

const blogPagePath = path.join(controlRoot, 'src', 'app', '(dashboard)', 'blogs', 'page.tsx');
const blogPageCode = fs.readFileSync(blogPagePath, 'utf8');

runTest('Blog management page integrates Author Name & Position inputs', () => {
  assert.ok(blogPageCode.includes('formAuthor'), 'Must have Author Name state');
  assert.ok(blogPageCode.includes('formAuthorPosition'), 'Must have Author Position state');
  assert.ok(blogPageCode.includes('Author Designation / Role'), 'Must render designation label');
});

runTest('Blog management page integrates "+ Create New Category"', () => {
  assert.ok(blogPageCode.includes('+ Create New Category'), 'Must have Create New Category button');
  assert.ok(blogPageCode.includes('BlogCategoryModal'), 'Must integrate BlogCategoryModal');
});

runTest('Blog management page integrates Tags, Featured Toggle, and SEO fields', () => {
  assert.ok(blogPageCode.includes('formTags'), 'Must have Tags state');
  assert.ok(blogPageCode.includes('formIsFeatured'), 'Must have Featured toggle state');
  assert.ok(blogPageCode.includes('formSeoTitle'), 'Must have SEO Title state');
  assert.ok(blogPageCode.includes('formSeoDescription'), 'Must have SEO Description state');
  assert.ok(blogPageCode.includes('hisbo.in'), 'Must have Google search snippet preview');
});

runTest('Blog management page integrates RichBlogEditor and Publishing Options', () => {
  assert.ok(blogPageCode.includes('RichBlogEditor'), 'Must integrate RichBlogEditor');
  assert.ok(blogPageCode.includes('publishingMode'), 'Must have publishingMode state');
  assert.ok(blogPageCode.includes('Save as Draft'), 'Must have Save as Draft');
  assert.ok(blogPageCode.includes('Publish Immediately'), 'Must have Publish Immediately');
  assert.ok(blogPageCode.includes('Schedule for Later'), 'Must have Schedule for Later');
});

runTest('Blog management page pre-populates all fields when editing existing article', () => {
  assert.ok(blogPageCode.includes('openEditModal'), 'Must have openEditModal');
  assert.ok(blogPageCode.includes('setFormAuthorPosition(post.author_position || \'\')'), 'Must pre-fill author_position');
  assert.ok(blogPageCode.includes('setFormTags(post.tags || [])'), 'Must pre-fill tags');
  assert.ok(blogPageCode.includes('setFormIsFeatured(Boolean(post.is_featured))'), 'Must pre-fill is_featured');
  assert.ok(blogPageCode.includes('setFormSeoTitle(post.seo_title || \'\')'), 'Must pre-fill seo_title');
  assert.ok(blogPageCode.includes('setFormSeoDescription(post.seo_description || \'\')'), 'Must pre-fill seo_description');
});

console.log('\n================================================================');
console.log(`  AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (${failedTests === 0 ? '100%' : 'FAILURES DETECTED'})`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}

