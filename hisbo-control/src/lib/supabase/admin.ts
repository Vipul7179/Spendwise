import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { assertStagingEnvironment } from '@/lib/auth/staging-guard';

let adminClient: SupabaseClient | null = null;

/**
 * Creates or returns the privileged Supabase Service Role client for staging.
 * Strictly server-side only. Never expose to client bundles.
 *
 * Enforces fail-closed validation that the target project is klvbtoxyeixxjydnanlz.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    throw new Error('FATAL: Attempted to invoke getSupabaseAdminClient() on client-side');
  }

  // Requirement 6: Staging project identity verification
  const stagingCheck = assertStagingEnvironment();
  if (!stagingCheck.isStaging) {
    throw new Error(stagingCheck.error);
  }

  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

/**
 * Clears the cached client instance (useful for testing or env changes).
 */
export function resetSupabaseAdminClient(): void {
  adminClient = null;
}
