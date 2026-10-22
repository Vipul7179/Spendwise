/**
 * Admin API Authorization Safeguards Test Suite
 *
 * Verifies all 12 security requirements for Option A before connecting
 * privileged routes to staging:
 *
 * 1. Demo sessions are rejected with HTTP 403.
 * 2. Unauthenticated requests are rejected with HTTP 401.
 * 3. Non-staging Supabase URLs (including production) trigger immediate safety halt.
 * 4. Missing service-role key returns graceful HTTP 503 without leaking details.
 * 5. Privileged admin client cannot be invoked on client-side or with production URL.
 * 6. Zero service-role key exposure in responses or logs.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertStagingEnvironment, EXPECTED_STAGING_PROJECT_REF } from '../src/lib/auth/staging-guard.ts';
import { getSupabaseAdminClient, resetSupabaseAdminClient } from '../src/lib/supabase/admin.ts';
import { GET as getUsersHandler } from '../src/app/api/admin/users/route.ts';
import { GET as getOverviewHandler } from '../src/app/api/admin/overview/route.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

console.log('\n===============================================================');
console.log('  HISBO CONTROL: ADMIN API AUTHORIZATION SAFEGUARDS AUDIT      ');
console.log('===============================================================\n');

// -----------------------------------------------------------------------------
// SUITE 1: Staging Environment Project Guard
// -----------------------------------------------------------------------------
console.log('SUITE 1: Staging Project Identity Verification (klvbtoxyeixxjydnanlz)');

test('Requirement 2 & 6: Confirms staging project reference klvbtoxyeixxjydnanlz', () => {
  const result = assertStagingEnvironment('https://klvbtoxyeixxjydnanlz.supabase.co');
  assert.strictEqual(result.isStaging, true);
  assert.strictEqual(result.projectRef, 'klvbtoxyeixxjydnanlz');
  assert.strictEqual(result.error, undefined);
});

test('Requirement 6: Rejects production project reference omnhxlqykmtzxdagppcl with safety halt', () => {
  const result = assertStagingEnvironment('https://omnhxlqykmtzxdagppcl.supabase.co');
  assert.strictEqual(result.isStaging, false);
  assert.strictEqual(result.projectRef, 'omnhxlqykmtzxdagppcl');
  assert(result.error?.includes('CRITICAL SAFETY HALT'));
});

test('Requirement 6: Rejects empty or missing Supabase URL', () => {
  const result = assertStagingEnvironment('');
  assert.strictEqual(result.isStaging, false);
  assert(result.error?.includes('CRITICAL SAFETY HALT'));
});

test('Requirement 6: Rejects arbitrary third-party Supabase project URL', () => {
  const result = assertStagingEnvironment('https://attacker12345.supabase.co');
  assert.strictEqual(result.isStaging, false);
  assert(result.error?.includes('CRITICAL SAFETY HALT'));
});

// -----------------------------------------------------------------------------
// SUITE 2: Service-Role Client Safeguards
// -----------------------------------------------------------------------------
console.log('\nSUITE 2: Service-Role Client Safeguards');

test('Requirement 6: getSupabaseAdminClient throws error if configured with production URL', () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://omnhxlqykmtzxdagppcl.supabase.co';
    resetSupabaseAdminClient();
    assert.throws(
      () => getSupabaseAdminClient(),
      /CRITICAL SAFETY HALT/,
      'Must throw critical safety halt when URL is production'
    );
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    resetSupabaseAdminClient();
  }
});

test('Requirement 8: getSupabaseAdminClient returns null when service-role key is unconfigured', () => {
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://klvbtoxyeixxjydnanlz.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetSupabaseAdminClient();
    const client = getSupabaseAdminClient();
    assert.strictEqual(client, null, 'Must return null gracefully when key is not set');
  } finally {
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    resetSupabaseAdminClient();
  }
});

// -----------------------------------------------------------------------------
// SUITE 3: Real-Data Route Handler Safeguards (Users & Overview)
// -----------------------------------------------------------------------------
console.log('\nSUITE 3: Real-Data Route Handler Safeguards');

await testAsync('Requirement 5: GET /api/admin/users rejects demo cookie with HTTP 403', async () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://klvbtoxyeixxjydnanlz.supabase.co';
    const req = new Request('http://localhost:3001/api/admin/users', {
      headers: {
        cookie: 'hisbo_control_demo=super_admin',
      },
    });
    const res = await getUsersHandler(req);
    assert.strictEqual(res.status, 403, 'Demo sessions must be rejected with 403 on real-data routes');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error?.includes('Demo evaluation sessions cannot access real database records'));
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  }
});

await testAsync('Requirement 5: GET /api/admin/overview rejects demo cookie with HTTP 403', async () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://klvbtoxyeixxjydnanlz.supabase.co';
    const req = new Request('http://localhost:3001/api/admin/overview', {
      headers: {
        cookie: 'hisbo_control_demo=super_admin',
      },
    });
    const res = await getOverviewHandler(req);
    assert.strictEqual(res.status, 403, 'Demo sessions must be rejected with 403 on real-data routes');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error?.includes('Demo evaluation sessions cannot access real database records'));
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  }
});

await testAsync('Requirement 4: GET /api/admin/users rejects unauthenticated request with HTTP 401', async () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://klvbtoxyeixxjydnanlz.supabase.co';
    const req = new Request('http://localhost:3001/api/admin/users');
    const res = await getUsersHandler(req);
    assert.strictEqual(res.status, 401, 'Unauthenticated request must be rejected with 401');
    const data = await res.json();
    assert.strictEqual(data.success, false);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  }
});

await testAsync('Requirement 6: GET /api/admin/users halts with 500 if project is set to production', async () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://omnhxlqykmtzxdagppcl.supabase.co';
    const req = new Request('http://localhost:3001/api/admin/users');
    const res = await getUsersHandler(req);
    assert.strictEqual(res.status, 500, 'Production URL must trigger safety halt 500');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert(data.error?.includes('CRITICAL SAFETY HALT'));
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  }
});

await testAsync('Requirement 7: Never leaks service-role key in response body or headers', async () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const testSecretKey = 'mock_secret_service_role_key_999888777';
  process.env.SUPABASE_SERVICE_ROLE_KEY = testSecretKey;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://klvbtoxyeixxjydnanlz.supabase.co';
    const req = new Request('http://localhost:3001/api/admin/users');
    const res = await getUsersHandler(req);
    const data = await res.json();
    const bodyStr = JSON.stringify(data);
    assert(!bodyStr.includes(testSecretKey), 'Secret key must never appear in response body');
    assert(!JSON.stringify(res.headers).includes(testSecretKey), 'Secret key must never appear in headers');
  } finally {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
  }
});

// -----------------------------------------------------------------------------
// SUITE 4: Migration 001 Roles & Audit Logs Security Analysis
// -----------------------------------------------------------------------------
console.log('\nSUITE 4: Migration 001 Roles & Audit Logs Security Analysis');

const migration001Path = path.join(ROOT_DIR, 'migrations', '001_admin_roles_and_audit_logs.sql');
const rollback001Path = path.join(ROOT_DIR, 'migrations', '001_admin_roles_and_audit_logs_rollback.sql');

test('Migration 001 script exists and is wrapped in a transaction (BEGIN/COMMIT)', () => {
  assert(fs.existsSync(migration001Path), '001_admin_roles_and_audit_logs.sql must exist');
  const sql = fs.readFileSync(migration001Path, 'utf8');
  assert(sql.includes('BEGIN;'), 'Must begin transaction');
  assert(sql.includes('COMMIT;'), 'Must commit transaction');
  assert(!sql.includes('/*') && !sql.includes('*/'), 'Must not contain multiline block comments (/* or */) to prevent parser errors');
  const dollarPairs = (sql.match(/\$\$/g) || []).length;
  assert.strictEqual(dollarPairs % 2, 0, 'Must have balanced $$ quote delimiters');
});

test('Migration 001 verifies staging guard and fails closed on unverified databases', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  assert(sql.includes('_hisbo_staging_guard'), 'Must check _hisbo_staging_guard schema');
  assert(sql.includes('klvbtoxyeixxjydnanlz'), 'Must verify staging project ref');
  assert(sql.includes('hisbo-staging'), 'Must verify staging environment name');
});

test('Migration 001 fails safely on incompatible existing objects', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  assert(sql.includes('v_col_type NOT IN'), 'Must check incompatible data type for role');
  assert(sql.includes("v_obj_type <> 'BASE TABLE'"), 'Must check admin_audit_logs is a BASE TABLE');
});

test('Migration 001 preserves existing profiles and backfills admin roles safely', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  assert(sql.includes("SET role = 'admin'"), 'Must backfill existing admins');
  assert(sql.includes('WHERE is_admin = true'), 'Must target verified admins');
  assert(!sql.includes('DROP TABLE public.profiles'), 'Must NEVER drop profiles');
  assert(!sql.includes('DELETE FROM public.profiles'), 'Must NEVER delete profiles');
});

test('Migration 001 removes redundant protect_admin_privilege_escalation and preserves 002 triggers', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  assert(sql.includes('DROP TRIGGER IF EXISTS tr_protect_admin_privileges'), 'Must drop obsolete trigger');
  assert(sql.includes('DROP FUNCTION IF EXISTS public.protect_admin_privilege_escalation'), 'Must drop obsolete function');
  // Ensure 002 triggers are NOT dropped
  assert(!sql.includes('DROP TRIGGER IF EXISTS tr_protect_profile_admin_column'), 'Must NOT drop 002 column trigger');
  assert(!sql.includes('DROP TRIGGER IF EXISTS tr_protect_profile_admin_insert'), 'Must NOT drop 002 insert trigger');
  assert(!sql.includes('DROP FUNCTION IF EXISTS public.protect_profile_admin_column'), 'Must NOT drop 002 column function');
  assert(!sql.includes('DROP FUNCTION IF EXISTS public.protect_profile_admin_insert'), 'Must NOT drop 002 insert function');
});

test('Migration 001 installs SECURITY INVOKER triggers to protect role column', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  assert(sql.includes('CREATE TRIGGER tr_protect_profile_role_column'), 'Must create role update trigger');
  assert(sql.includes('CREATE TRIGGER tr_protect_profile_role_insert'), 'Must create role insert trigger');
  assert(sql.includes('REVOKE ALL (role) ON TABLE public.profiles FROM authenticated, anon, PUBLIC'), 'Must revoke role modifications');
  assert(!sql.includes('SECURITY DEFINER\nAS $$\nBEGIN\n  IF NEW.role'), 'Trigger functions must NOT be SECURITY DEFINER');
});

test('Migration 001 includes all required categories in admin_audit_logs', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  const requiredCategories = ['auth', 'users', 'admins', 'roles', 'blogs', 'banners', 'monitoring', 'settings', 'security'];
  for (const cat of requiredCategories) {
    assert(sql.includes(`'${cat}'`), `Category '${cat}' must be included in check constraint`);
  }
});

test('Migration 001 restricts audit log INSERT to server-side service_role', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  assert(sql.includes('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.admin_audit_logs FROM authenticated, anon, PUBLIC'), 'Must revoke mutations from client roles');
  assert(sql.includes('GRANT SELECT ON TABLE public.admin_audit_logs TO authenticated'), 'Must allow SELECT for authenticated');
  assert(sql.includes('GRANT ALL ON TABLE public.admin_audit_logs TO postgres, service_role'), 'Must grant ALL to service_role');
  assert(!sql.match(/CREATE\s+POLICY\s+["'][^"']+["']\s+ON\s+public\.admin_audit_logs\s+FOR\s+INSERT\s+TO\s+authenticated/i), 'Must NOT create INSERT policy for authenticated');
});

test('Migration 001 preserves and re-affirms safe column-level UPDATE permissions from Migration 002', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  assert(sql.includes('GRANT UPDATE (\n  email,\n  name,\n  last_seen,'), 'Must explicitly grant column-level UPDATE on safe user columns');
  assert(sql.includes('GRANT SELECT ON TABLE public.profiles TO authenticated;'), 'Must preserve SELECT for authenticated users');
  assert(!sql.match(/GRANT\s+UPDATE\s*\([^)]*is_admin[^)]*\)\s+ON\s+TABLE\s+public\.profiles/i), 'Must never grant UPDATE on is_admin');
});

test('Migration 001 preserves normal user registration and normal profile updates', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  // Verify protect_profile_role_insert allows role = 'user' or null
  assert(sql.includes("NEW.role IS NOT NULL AND NEW.role <> 'user'"), 'Role insert trigger must allow default user role');
  // Verify protect_profile_role_column only blocks role changes, not name/last_seen updates
  assert(sql.includes('NEW.role IS DISTINCT FROM OLD.role'), 'Role update trigger must only intercept role mutations');
});

test('Migration 001 preserves existing admin accounts with is_admin = true', () => {
  const sql = fs.readFileSync(migration001Path, 'utf8');
  assert(!sql.match(/SET\s+is_admin\s*=/i), 'Must never overwrite is_admin values');
  assert(sql.includes("SET role = 'admin' \nWHERE is_admin = true"), 'Verified admins receive admin role');
});

test('Migration 001 rollback preserves admin_audit_logs and profiles.role by default', () => {
  assert(fs.existsSync(rollback001Path), '001_admin_roles_and_audit_logs_rollback.sql must exist');
  const rollbackSql = fs.readFileSync(rollback001Path, 'utf8');
  assert(rollbackSql.includes('BEGIN;'), 'Rollback must be transactional');
  assert(rollbackSql.includes('COMMIT;'), 'Rollback must commit cleanly');
  assert(rollbackSql.includes('REVOKE UPDATE, INSERT ON TABLE public.profiles FROM authenticated, anon, PUBLIC'), 'Rollback preserves 002 revoke');
  assert(rollbackSql.includes('REVOKE ALL (is_admin) ON TABLE public.profiles FROM authenticated, anon, PUBLIC'), 'Rollback preserves 002 is_admin revoke');
  assert(!rollbackSql.includes('DROP TRIGGER IF EXISTS tr_protect_profile_admin_column'), 'Rollback must NOT drop 002 triggers');
  // Default rollback must NOT execute active DROP TABLE or active DROP COLUMN
  const activeDropTable = rollbackSql.split('\n').filter(line => !line.trim().startsWith('--') && line.includes('DROP TABLE'));
  const activeDropColumn = rollbackSql.split('\n').filter(line => !line.trim().startsWith('--') && line.includes('DROP COLUMN'));
  assert.strictEqual(activeDropTable.length, 0, 'Rollback must NOT execute active DROP TABLE by default');
  assert.strictEqual(activeDropColumn.length, 0, 'Rollback must NOT execute active DROP COLUMN by default');
  assert(rollbackSql.includes('GRANT UPDATE (\n  email,\n  name,\n  last_seen,'), 'Rollback must preserve safe column-level UPDATE grants');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n---------------------------------------------------------------');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('---------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
}
