/**
 * Fail-Closed Staging Project Identity Guard
 *
 * Ensures all real-data administrative routes and queries are strictly
 * locked to the isolated staging Supabase project (klvbtoxyeixxjydnanlz).
 * Halts execution immediately if pointing to any other project (including production).
 */

export const EXPECTED_STAGING_PROJECT_REF = 'klvbtoxyeixxjydnanlz';

export interface StagingCheckResult {
  isStaging: boolean;
  projectRef: string;
  error?: string;
}

export function assertStagingEnvironment(urlOverride?: string): StagingCheckResult {
  const url = urlOverride !== undefined ? urlOverride : (process.env.NEXT_PUBLIC_SUPABASE_URL || '');

  if (!url) {
    return {
      isStaging: false,
      projectRef: '',
      error: 'CRITICAL SAFETY HALT: NEXT_PUBLIC_SUPABASE_URL is not configured.',
    };
  }

  // Extract the project reference from https://<project-ref>.supabase.co
  const match = url.match(/^https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
  const projectRef = match ? match[1].toLowerCase() : '';

  if (projectRef !== EXPECTED_STAGING_PROJECT_REF) {
    return {
      isStaging: false,
      projectRef,
      error: `CRITICAL SAFETY HALT: Admin data routes are strictly restricted to staging project "${EXPECTED_STAGING_PROJECT_REF}". Configured URL references "${projectRef || 'unknown'}". Real data operations aborted.`,
    };
  }

  return {
    isStaging: true,
    projectRef,
  };
}

