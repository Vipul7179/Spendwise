# Hisbo fixes — verification report

Date: October 21, 2026

## Results by issue

| Issue | Finding and change | Verification |
| --- | --- | --- |
| 1. Returning sessions | The landing route did not redirect authenticated visitors. The server proxy now validates persisted Supabase sessions with `getClaims`, refreshes when needed, preserves refreshed cookies on redirects, and routes `/`, `/login`, and `/signup` to `/overview` before rendering. Anonymous requests skip auth validation. Existing SSR persistent-cookie settings and expiration rules remain in use. Guest access remains separate. Removed the redundant mounted client redirect. | Regression fixtures cover valid/expired sessions, redirect destinations, cookie rotation, anonymous requests, and password-recovery routes. A real account/browser-restart test remains outstanding. |
| 2. Google signup | The checkbox dependency was already absent in this checkout; retained and tested that behavior. Email consent is still explicit and required for email signup. No consent is fabricated. Fixed OAuth callback origin handling for exact Vercel deployment hosts supplied by trusted environment variables, so a preview keeps its own PKCE verifier cookie. | Chrome showed Google enabled with blank fields and unchecked consent. OAuth unit tests cover duplicate clicks, failure recovery, localhost, production, preview callback origins, and unsafe destinations. Live Google and email authentication were not performed. |
| 3. Policy Back | The policy link always went home. Added history-aware Back with a safe home fallback, a separate-tab signup return that preserves the original form, and a `/terms` alias for the existing combined policy document. Guarded duplicate Back clicks and disabled-storage cases. | Chrome: entered a test name, opened policy, clicked Back, and confirmed the original signup form retained the name. Fixtures cover internal history, same-origin referrer, direct entry, external referrer, and signup policy tabs. |
| 4. Navigation | Auth validation ran before every route, client auth checks were duplicated, and successful email auth performed both push and refresh. Anonymous proxy work is now skipped, persisted sessions use claim validation, redirects are consolidated, and landing blog requests run concurrently. Added synchronous email submission guards, inline pending feedback, and auth/app route loading states. | First-click Login navigation and pending feedback checked in Chrome. Duplicate email/OAuth/Back actions covered by tests. Local timings recorded below. |
| 5. Splash | Existing splash appeared before auth resolved and used an artificial 220 ms dismissal delay. It now starts after email authentication succeeds, or after the app resolves an authenticated user, and remains only while initialization is pending. Uses the existing Hisbo asset, green background, message, and subtle animation with reduced-motion support. | Production build and auth submission fixtures pass. Existing cloud-sync failure recovery tests pass. Live post-auth splash and Google callback visual tests require a test account. |
| 6. Blog | All five current articles already loaded in this checkout once network access was available; the reported production-wide article crash could not be reproduced. Added resilience so optional category lookup failure cannot crash a valid article. Fixed missing numbered pagination/count UI, unstable ordering for equal publication dates, and PostgREST `PGRST103` range errors on out-of-range pages. Removed streaming loading boundaries above blog status decisions so missing articles return real HTTP 404 and overflow pages return HTTP 307. Blog links provide pending feedback. | All five public articles opened twice in development and production-mode HTTP checks. Filters/search passed. Final production checks verified HTTP 404 for an unknown slug and HTTP 307 for `/blog?page=999`. Multi-page fixtures cover totals, preserved filters, offsets, and count recovery. Only five live posts exist, so live Next/Previous across multiple populated pages could not be exercised. |

## Checks

- `npx.cmd tsc --noEmit`: passed; final `next build` also completed its TypeScript check.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: 103 passed, 0 failed. Includes existing guest, financial-state, cloud-sync, banner, SEO, sitemap, and authentication regressions.
- `npm.cmd run build`: passed with Next.js 16.4.2. Migrated the entry point from middleware to proxy.
- Development HTTP checks: five published articles, repeated direct requests, listing, category/search filters.
- Final production-mode HTTP checks: same public routes, published counts, invalid-slug HTTP 404, and overflow HTTP 307.
- Chrome: signup Google availability, signup policy return with preserved form state, first-click login navigation with feedback, responsive signup/blog accessibility layouts, article-card navigation to rendered article content.

The first sandboxed blog run could not reach Supabase (`EACCES`). Verification was rerun with approved network access. No accounts, blog content, or financial records were created or edited during verification.

## Navigation measurements

`scripts/measure-navigation.mjs` measures complete HTTP responses, not click-to-paint latency. Initial development warm responses were login 185 ms, signup 132 ms, privacy 159 ms. A later development run measured 257/213/227 ms respectively; these noisy development results do not establish a speedup. A production warm sample after changes measured login 15 ms, signup 12 ms, privacy 8 ms, example article 859 ms, and blog listing 766 ms. Development and production values are not directly comparable. The fixes remove redundant work, but no controlled authenticated before/after timing was possible without an account.

## Files changed

Paths below are relative to `hisbo-next`.

- Sessions: `src/proxy.ts` (renamed from `src/middleware.ts`), `src/lib/supabase/middleware.ts`, `src/app/(auth)/layout.tsx`.
- Auth, preview callback, splash: `src/components/auth/LoginForm.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/auth/callback/route.ts`, `src/components/app/AppLayout.tsx`, `src/components/app/AppSplash.tsx`, `src/app/globals.css`.
- Navigation/policy: `src/components/common/NavigationFeedback.tsx`, `src/components/common/PolicyBackButton.tsx`, `src/components/auth/AuthTabs.tsx`, `src/components/marketing/Navbar.tsx`, `src/app/layout.tsx`, `src/app/(auth)/loading.tsx`, `src/app/(app)/loading.tsx`, `src/app/(marketing)/privacy/page.tsx`, `src/app/(marketing)/terms/page.tsx`.
- Blog/landing: `src/lib/blog.ts`, `src/app/(marketing)/blog/page.tsx`, `src/app/(marketing)/blog/[slug]/page.tsx`, `src/components/blog/BlogCard.tsx`, `src/app/(marketing)/page.tsx`; removed `src/app/(marketing)/blog/loading.tsx`.
- Verification: `package.json`, `scripts/test-google-auth.cjs`, `scripts/test-ux-fixes.cjs`, `scripts/verify-blog.mjs`, `scripts/measure-navigation.mjs`, this report.

## Remaining verification and repository state

Production runtime logs were not connected, so the original deployed article failure cannot be attributed to a confirmed root cause. Local and production-mode article rendering both pass. Real email login, Google login, email-confirmation signup, browser restart with a valid session, and live Vercel preview OAuth still need a test account/deployment verification. Analytics integration, content, images, canonical generation, JSON-LD serialization, and sitemap implementation were retained; analytics delivery was not measured.

I did not run commit, push, merge, or deploy commands. During verification an external process advanced HEAD to `db83b9c` (`fixed signup,backbutton,and oithers fixes`), containing the implementation changes. That commit was left intact. Final verification-script refinements and this report remain available for review.

Implementation references: [Supabase SSR session guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Next.js link pending feedback](https://nextjs.org/docs/app/api-reference/functions/use-link-status). Installed Next.js documentation was also consulted.
