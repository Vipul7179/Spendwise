# Hisbo Google authentication implementation

Date: 21 October 2026. Status: implemented locally. No commit, push, merge, deployment, production secret change or Supabase configuration/database/RLS change was performed. Earlier SEO work remains intact.

## Implemented behavior

Login and Signup share a real Continue with Google button with the multicolour Google icon, the existing account palette, visible keyboard focus, 46px minimum height, a loading state and an “or continue with email” divider. Signup now has one shared required Terms and Privacy checkbox directly above Create account. Google signup is enabled after acceptance; the same checkbox belongs to the email form through its form attribute. The duplicate Google notice was removed.

The button uses the existing @supabase/ssr browser client and calls:

```ts
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback?next=/overview`,
  },
});
```

A ref blocks repeated clicks before React rerenders. Email submission and Google submission disable one another while pending. Startup failures restore the button and show safe useful messages; no raw provider errors, authorization codes or tokens are displayed. Browser pageshow resets the pending state after returning via Back.

The callback exchanges the code through the existing SSR server client, which writes session cookies through next/headers. Successful exchange requires an actual session, then redirects to Overview or an approved internal destination. Password-recovery /reset-password remains supported. Cancellation, missing code, failed exchange and thrown network/configuration errors return to Login with known error codes and useful retry guidance. Incoming external/unsupported next targets and arbitrary forwarded-host destinations are rejected. Production redirects use https://www.hisbo.in; loopback requests preserve their validated local host/port, including Next's local internal-host normalization. Existing callback X-Robots-Tag/noindex configuration is retained.

## Files changed by this task

Paths are relative to hisbo-next. The pre-existing working tree already contained the P0 SEO changes; these are not attributed to this auth task.

| File | Change |
|---|---|
| src/components/auth/GoogleAuthButton.tsx (new) | Shared real Google OAuth button, duplicate-click protection, parent loading coordination, safe callback feedback |
| src/lib/google-auth.ts (new) | Maps known callback/startup failures to safe user-facing messages |
| src/components/auth/LoginForm.tsx | Renders Google option and blocks email submission during OAuth; original email/password and data handling preserved |
| src/app/(auth)/signup/page.tsx | Renders Google option and blocks email submission during OAuth; original email signup handling preserved |
| src/app/(auth)/auth-reference.css | Adds only scoped OAuth button, error, notice and divider styles using existing light/dark variables |
| src/app/auth/callback/route.ts | Safe redirect validation, code/session exchange handling, provider cancellation and failure recovery; retains password recovery |
| scripts/test-google-auth.cjs (new) | 24 behavioral/security/regression tests with controlled auth fixtures |
| package.json | Adds Google auth tests to the existing test command; no dependencies changed |
| artifacts/google-auth/preview-themes.cjs (new) | Read-only local theme preview helper for browser QA; no app state/settings changes |
| artifacts/google-auth/responsive-checks.json (new) | Recorded results from 16 Chrome layout checks |
| GOOGLE_AUTH_IMPLEMENTATION_REPORT.md (new) | This implementation/verification/configuration handoff |

No changes to src/lib/seo.ts, sitemap, robots, metadata layouts, middleware, Supabase browser/server client implementations, AppContext, financial calculations, existing state merging, logout, guest storage keys, profiles or RLS were made in this task. No credentials were added to source or reports.

## Account and guest-data safety

- New and returning Google users use the same Supabase OAuth flow. Supabase chooses the authenticated user ID; application code does not generate a replacement ID or insert/upsert a profile during Google authentication.
- No custom matching or linking by email is implemented. Supabase manages its own verified identity linking. Existing confirmed email/password users may be linked to their Google identity under Supabase's rules; different-email accounts are not merged by Hisbo. Verify the returned user ID with a controlled existing account before release.
- The Google button and callback never read, clear, overwrite or upload guest localStorage financial records. Cancellation leaves those records untouched.
- After successful authentication, the existing AppContext bootstrap/sync behavior still applies: it loads the authenticated user's cloud row by user ID and reconciles it with local state using the existing merge logic. OAuth adds no new data migration or account-merging routine. This existing reconciliation is not a byte-for-byte freeze of the active local snapshot after entering the app; it can update local state as normal. Its existing cloud precedence and ID deduplication rules are unchanged.
- Existing profiles, if provisioned by database triggers, remain the responsibility of that deployed configuration. No duplicate client-side profile creation was introduced; deployed trigger behavior was not inspected.
- Existing logout first syncs, then signs out and clears its existing active account/local state according to the unchanged implementation. Failure/retry protection remains tested. The Google button does not alter logout semantics.

## Verification results

| Check | Result |
|---|---|
| npx.cmd tsc --noEmit --incremental false | PASS, exit 0 |
| npm.cmd run lint | PASS, exit 0 |
| npm.cmd test | PASS: 81 tests, zero failures/skips; includes 24 Google auth tests and all previous 57 tests |
| npm.cmd run build | PASS: optimized compilation, TypeScript, prerendering and route output complete |
| git diff --check | PASS; only normal LF/CRLF normalization notices |
| Production HTTP /login and /signup | PASS: status 200, Google button/divider and inherited noindex metadata |
| Production callback cancellation and missing-code requests | PASS: status 307, correct validated loopback host, known login error and existing noindex,nofollow header |
| Chrome layout QA | PASS: both routes × light/dark × widths 320, 375, 768 and 1440 = 16 checks. Button fits viewport, height 46px, email form/divider present, no horizontal page overflow. Mobile light and desktop dark screenshots were visually inspected |
| Browser cancellation feedback | PASS: callback access_denied returns to Login and displays useful cancellation message after hydration |
| Existing password visibility control | PASS in browser: Show password changes to Hide password |
| Existing Guest Mode confirmation | Opened without accepting; no real guest/account data was created. Escape while focus remained on its launcher did not dismiss the existing dialog; navigation dismissed it. GuestEntryButton was not modified |

The final build still reports the existing middleware-to-proxy deprecation and relative turbopack.root warnings; neither was changed.

### Automated authentication coverage

- Login and Signup call Google with the correct provider and origin-based callback.
- Repeated clicks are blocked synchronously; pending email auth disables Google.
- Returned and thrown OAuth startup errors restore the button with safe messages.
- Browser Back/pageshow restores button usability.
- Code exchange invokes the existing SSR cookie adapter and preserves the supplied Supabase session/user fixture; Overview and password recovery destinations work.
- External URLs, protocol-relative targets, backslashes, whitespace/control characters, unsupported auth paths and untrusted forwarded hosts cannot become redirect destinations.
- Cancellation, missing/expired code, thrown exchange errors and an absent session recover to Login without echoing provider text.
- Google initiation cannot write profiles/database data or access/mutate guest financial storage under the test fixture.
- Actual email/password form submission still calls signInWithPassword and preserves the local expense/savings/group snapshot and existing cloud row under a returning-account fixture.
- Existing tests cover session access decisions, read-only public blog access, guest reload/CRUD, budgets/threshold alerts, savings, group settlement, sync failure protection and logout ordering/failure handling.

## What remains a real-account test

The automated fixtures do not prove a completed live Google exchange. No real Google account was selected, credentials entered, account created, provider consent granted, profile/database record mutated or recovery email sent. Outbound Supabase requests from this sandbox are blocked with EACCES, and no authorized test-account credentials were provided.

Port localhost:3000 could not bind here (EACCES). A production server on 127.0.0.1:3188 was used for markup, errors and layout QA; read-only theme preview proxies used 3191/3192. These temporary origins are not substitutes for the configured OAuth redirect allowlist and were not used to complete Google login. Preview helpers and test servers were stopped after checks.

Before release, use an authorized test browser/account on http://localhost:3000 (or the production domain after separately approved deployment):

1. New Google user: Continue with Google from Signup, complete consent, reach Overview; verify one Supabase auth user/profile under the existing provisioner and persist the session after reload.
2. Returning Google user: sign in from Login and confirm the same user ID and existing expenses, budgets, savings and groups.
3. Existing confirmed email/password account with the Google email: inspect Supabase-managed identity linking and confirm the original user ID/data; then test password login again. Different-email identities must stay separate; do not implement email-only account merging to force a match.
4. Start with synthetic guest records, cancel Google and confirm they are unchanged; repeat with successful sign-in and review the existing reconciliation rules. Do not use real financial records for acceptance testing.
5. Cancel at Google, use browser Back, simulate an expired callback, and retry. Confirm the form remains usable and credentials/tokens never appear in error messages.
6. Reload, navigate to a private route, then log out. Confirm server/browser sessions agree, logout succeeds after sync, and signed-out private views remain inaccessible.

## Remaining configuration

No new environment variables or Google SDK dependency are needed. Keep existing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Keep Google secrets in Supabase/Google Cloud, never in browser/source environment variables.

User-provided configuration is sufficient in principle: Supabase Google provider enabled, Site URL https://www.hisbo.in, redirect allowlist https://www.hisbo.in/auth/callback and http://localhost:3000/auth/callback. Verify the full callback with next=/overview is accepted by the deployed allowlist. For local acceptance, open exactly localhost:3000; another hostname/port requires its own deliberately configured redirect entry. No allowlist was changed by this task.

Google Cloud's authorized redirect URI must be the Supabase provider callback shown in the Supabase dashboard (normally https://<project-ref>.supabase.co/auth/v1/callback), while the two Hisbo URLs above belong in Supabase's application redirect allowlist. If the Google consent app is in Testing, use an allowed test user or publish the consent configuration through your normal process. Existing provider configuration was accepted as supplied, not independently changed or verified.

References: [Supabase Google OAuth/PKCE](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).

No commit, push, merge or deployment was performed. SEO P1 remains unstarted.

## Shared consent follow-up

At the user's request, removed the duplicate Google-specific terms notice and moved the existing required checkbox into the signup form, directly above Create account. Both signup methods now use that single acceptance. Login has no new checkbox. The Google button is disabled until acceptance; native email form validation and the existing agreeTerms handler remain active. Removed unused notice styles and the signup-only button prop. Added a behavioral test for the single shared checkbox and both signup paths.

Follow-up verification: TypeScript passed; ESLint passed for the changed components/test; full test suite passed (82/82, including 25 Google auth tests); production build passed; git diff --check passed. No commit or deployment performed.

Consent placement follow-up: positioned the single checkbox directly above Create account as requested. Shared consent handling is retained. TypeScript and all 25 Google authentication tests passed.
