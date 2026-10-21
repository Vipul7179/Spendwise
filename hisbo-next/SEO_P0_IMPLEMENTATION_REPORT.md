# Hisbo P0 implementation results

Date: 21 October 2026. Scope: approved P0 only. Status: implemented locally and ready for review. No commit, merge, publish or deployment was performed. P1 has not started.

## Before and after

| Area | Before | After |
|---|---|---|
| Embedded JSON-LD | Plain JSON.stringify allowed record text containing a closing script tag | Shared serializer escapes every `<` as a literal JSON Unicode escape. Home and article emitters use it; parsed data retains the original values |
| Private/account indexing | App/account layouts lacked noindex; private robots disallows prevented crawlers from observing exclusion metadata | App and account server layouts emit noindex,nofollow; callback responses carry X-Robots-Tag. Robots permits reading safe generic shells; API crawling remains disallowed |
| Canonical identity | Metadata base, sitemap and robots could use an environment origin while OG/schema hardcoded production | Shared production origin https://www.hisbo.in; home, blog, article, privacy, OG/entity URLs and sitemap/robots use it. Article metadata and JSON-LD use the same encoded slug URL |
| Sitemap coverage | Only newest 100 published records requested | Dedicated anonymous narrow query pages by unique ID until an empty page. Drafts, future dates, null publication dates and true noindex are excluded in the query; false and null noindex remain eligible |
| Sitemap errors | Helper errors could return a successful sitemap without articles | Query/configuration errors propagate; dynamic sitemap returns an error rather than successful partial XML. No build-time frozen inventory |
| Modification dates | Home/blog used current time; article fallback could invent current time | Home/blog omit unsupported lastmod. Article dates are validated; valid publication date is a fallback for invalid update date, otherwise omitted. Privacy retains its matching displayed update date |

## Exact file inventory

Paths are relative to `Spendwise/hisbo-next`.

| File | Modification |
|---|---|
| src/lib/seo.ts (new) | Fixed production identity, URL/encoded-slug helpers, safe JSON-LD serialization |
| src/app/layout.tsx | metadataBase uses shared production identity |
| src/app/(marketing)/page.tsx | Canonical/OG/schema URLs use helpers; safe JSON-LD serializer. Visible markup, content and styles unchanged |
| src/app/(marketing)/blog/page.tsx | Canonical and OG URL use helper |
| src/app/(marketing)/blog/[slug]/page.tsx | Shared absolute article canonical/OG/mainEntityOfPage, production publisher URLs, safe serialization. Byline/content behavior left for P1 |
| src/app/(marketing)/privacy/page.tsx | Shared canonical URL |
| src/app/(app)/layout.tsx | Adds server-side noindex,nofollow metadata while preserving existing AppLayout export |
| src/app/(auth)/layout.tsx | Adds noindex,nofollow without changing forms or session redirects |
| next.config.mjs | Adds X-Robots-Tag only for /auth/callback; existing redirects/images untouched. Callback exchange and redirect code itself is unchanged |
| src/app/robots.ts | Allows crawling generic app/account shells so noindex is observable; retains API exclusion and shared sitemap URL |
| src/lib/blog.ts | Adds dedicated getSitemapBlogPosts and projected type. Existing list/detail/related/category helpers unchanged |
| src/app/sitemap.ts | Request-time generation, all-record helper, honest failure propagation, consistent URLs and validated dates |
| .env.example | Removes obsolete NEXT_PUBLIC_SITE_URL example; explains fixed production SEO identity. .env.local was not edited |
| scripts/test-seo-p0.cjs (new) | Ten focused tests for security, URLs, paging/filtering/failure, metadata boundaries and rendered article output |
| scripts/verify-seo-p0.mjs (new) | Repeatable production-server HTTP verification; defaults to localhost:3187, configurable with SEO_TEST_BASE_URL. A database-dependent check explicitly reports an outage rather than claiming successful inventory verification |
| package.json | Adds P0 tests to the existing npm test command; dependencies unchanged |
| SEO_IMPLEMENTATION_PLAN.md | Adds approved P0 completion status and links this report; retains original proposed scope as historical plan |
| SEO_P0_IMPLEMENTATION_REPORT.md (new) | This file: implementation inventory, verification, limits and review handoff |

SEO_AUDIT_REPORT.md was created during the prior audit and is unchanged by this implementation. Both original audit documents were untracked when P0 work began. Generated .next output is local build output, not an application source change.

## Verification results

| Check | Result | Evidence / scope |
|---|---|---|
| npx.cmd tsc --noEmit --incremental false | PASS | Exit 0, no diagnostics |
| npm.cmd run lint | PASS | Exit 0, no diagnostics |
| npm.cmd test | PASS | 57 tests, 57 passed, zero failed/skipped. Includes ten new P0 tests and 47 existing regression tests |
| npm.cmd run build | PASS | Exit 0; optimized compilation, TypeScript and prerendering completed. /sitemap.xml is dynamic in route output |
| node scripts/verify-seo-p0.mjs against production server on 127.0.0.1:3187 | PASS for available checks, with database limitation | Eleven private/account pages returned 200 and noindex,nofollow. Private server HTML showed Checking session rather than financial views. Home/blog/privacy canonicals and public indexability checked; home JSON-LD parsed. Callback returned 307 to existing login error flow with exclusion header. Robots advertised production sitemap |
| Real sitemap failure response | PASS for failure behavior | Supabase fetch failed with environment network EACCES; /sitemap.xml returned explicit HTTP 500 rather than successful partial XML |
| Successful sitemap coverage | PASS with fixtures; live inventory not verified | 245 synthetic source rows, >100 eligible results, same publication dates, 37-row server cap, null/false/true noindex, drafts/future/null publication dates; exact eligible IDs returned once, one fixed cutoff across requests |
| Failure handling fixtures | PASS | First-page and later-page database failures, missing configuration, non-advancing cursor, empty corpus and invalid dates |
| JSON-LD security | PASS | Hostile closing-script text round-trips via JSON.parse without literal `<`; actual article component rendered through React server rendering creates one intact JSON-LD block. Canonical and schema article URL agree for a slug with spaces and slash |
| Existing feature regressions | PASS | Auth access, anonymous/guest/signed-in public blog, password recovery redirect rules, guest persistence, expense/budget threshold logic, savings milestones, group settlement, sync failure/retry and blog paging/error behavior |
| git diff --check | PASS | No whitespace errors; Git prints existing LF/CRLF normalization notices |

PowerShell blocked npm.ps1/npx.ps1 under its execution policy, so the equivalent npm.cmd/npx.cmd launchers were used without changing execution policy.

The initial security regression correctly failed when the replacement string was incorrectly escaped; the serializer was corrected before final checks. The first HTTP checker compared the root canonical using literal trailing-slash text; it was corrected to compare parsed equivalent URLs. Final tests and HTTP checks passed after those corrections.

Build warnings: existing relative turbopack.root is normalized to the project path, and the existing middleware convention is deprecated in favor of proxy. Neither was changed because it is outside P0 and authentication must remain stable.

## Privacy and stability boundaries

No UI styles, layout markup, financial calculations, auth callback logic, Supabase policies, database content, client auth/session providers, guest storage keys or existing blog slugs/content were modified. The new sitemap reads only id, slug and dates through the existing sessionless anonymous client. It never reads expense/user tables or uses a service-role key. Removing private robots disallows does not grant access: crawlers receive the existing generic session-check shell and exclusion metadata. Data authorization still depends on auth and deployed RLS.

The origin is intentionally fixed even on local/preview hosts and ignores any existing NEXT_PUBLIC_SITE_URL value for SEO. This does not change Supabase auth redirect origins or navigation behavior. No host redirects were added without evidence of a production redirect defect.

## Remaining limits and follow-up

- Outbound Supabase networking was blocked in the sandbox (EACCES). Successful live XML, an actual published article fetched through this local server, and comparison against the real publication inventory remain unverified. Synthetic article rendering and successful sitemap generation were tested instead. Re-run the HTTP checker with authorized database connectivity before release.
- No real credentials, account mutations, recovery emails, database writes or RLS changes were used. Actual cross-user RLS verification and full real-account browser flows remain external checks; existing controlled regression tests passed.
- Keyset paging avoids offset shifts and uses a fixed publication cutoff, but multiple HTTP queries are not a transactional database snapshot. Concurrent edits during generation may be reflected on the following request. No persistent cache or database schema change was introduced.
- A single XML sitemap still has the protocol's standard size/URL limits; consider sitemap splitting if the corpus approaches 50,000 total URLs. This change removes the former application-specific 100-post ceiling.
- No deployed headers, Google-selected canonicals, Search Console state, Vercel domain redirects or field Core Web Vitals were verified. No ranking or traffic claim is made.
- P1 remains pending: crawlable blog index pagination, truthful author fallback, richer public metadata and request/caching improvements. P2/P3 also remain pending.

## Release checks after separate approval

Run successful live sitemap/article checks with network access. After separately approved deployment, inspect robots/sitemap and noindex headers, verify a Search Console domain property, submit https://www.hisbo.in/sitemap.xml, and inspect home/blog/new and old articles plus an excluded private shell. Confirm Google's canonical selection. Monitor indexing and Core Web Vitals through Search Console/PageSpeed/CrUX; this P0 batch does not claim measured performance improvements.

Implementation guidance: [Next.js JSON-LD](https://nextjs.org/docs/app/guides/json-ld) recommends escaping embedded untrusted strings; [Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing) explains why crawlers must be able to observe the directive.

Stop point: P0 results are ready for review. Do not begin P1, commit, merge or deploy without the user's approval.
