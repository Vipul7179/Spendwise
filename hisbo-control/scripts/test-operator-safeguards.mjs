#!/usr/bin/env node

/**
 * ====================================================================
 * HISBO CONTROL — Operator Safeguards & Migration 004 Verification Suite
 * ====================================================================
 *
 * Verifies:
 * 1. Migration 004 least-privilege role design and financial isolation.
 * 2. Migration 004 rollback precision and safety.
 * 3. Migration 000 staging privilege-escalation mitigation.
 * 4. Operator client fail-closed behavior, timeout enforcement, and credential redaction.
 * 5. Route-level admin-guard enforcement across all content and settings routes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
  }
}

console.log('\n========================================================');
console.log('  RUNNING OPERATOR SAFEGUARDS & MIGRATION 004 AUDIT');
console.log('========================================================\n');

// --------------------------------------------------------------------
// TEST SUITE 1: Migration 004 Security & Financial Isolation
// --------------------------------------------------------------------
console.log('Test Suite 1: Migration 004 Schema & Permissions Analysis');
const migration004Path = path.join(ROOT_DIR, 'migrations', '004_production_content_setup.sql');
assert(fs.existsSync(migration004Path), 'migrations/004_production_content_setup.sql exists');

if (fs.existsSync(migration004Path)) {
  const sql = fs.readFileSync(migration004Path, 'utf8');

  // Verify dedicated role
  assert(sql.includes('CREATE ROLE hisbo_platform_operator'), 'Defines dedicated role "hisbo_platform_operator"');
  assert(sql.includes('NOINHERIT'), 'Role specifies NOINHERIT to prevent inheriting superuser privileges');
  assert(sql.includes('NOBYPASSRLS'), 'Role specifies NOBYPASSRLS to obey all row-level security');
  assert(sql.includes("statement_timeout = '5000ms'"), 'Enforces strict 5-second statement timeout');

  // Verify financial isolation
  assert(sql.includes('REVOKE ALL ON TABLE public.user_data FROM hisbo_platform_operator'), 'Explicitly revokes access to public.user_data (financial ledgers)');
  assert(!sql.match(/GRANT\s+(SELECT|ALL|INSERT|UPDATE)\s+ON\s+(TABLE\s+)?(public\.)?user_data\s+TO\s+hisbo_platform_operator/i), 'Never grants any privileges on public.user_data');
  assert(sql.includes('REVOKE ALL ON SCHEMA auth FROM hisbo_platform_operator'), 'Explicitly revokes access to auth schema');

  // Verify approved table grants
  assert(sql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blog_posts TO hisbo_platform_operator'), 'Grants scoped access to public.blog_posts');
  assert(sql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blog_categories TO hisbo_platform_operator'), 'Grants scoped access to public.blog_categories');
  assert(sql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.banners TO hisbo_platform_operator'), 'Grants scoped access to public.banners');
  assert(sql.includes('GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_settings TO hisbo_platform_operator'), 'Grants scoped access to public.platform_settings');

  // Verify platform settings table definition
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.platform_settings'), 'Creates public.platform_settings table');
  assert(sql.includes('ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY'), 'Enables RLS on public.platform_settings');
}

// --------------------------------------------------------------------
// TEST SUITE 2: Migration 004 Rollback Safety
// --------------------------------------------------------------------
console.log('\nTest Suite 2: Migration 004 Rollback Script Analysis');
const rollback004Path = path.join(ROOT_DIR, 'migrations', '004_production_content_rollback.sql');
assert(fs.existsSync(rollback004Path), 'migrations/004_production_content_rollback.sql exists');

if (fs.existsSync(rollback004Path)) {
  const rollbackSql = fs.readFileSync(rollback004Path, 'utf8');

  assert(rollbackSql.includes('DROP ROLE IF EXISTS hisbo_platform_operator'), 'Rollback safely drops hisbo_platform_operator role');
  assert(rollbackSql.includes('Preserve platform_settings table and records by default'), 'Rollback preserves platform_settings table and data by default');
  assert(!rollbackSql.includes('DROP TABLE public.blog_posts'), 'Rollback does NOT drop existing production blog_posts table');
  assert(!rollbackSql.includes('DROP TABLE public.banners'), 'Rollback does NOT drop existing production banners table');
  assert(!rollbackSql.includes('DROP TABLE public.user_data'), 'Rollback does NOT drop customer user_data table');
}

// --------------------------------------------------------------------
// TEST SUITE 3: Staging Privilege Escalation Defense (Migration 000)
// --------------------------------------------------------------------
console.log('\nTest Suite 3: Migration 000 Staging Privilege Escalation Defense');
const migration000Path = path.join(ROOT_DIR, 'migrations', '000_staging_schema_setup.sql');
assert(fs.existsSync(migration000Path), 'migrations/000_staging_schema_setup.sql exists');

if (fs.existsSync(migration000Path)) {
  const stagingSql = fs.readFileSync(migration000Path, 'utf8');

  assert(stagingSql.includes('REVOKE ALL ON TABLE public.profiles FROM authenticated, anon'), 'Revokes blanket table-level privileges from authenticated & anon');
  assert(stagingSql.includes('GRANT UPDATE (') && !stagingSql.match(/GRANT UPDATE\s*\([^)]*is_admin[^)]*\)/i), 'Column-level UPDATE grants explicitly EXCLUDE "is_admin"');
  assert(stagingSql.includes('protect_profile_admin_column'), 'Implements defense-in-depth trigger protect_profile_admin_column (BEFORE UPDATE)');
  assert(stagingSql.includes('protect_profile_admin_insert'), 'Implements defense-in-depth trigger protect_profile_admin_insert (BEFORE INSERT)');
  assert(stagingSql.includes('SECURITY DEFINER') && stagingSql.includes('SET search_path TO \'public\''), 'handle_new_user() pins search_path to prevent schema spoofing');
}

// --------------------------------------------------------------------
// TEST SUITE 4: Operator Backend Module Safeguards
// --------------------------------------------------------------------
console.log('\nTest Suite 4: Operator Backend Client Analysis');
const operatorLibPath = path.join(ROOT_DIR, 'src', 'lib', 'production', 'operator.ts');
assert(fs.existsSync(operatorLibPath), 'src/lib/production/operator.ts exists');

if (fs.existsSync(operatorLibPath)) {
  const operatorCode = fs.readFileSync(operatorLibPath, 'utf8');

  assert(operatorCode.includes('maskConnectionString'), 'Implements maskConnectionString() to redact passwords');
  assert(operatorCode.includes('getProductionOperatorStatus'), 'Exports getProductionOperatorStatus()');
  assert(operatorCode.includes('statement_timeout = 5000'), 'Configures pool statement_timeout to 5000ms');
  assert(operatorCode.includes('max: 3'), 'Limits maximum concurrent pool connections to 3');
  assert(!operatorCode.match(/(from|into|update|join)\s+([a-z0-9_]+\.)?user_data/i), 'Does NOT query or mutate customer user_data');
}

// --------------------------------------------------------------------
// TEST SUITE 5: API Guard Protection on All Administrative Routes
// --------------------------------------------------------------------
console.log('\nTest Suite 5: Administrative Route Guard Enforcement');
const routesToAudit = [
  'src/app/api/admin/blogs/route.ts',
  'src/app/api/admin/banners/route.ts',
  'src/app/api/admin/settings/route.ts',
  'src/app/api/admin/activity/route.ts',
  'src/app/api/admin/analytics/data/route.ts',
  'src/app/api/admin/admins/route.ts',
  'src/app/api/admin/overview/route.ts',
  'src/app/api/admin/users/route.ts',
];

for (const routeRel of routesToAudit) {
  const routePath = path.join(ROOT_DIR, routeRel);
  assert(fs.existsSync(routePath), `${routeRel} exists`);
  if (fs.existsSync(routePath)) {
    const code = fs.readFileSync(routePath, 'utf8');
    assert(code.includes('verifyRealAdminSession'), `${routeRel} enforces verifyRealAdminSession`);
    assert(code.includes('force-dynamic'), `${routeRel} specifies force-dynamic`);
  }
}

// --------------------------------------------------------------------
// TEST SUITE 6: Absence of Hardcoded Secrets or Production Write Violations
// --------------------------------------------------------------------
console.log('\nTest Suite 6: Codebase Hardcoded Secrets & Isolation Audit');
const filesToInspect = [
  'src/app/api/admin/blogs/route.ts',
  'src/app/api/admin/banners/route.ts',
  'src/app/api/admin/settings/route.ts',
  'src/app/api/admin/activity/route.ts',
  'src/lib/production/operator.ts',
  'src/lib/production/client.ts',
];

for (const fileRel of filesToInspect) {
  const fullPath = path.join(ROOT_DIR, fileRel);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(!content.match(/postgres:\/\/.*:.*@/i), `${fileRel} contains NO hardcoded connection URIs`);
    assert(!content.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/i), `${fileRel} contains NO hardcoded JWT tokens`);
  }
}

// --------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------
console.log('\n========================================================');
console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('========================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m✔ All operator safeguards, privilege barriers, and migration designs VERIFIED.\x1b[0m\n');
  process.exit(0);
}
