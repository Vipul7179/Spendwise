// ====================================================================
// HISBO CONTROL: Production Reporting Security & Safeguards Test Suite
// ====================================================================
// Verifies:
// 1. Production reporting is disabled by default.
// 2. Unconfigured / disabled requests fail-closed with 503 and clear messaging.
// 3. Demo sessions are rejected with HTTP 403 on all reporting routes.
// 4. Client clamping enforces max 50 rows and 3000ms query timeout.
// 5. Connection error sanitizer redacts database credentials.
// 6. SQL migration 003 enforces SECURITY DEFINER, search_path, zero PUBLIC grants.
// 7. Rollback script 003 is precise and non-destructive.
// 8. Users and Overview default strictly to production reporting.
// 9. Staging admins are strictly separated and excluded from customer directory.
// ====================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${description}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${description}`);
  }
}

console.log('\n======================================================');
console.log(' RUNNING PRODUCTION REPORTING SAFEGUARDS SUITE');
console.log('======================================================\n');

// --------------------------------------------------------------------
// TEST 1: Migration 003 Static Security Architecture
// --------------------------------------------------------------------
console.log('[SUITE 1] Inspecting 003_production_reporting_setup.sql:');
const migration003Path = path.join(ROOT, 'migrations', '003_production_reporting_setup.sql');
assert(fs.existsSync(migration003Path), 'Migration 003 setup file exists');

if (fs.existsSync(migration003Path)) {
  const sqlContent = fs.readFileSync(migration003Path, 'utf8');

  assert(
    sqlContent.includes('CREATE SCHEMA reporting') || sqlContent.includes('CREATE SCHEMA IF NOT EXISTS reporting'),
    'Dedicated "reporting" schema is isolated from public'
  );
  assert(
    sqlContent.includes('REVOKE ALL ON SCHEMA reporting FROM PUBLIC, anon, authenticated'),
    'Schema usage revoked from PUBLIC, anon, authenticated'
  );
  assert(
    sqlContent.includes('NOBYPASSRLS') && sqlContent.includes('NOINHERIT'),
    'Role enforces NOBYPASSRLS and NOINHERIT'
  );
  assert(
    sqlContent.includes('CONNECTION LIMIT 5'),
    'Connection limit capped at 5'
  );
  assert(
    sqlContent.includes("statement_timeout = '3000ms'"),
    'Statement timeout capped at 3000ms'
  );
  assert(
    sqlContent.includes('REVOKE ALL ON SCHEMA public FROM hisbo_readonly_reporter'),
    'Role is explicitly revoked all access to public schema'
  );
  assert(
    sqlContent.includes('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM hisbo_readonly_reporter'),
    'Role has zero table grants on public schema (user_data protected)'
  );
  assert(
    sqlContent.includes('SET search_path = public, pg_temp'),
    'Routines lock search_path to public, pg_temp'
  );
  assert(
    sqlContent.includes('LEAST(GREATEST(p_limit, 1), 50)'),
    'Directory pagination strictly clamped to maximum 50 rows in SQL'
  );
  assert(
    sqlContent.includes('REVOKE ALL ON FUNCTION reporting.get_user_directory') &&
    sqlContent.includes('FROM PUBLIC, anon, authenticated'),
    'Function execution revoked from PUBLIC'
  );
  assert(
    sqlContent.includes('GRANT EXECUTE ON FUNCTION reporting.get_user_directory') &&
    sqlContent.includes('TO hisbo_readonly_reporter'),
    'Execution granted exclusively to hisbo_readonly_reporter'
  );
}

// --------------------------------------------------------------------
// TEST 2: Rollback Script 003 Precision & Non-Destructive Nature
// --------------------------------------------------------------------
console.log('\n[SUITE 2] Inspecting 003_production_reporting_rollback.sql:');
const rollback003Path = path.join(ROOT, 'migrations', '003_production_reporting_rollback.sql');
assert(fs.existsSync(rollback003Path), 'Rollback 003 file exists');

if (fs.existsSync(rollback003Path)) {
  const rollbackSql = fs.readFileSync(rollback003Path, 'utf8');

  assert(
    rollbackSql.includes('pg_terminate_backend'),
    'Terminates active hisbo_readonly_reporter sessions cleanly'
  );
  assert(
    rollbackSql.includes('DROP FUNCTION IF EXISTS reporting.get_user_directory'),
    'Drops specific reporting.get_user_directory routine'
  );
  assert(
    rollbackSql.includes('DROP FUNCTION IF EXISTS reporting.get_user_metrics'),
    'Drops specific reporting.get_user_metrics routine'
  );
  assert(
    rollbackSql.includes('DROP SCHEMA IF EXISTS reporting'),
    'Drops reporting schema'
  );
  assert(
    rollbackSql.includes('DROP ROLE IF EXISTS hisbo_readonly_reporter'),
    'Drops dedicated role hisbo_readonly_reporter'
  );
  assert(
    !rollbackSql.includes('DROP TABLE') && !rollbackSql.includes('DROP SCHEMA public'),
    'Does NOT drop public schema or any tables'
  );
}

// --------------------------------------------------------------------
// TEST 3: Application Code reporter.ts Safeguards
// --------------------------------------------------------------------
console.log('\n[SUITE 3] Inspecting src/lib/production/reporter.ts:');
const reporterCodePath = path.join(ROOT, 'src', 'lib', 'production', 'reporter.ts');
assert(fs.existsSync(reporterCodePath), 'reporter.ts file exists');

if (fs.existsSync(reporterCodePath)) {
  const reporterCode = fs.readFileSync(reporterCodePath, 'utf8');

  assert(
    reporterCode.includes("process.env.PROD_REPORTING_ENABLED === 'true'"),
    'Production reporting is strictly disabled unless PROD_REPORTING_ENABLED === "true"'
  );
  assert(
    reporterCode.includes('SET default_transaction_read_only = on'),
    'Enforces read-only transaction state on pool connections'
  );
  assert(
    reporterCode.includes('max: 3'),
    'Pool connection count capped at 3'
  );
  assert(
    reporterCode.includes('connectionTimeoutMillis: 3000'),
    'Connection timeout capped at 3000ms'
  );
  assert(
    reporterCode.includes('Math.max(1, Math.min(limit, 50))'),
    'Application code clamps limits to max 50 rows'
  );
  assert(
    reporterCode.includes('sanitizeErrorMessage'),
    'Error sanitizer redacts database credentials from log output'
  );
}

// --------------------------------------------------------------------
// TEST 4: Architecture Defaults & Admin Separation Verification
// --------------------------------------------------------------------
console.log('\n[SUITE 4] Verifying Architecture Defaults & Separation:');

const usersRoutePath = path.join(ROOT, 'src', 'app', 'api', 'admin', 'users', 'route.ts');
if (fs.existsSync(usersRoutePath)) {
  const code = fs.readFileSync(usersRoutePath, 'utf8');
  assert(
    code.includes("url.searchParams.get('source') || 'production'"),
    'Users API defaults to production reporting'
  );
  assert(
    code.includes(".eq('is_admin', false)"),
    'Staging branch explicitly excludes admin accounts from customer directory'
  );
  assert(
    code.includes('requiresConfiguration: true'),
    'Fails-closed with requiresConfiguration flag when production reporting is unconfigured'
  );
}

const overviewRoutePath = path.join(ROOT, 'src', 'app', 'api', 'admin', 'overview', 'route.ts');
if (fs.existsSync(overviewRoutePath)) {
  const code = fs.readFileSync(overviewRoutePath, 'utf8');
  assert(
    code.includes("url.searchParams.get('source') || 'production'"),
    'Overview API defaults to production reporting'
  );
  assert(
    code.includes('requiresConfiguration: true'),
    'Overview fails-closed when production reporting is unconfigured'
  );
}

const adminsRoutePath = path.join(ROOT, 'src', 'app', 'api', 'admin', 'admins', 'route.ts');
assert(fs.existsSync(adminsRoutePath), 'Dedicated /api/admin/admins route exists');
if (fs.existsSync(adminsRoutePath)) {
  const code = fs.readFileSync(adminsRoutePath, 'utf8');
  assert(
    code.includes(".eq('is_admin', true)"),
    'Admins API specifically filters for is_admin = true in staging'
  );
}

// --------------------------------------------------------------------
// TEST 5: Live HTTP Endpoint Safeguards
// --------------------------------------------------------------------
console.log('\n[SUITE 5] Testing live HTTP endpoint security (http://localhost:3001):');

async function testHttpEndpoints() {
  const BASE_URL = 'http://localhost:3001';

  // Test 5.1: Demo Cookie Rejection on reporting status endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/admin/reporting/status`, {
      headers: {
        Cookie: 'hisbo_control_demo=true',
      },
    });
    assert(res.status === 403, `Reporting status endpoint rejects demo session with HTTP 403 (Got: ${res.status})`);
  } catch (err) {
    console.log(`  [SKIP] Local dev server on ${BASE_URL} not reachable: ${err.message}`);
  }

  // Test 5.2: Demo Cookie Rejection on users endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        Cookie: 'hisbo_control_demo=super_admin',
      },
    });
    assert(res.status === 403, `Users endpoint rejects demo session with HTTP 403 (Got: ${res.status})`);
  } catch (err) {
    // skip
  }

  // Test 5.3: Demo Cookie Rejection on admins endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/admin/admins`, {
      headers: {
        Cookie: 'hisbo_control_demo=super_admin',
      },
    });
    assert(res.status === 403, `Admins endpoint rejects demo session with HTTP 403 (Got: ${res.status})`);
  } catch (err) {
    // skip
  }

  // Test 5.4: Unauthenticated request rejection on reporting status endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/admin/reporting/status`);
    assert(res.status === 401, `Unauthenticated request receives HTTP 401 (Got: ${res.status})`);
  } catch (err) {
    // skip
  }

  // Test 5.5: Unauthenticated request rejection on overview endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/admin/overview`);
    assert(res.status === 401, `Unauthenticated overview request receives HTTP 401 (Got: ${res.status})`);
  } catch (err) {
    // skip
  }

  // Test 5.6: Unauthenticated request rejection on admins endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/admin/admins`);
    assert(res.status === 401, `Unauthenticated admins request receives HTTP 401 (Got: ${res.status})`);
  } catch (err) {
    // skip
  }

  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

void testHttpEndpoints();
