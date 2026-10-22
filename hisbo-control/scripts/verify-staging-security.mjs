// ====================================================================
// Hisbo Control — Automated Staging Security Verification Harness
// Tests Migration 002 against an isolated Supabase staging environment
// with real authenticated HTTP REST API requests.
// ====================================================================
// Usage:
//   node scripts/verify-staging-security.mjs
//
// Required Environment Variables (or set in .env.staging):
//   STAGING_SUPABASE_URL=https://<your-staging-project>.supabase.co
//   STAGING_SUPABASE_ANON_KEY=<your-staging-anon-key>
//   STAGING_SUPABASE_SERVICE_ROLE_KEY=<your-staging-service-role-key> (for Test 7)
// ====================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL;
const ANON_KEY = process.env.STAGING_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('\n❌ ERROR: Missing STAGING_SUPABASE_URL or STAGING_SUPABASE_ANON_KEY.');
  console.error('Please configure your isolated staging project credentials before running this test.\n');
  process.exit(1);
}

// Safety Check: Guarantee this script NEVER runs against production
if (SUPABASE_URL.includes('omnhxlqykmtzxdagppcl')) {
  console.error('\n🚨 FATAL SAFETY ABORT: Production database detected in test configuration!');
  console.error('This script must ONLY be executed against an isolated staging project.\n');
  process.exit(1);
}

const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
const supabaseAdmin = SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

const testResults = [];

function recordTest(testNumber, description, passed, details) {
  testResults.push({
    testNumber,
    description,
    status: passed ? 'PASS' : 'FAIL',
    details,
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test ${testNumber}: ${description}`);
  if (!passed) console.error(`       Details: ${details}`);
}

async function runVerification() {
  console.log('\n============================================================');
  console.log(' Hisbo Control: Isolated Staging Security Verification Suite');
  console.log(` Target Staging: ${SUPABASE_URL}`);
  console.log('============================================================\n');

  const testEmail = `sec_test_${Date.now()}@staging.hisbo.internal`;
  const testPassword = `TestPass!_${Date.now()}`;
  let testUser = null;
  let authToken = null;

  try {
    // ----------------------------------------------------------------
    // 1. Account Creation & Signup (Verifies normal signup works)
    // ----------------------------------------------------------------
    console.log('Step 1: Signing up test user via auth.signUp()...');
    const { data: authData, error: signupError } = await supabaseAnon.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: { data: { name: 'Security Test User' } },
    });

    if (signupError || !authData.user) {
      recordTest(1, 'Normal User Signup', false, signupError?.message || 'No user returned');
      return;
    }

    testUser = authData.user;
    authToken = authData.session?.access_token;
    recordTest(1, 'Normal User Signup & Identity Creation', true, `User created: ${testUser.id}`);

    // If email confirmation is enabled on staging, log-in directly with admin if available
    if (!authToken && supabaseAdmin) {
      await supabaseAdmin.auth.admin.updateUserById(testUser.id, { email_confirm: true });
      const { data: loginData } = await supabaseAnon.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      authToken = loginData.session?.access_token;
    }

    if (!authToken) {
      console.warn('⚠️ Note: Staging requires email confirmation. Auto-confirm disabled.');
      recordTest(2, 'Auth Session Token Acquisition', false, 'Could not obtain active session token');
      return;
    }

    recordTest(2, 'Auth Session Token Acquisition', true, 'Session token acquired');

    // ----------------------------------------------------------------
    // 2. Verify Initial is_admin Value is false
    // ----------------------------------------------------------------
    const { data: initialProfile, error: profileFetchErr } = await supabaseAnon
      .from('profiles')
      .select('id, is_admin, name, last_seen')
      .eq('id', testUser.id)
      .single();

    const isInitialAdminFalse = initialProfile?.is_admin === false;
    recordTest(
      3,
      'Initial Profile State: is_admin defaults to false',
      isInitialAdminFalse,
      `is_admin is: ${initialProfile?.is_admin}`
    );

    // ----------------------------------------------------------------
    // 3. Test Legitimate Profile Update (name, last_seen)
    // ----------------------------------------------------------------
    const newTimestamp = new Date().toISOString();
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${testUser.id}`, {
      method: 'PATCH',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        name: 'Updated Legitimate Name',
        last_seen: newTimestamp,
      }),
    });

    const isLegitUpdateOk = updateRes.ok;
    const legitUpdateData = await updateRes.json().catch(() => null);
    recordTest(
      4,
      'Legitimate Profile Update (name, last_seen)',
      isLegitUpdateOk && legitUpdateData?.[0]?.name === 'Updated Legitimate Name',
      `HTTP Status: ${updateRes.status}`
    );

    // ----------------------------------------------------------------
    // 4. Test Malicious UPDATE Attempt Targeting is_admin (MUST FAIL)
    // ----------------------------------------------------------------
    const attackUpdateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${testUser.id}`, {
      method: 'PATCH',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        is_admin: true,
      }),
    });

    const attackBody = await attackUpdateRes.text();
    const isAttackUpdateBlocked =
      attackUpdateRes.status === 403 ||
      attackUpdateRes.status === 401 ||
      attackBody.includes('permission denied') ||
      attackBody.includes('42501');

    // Verify in database that is_admin is STILL false
    const { data: checkProfile } = await supabaseAnon
      .from('profiles')
      .select('is_admin')
      .eq('id', testUser.id)
      .single();

    const isStillNotAdmin = checkProfile?.is_admin === false;

    recordTest(
      5,
      'Malicious REST UPDATE on is_admin is Rejected',
      isAttackUpdateBlocked && isStillNotAdmin,
      `HTTP Status: ${attackUpdateRes.status}, Body: ${attackBody.slice(0, 120)}`
    );

    // ----------------------------------------------------------------
    // 5. Test Malicious INSERT Attempt Targeting is_admin (MUST FAIL)
    // ----------------------------------------------------------------
    const fakeId = '00000000-0000-0000-0000-000000000088';
    const attackInsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: fakeId,
        email: 'attacker@staging.internal',
        name: 'Attacker',
        is_admin: true,
      }),
    });

    const insertBody = await attackInsertRes.text();
    const isInsertBlocked =
      attackInsertRes.status === 403 ||
      attackInsertRes.status === 401 ||
      insertBody.includes('permission denied') ||
      insertBody.includes('42501');

    recordTest(
      6,
      'Malicious REST INSERT on is_admin is Rejected',
      isInsertBlocked,
      `HTTP Status: ${attackInsertRes.status}, Body: ${insertBody.slice(0, 120)}`
    );

    // ----------------------------------------------------------------
    // 6. Test Malicious UPSERT Attempt Targeting is_admin (MUST FAIL)
    // ----------------------------------------------------------------
    const attackUpsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: testUser.id,
        is_admin: true,
      }),
    });

    const upsertBody = await attackUpsertRes.text();
    const isUpsertBlocked =
      attackUpsertRes.status === 403 ||
      attackUpsertRes.status === 401 ||
      upsertBody.includes('permission denied') ||
      upsertBody.includes('42501');

    recordTest(
      7,
      'Malicious REST UPSERT on is_admin is Rejected',
      isUpsertBlocked,
      `HTTP Status: ${attackUpsertRes.status}, Body: ${upsertBody.slice(0, 120)}`
    );

    // ----------------------------------------------------------------
    // 7. Test Authorized Administrative Bootstrap (Service Role / SQL Editor)
    // ----------------------------------------------------------------
    if (supabaseAdmin) {
      const { error: adminUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', testUser.id);

      const { data: updatedProfile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', testUser.id)
        .single();

      const isPrivilegedUpdateAllowed = !adminUpdateErr && updatedProfile?.is_admin === true;
      recordTest(
        8,
        'Authorized Service Role Update on is_admin Succeeds',
        isPrivilegedUpdateAllowed,
        adminUpdateErr ? adminUpdateErr.message : 'Successfully updated is_admin via service_role'
      );
    } else {
      console.log('ℹ️ Skipping Test 8: STAGING_SUPABASE_SERVICE_ROLE_KEY not provided.');
    }
  } catch (err) {
    console.error('Unhandled test exception:', err);
  } finally {
    // Cleanup staging test user
    if (supabaseAdmin && testUser) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.id).catch(() => {});
      console.log('\n🧹 Staging cleanup: Test user deleted.');
    }

    console.log('\n============================================================');
    console.log(' VERIFICATION SUMMARY');
    console.log('============================================================');
    console.table(testResults);
  }
}

runVerification();

