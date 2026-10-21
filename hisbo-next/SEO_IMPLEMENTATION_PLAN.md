# Hisbo SEO implementation plan

Date: 21 October 2026. Status: P0 approved and implemented locally; P1 through P3 remain proposed and unapproved. See [P0 implementation results](SEO_P0_IMPLEMENTATION_REPORT.md) for changes and verification. The sections below retain the original implementation plan. Paths below are relative to hisbo-next unless noted. Preserve the existing design, Supabase authentication, guest localStorage behavior, calculations, features, existing article content and slugs. Do not deploy or publish without separate approval.

## P0 — Critical

| Change | Exact files | Expected impact and acceptance |
|---|---|---|
| Safe JSON-LD serialization | New src/lib/seo.ts; src/app/(marketing)/page.tsx; src/app/(marketing)/blog/[slug]/page.tsx | Escape `<` after JSON serialization; preserve valid JSON. A synthetic closing-script payload must stay inside one inert script and parse back correctly |
| Private/account exclusion | src/app/(app)/layout.tsx; src/app/(auth)/layout.tsx; src/app/auth/callback/route.ts; src/app/robots.ts; next.config.mjs if response headers are needed | Add server metadata noindex for app/account routes, callback header where useful. Coordinate robots so bots can observe noindex on safe generic shells. Verify no private data is rendered; retain guest access and client redirects. Existing indexed private URLs may require Search Console removal plus durable exclusion |
| Consistent canonical origin | New src/lib/seo.ts; src/app/layout.tsx; src/app/robots.ts; src/app/sitemap.ts; src/app/(marketing)/page.tsx; src/app/(marketing)/blog/page.tsx; src/app/(marketing)/blog/[slug]/page.tsx | One validated HTTPS production www origin, normalized path joins, encoded slugs; no discrepancy between canonical/OG/schema/sitemap. Confirm intended production environment before changing configuration |
| Restore complete sitemap coverage | src/app/sitemap.ts; src/lib/blog.ts | Dedicated lightweight paginated public-indexable projection, deterministic tie breaker, no 100-record truncation; explicitly handle helper errors. Test >100 records, equal timestamps, noindex, drafts, future posts and network failure. Do not serve silently incomplete success or invent modification dates |

RLS and actual financial authorization require authorized read-only database inspection. If a leak is confirmed, handle it as a separate critical security fix; do not weaken policies or assume metadata solves authorization. Host/HTTPS redirect fixes become P0 only if production testing confirms a conflict; inspect Vercel domain configuration before adding application redirects.

## P1 — High

| Change | Exact files | Expected impact and acceptance |
|---|---|---|
| Crawlable blog pagination | src/app/(marketing)/blog/page.tsx; src/components/blog/BlogPostList.tsx; src/components/blog/BlogToolbar.tsx; src/lib/blog.ts | Support validated page parameters, server-render each page, link next/previous with anchors. Retain optional load more. Give paginated collections their own canonical URLs; keep internal search noindex/follow; deliberately canonicalize or noindex category filters until dedicated useful category pages exist |
| Accurate article identity | src/app/(marketing)/blog/[slug]/page.tsx; src/components/blog/BlogCard.tsx; new src/lib/seo.ts | Omit absent author or use verified editorial Organization; preserve genuine bylines/dates. Keep canonical, OG URL and mainEntityOfPage identical. Validate dates; omit unavailable values rather than fabricate |
| Complete public metadata | src/app/layout.tsx; src/app/(marketing)/page.tsx; src/app/(marketing)/blog/page.tsx; src/app/(marketing)/privacy/page.tsx; src/app/(marketing)/blog/[slug]/page.tsx | Absolute home title, concise child titles, route-appropriate OG/Twitter metadata. Use real existing images or a separately approved social asset; excerpts must describe actual article content |
| Reduce public request overhead | src/app/(marketing)/page.tsx; src/lib/blog.ts; src/middleware.ts; src/lib/supabase/middleware.ts | Parallelize independent home calls and memoize identical detail queries per request. Profile session refresh overhead on public routes before narrowing matcher; never break token refresh. Validate anonymous/signed-in/guest routes |
| Evaluate public caching | src/lib/blog.ts; src/app/(marketing)/blog/layout.tsx; src/app/sitemap.ts | Define publication freshness and error behavior first. Cache only sessionless public queries; support expiry/invalidation so scheduled/draft/noindex changes remain correct. Do not blindly remove force-dynamic or cache authenticated shell responses |

Do not migrate middleware to proxy solely for SEO. Evaluate installed-version guidance and existing auth tests if a migration is independently needed.

## P2 — Medium

| Change | Exact files | Expected impact and acceptance |
|---|---|---|
| Headings, landmarks, breadcrumbs and categories | src/app/(marketing)/page.tsx; src/app/(marketing)/blog/page.tsx; src/app/(marketing)/blog/[slug]/page.tsx; src/components/blog/BlogCard.tsx; src/app/globals.css only as needed | Add home main landmark, blog H1 and suitable card headings, visible Home/Blog/Article breadcrumb plus matching BreadcrumbList, category links to existing filters. Preserve visual layout |
| Editorial content audit | src/lib/markdown.ts if needed; actual published records via authorized read-only review | Inventory duplicate H1s, heading skips, missing alt/description/author, broken links and unsupported claims. Recommend record corrections individually; no bulk content rewrites or slug changes |
| Image delivery | src/components/blog/BlogCard.tsx; src/app/(marketing)/blog/[slug]/page.tsx; src/lib/markdown.ts; next.config.mjs; src/app/globals.css | Retain frame reservation, add intrinsic sizes and responsive delivery for known origins; avoid breaking arbitrary existing cover URLs. Validate any retained sanitizer attributes. Prioritize the measured article LCP cover, lazy-load below-fold images |
| Public JS cost | src/app/(marketing)/blog/layout.tsx; src/components/app/AppLayout.tsx; src/context/AppContext.tsx; src/components/app/modals/ModalHost.tsx | Profile first; defer unused public modal code or introduce a visually identical public shell only if worthwhile. Preserve navigation, theme, account actions and guest state |
| Search and accessibility | src/components/blog/BlogToolbar.tsx; src/components/marketing/Navbar.tsx; src/app/globals.css; src/app/(marketing)/landing-reference.css | Debounce or submit search; test focus visibility, history, keyboard, contrast, 320–430px mobile widths, zoom, tap targets and reduced motion. Scope fixes to observed failures |
| Account titles | src/app/(auth)/layout.tsx; src/app/(auth)/login/page.tsx; new route layouts under signup/forgot-password/reset-password as needed | Distinct labels while keeping all account routes noindex; do not force metadata exports into client form files |

## P3 — Optional

- Add minimal WebSite schema on home in src/app/(marketing)/page.tsx; verify Organization sameAs identity first. Keep the valid WebApplication subtype and only content-supported Offer; no review/rating markup.
- Refine home title/description and existing feature copy naturally around expense tracker, free expense tracker India, monthly expense tracker, budget planner, savings goal tracker and splitting expenses with friends. No keyword repetition or new feature promises; preserve landing design.
- Prepare origin/locale helpers for future internationalization. Do not emit hreflang until real translated equivalents exist.
- Consider custom root src/app/not-found.tsx for useful navigation. Test actual 404 status, including streaming behavior, before treating appearance as an indexing defect.
- Add a reusable social image only if suitable existing assets are insufficient; do not add dependencies for simple metadata helpers.

## Verification after approved implementation

1. Run `npx tsc --noEmit --incremental false`, `npm run lint`, `npm test`, and `npm run build`. Record failures honestly, separating pre-existing failures from regressions. A build can need network access for fonts and public data; it must not be treated as passed if unavailable.
2. Run production server locally and inspect `/`, `/blog`, a verified real `/blog/[slug]`, `/privacy`, `/login`, `/signup`, both password routes, every private app route, callback error path, `/robots.txt`, `/sitemap.xml`, missing article and unknown URL. Use available route/auth/blog scripts after checking their assumptions. Check emitted HTML and headers, not only status 200.
3. Assert title/description/canonical/robots/OG/Twitter and lang/viewport. Confirm article body and initial pagination anchors are present in server HTML. Test page 2+, malformed page values, categories, search, empty results and browser history.
4. Parse sitemap XML, compare with all eligible public records, reject private/draft/future/noindex entries, verify valid absolute URL/date formatting and explicit outage behavior. Confirm updates do not require an unexplained redeploy.
5. Parse every JSON-LD block, test closing-script payload, validate supported schema with Schema Markup Validator and Google Rich Results Test. Assert bylines, images, dates and breadcrumbs match visible content. Valid schema does not guarantee rich-result eligibility.
6. Exercise signed-out, signed-in, guest and password recovery flows; confirm stored guest expenses, budgets, savings and groups remain intact. Verify one user cannot access another user's data using controlled authorized test accounts and actual RLS policies. Never place real financial data into test artifacts.
7. Check internal hrefs, images, external cover-host compatibility, keyboard and responsive UI. Record actual bundle/transfer measurements. Use mobile lab traces for LCP/CLS and interaction diagnostics; lab results alone do not establish field INP/Core Web Vitals.
8. After separately approved deployment, inspect HTTP/HTTPS and www/non-www chains, legacy redirects, trailing slash normalization, canonical destination, headers and bot-visible HTML. Compare deployment root/config with hisbo-next because legacy static files coexist in the parent repository.

## External verification and handoff

Production robots/sitemap were inaccessible through the audit web tool; availability is unresolved, not a confirmed outage. Search Console, Vercel settings, Supabase live policies/records and field performance were not accessible in this audit. Check these through authorized accounts/manual tooling.

After deployment approval, verify a Search Console domain property via DNS, submit `https://www.hisbo.in/sitemap.xml`, and use URL Inspection on home, blog, a new article, an older article beyond the former cap and a noindex example. Check Google's selected canonical, crawl availability and indexing exclusions. Review Core Web Vitals by URL group and PageSpeed Insights/CrUX where traffic is sufficient; compare field data after its reporting window, with no ranking promises.

Create SEO_FINAL_REPORT.md only after implementation: before/after findings, exact changed files, checks and evidence, unresolved issues, Search Console/sitemap steps, field monitoring and future roadmap. No final implementation report is claimed at this audit stage.

## Approval boundary

Only SEO_AUDIT_REPORT.md and SEO_IMPLEMENTATION_PLAN.md are created now. Application edits begin after the user's explicit approval. Publishing/deployment requires separate approval. Suggested first approved batch: P0, then P1 article/discovery/metadata fixes, followed by measured P2 work.

