# Hisbo SEO audit

Date: 21 October 2026. Scope: `Spendwise/hisbo-next`, with the adjacent blog timestamp migration inspected for context. Audit only; application code, database, configuration, and deployment are unchanged.

## Current architecture and evidence

Next.js App Router with TypeScript; package.json requests Next ^16.4.2 and installed Next reports 16.4.2, React ^19.0.0. Root layout supplies English language, next/font Bricolage Grotesque with swap, responsive viewport, icons, manifest, default title/description, and environment-based metadataBase.

Public routes are `/`, `/blog`, `/blog/[slug]`, and `/privacy`. Account routes are `/login`, `/signup`, `/forgot-password`, `/reset-password`, and `/auth/callback`. Application routes are `/overview`, `/budgets`, `/savings`, `/groups`, `/automate`, `/alerts`, and `/admin/banners`. There are no standalone public feature, author, or category pages. No custom root not-found page or vercel.json was found; framework defaults and hosting settings need runtime verification. No AGENTS.md was found in the workspace search.

Home and blog explicitly use force-dynamic rendering. Blog data is fetched using a sessionless anonymous Supabase client. List, detail, and related queries require published status, non-null publication time, and publication time <= now. Article content is rendered on the server through marked and DOMPurify. The client list receives the initial six records, then fetches more through a button. Blog uses the full client AppLayout and app providers with publicView enabled; this does not turn server article children into client-only article content.

Home has canonical, OG/Twitter metadata, Organization and WebApplication JSON-LD. Blog index has canonical and OG/Twitter text. Articles have record-driven title, description, canonical, robots, social metadata and BlogPosting JSON-LD. Privacy has title, description, canonical. Root has no default social metadata. Private access is handled by client appAccess/session logic; middleware refreshes Supabase identity rather than enforcing route authorization. Guest mode is intentional.

## Confirmed findings

| Issue | Affected File/Route | Severity | SEO Impact | Recommended Fix |
|---|---|---|---|---|
| Database strings inserted into JSON-LD with plain JSON.stringify | src/app/(marketing)/blog/[slug]/page.tsx: script dangerouslySetInnerHTML | Critical | A stored closing script sequence can break out of the JSON-LD script; exploitability depends on content write access | Escape `<` as literal Unicode escape after serialization; use one safe serializer for all JSON-LD |
| No explicit noindex for private and account routes | src/app/(app)/layout.tsx; src/app/(auth)/layout.tsx; src/app/auth/callback/route.ts | High | Private URL shells and account flows lack reliable exclusion directives; robots disallow does not guarantee removal | Add server layout noindex for app/account groups and suitable callback response headers; preserve auth and guest behavior |
| Private robots disallows prevent crawlers reading future noindex | src/app/robots.ts | High | Linked URLs can remain indexed without content even when crawling is blocked | Coordinate crawl policy and noindex; allow bots to read safe generic shells where appropriate, never expose financial data |
| Sitemap capped at newest 100 posts | src/app/sitemap.ts: getPublishedBlogPosts({ limit: 100 }) | High | Older articles beyond the cap are omitted | Page through all eligible records with deterministic ordering; filter noindex before pagination where feasible |
| Sitemap silently accepts data failure | src/app/sitemap.ts and src/lib/blog.ts: error return contract | High | Helper returns error with empty posts, so outer catch does not detect many failures; incomplete sitemap appears successful | Check returned error explicitly and define observable failure/cache policy |
| Article discovery after six posts requires button interaction | src/components/blog/BlogPostList.tsx; src/app/(marketing)/blog/page.tsx | High | Crawlers cannot rely on clicking Load more; sitemap cap compounds older-post discovery risk | Add server-rendered paginated URLs and ordinary anchor links while retaining optional load-more UX |
| Article author invented when field absent; team typed as Person | src/app/(marketing)/blog/[slug]/page.tsx; src/components/blog/BlogCard.tsx | High | Unverified attribution weakens factual integrity for finance content | Omit missing author, or use a verified editorial Organization consistently; never invent credentials |
| Canonical origin differs by configuration path | src/app/layout.tsx; src/app/robots.ts; src/app/sitemap.ts versus home/blog metadata and JSON-LD | High | Environment changes can produce conflicting canonical, OG, sitemap, and entity origins | Centralize validated production origin and consistent encoded article URL construction |
| Homepage title repeats brand through root template | src/app/layout.tsx; src/app/(marketing)/page.tsx | Low | Home title contains Hisbo and inherits `%s · Hisbo`; blog/account labels also repeat branding | Use absolute home title and concise child titles |
| Privacy has no OG/Twitter; blog index social cards lack image | src/app/(marketing)/privacy/page.tsx; src/app/(marketing)/blog/page.tsx | Medium | Incomplete sharing previews; not a direct indexing blocker | Add truthful route metadata and a suitable shared social image |
| Account pages share generic metadata | src/app/(auth)/layout.tsx; login/signup/forgot-password/reset-password pages | Low | Generic previews and duplicate titles; these routes should be noindex | Supply unique route labels using server wrappers/layouts without moving form behavior |
| Missing article breadcrumbs and linked categories | src/app/(marketing)/blog/[slug]/page.tsx; src/components/blog/BlogCard.tsx | Medium | Only back-to-blog link and unlinked category spans; weaker hierarchy/discovery | Add visible breadcrumb navigation and matching BreadcrumbList; link to existing category filter URLs |
| Blog index lacks a primary H1 | src/app/(marketing)/blog/page.tsx; src/components/blog/BlogToolbar.tsx | Medium | Index begins with controls and card H3s, lacking a clear page heading | Add a concise visible H1 and use appropriate card heading level for index context |
| Article body permits extra H1s | src/lib/markdown.ts: allowed heading tags | Medium | Stored content may duplicate the page H1 or skip heading levels | Audit actual records; normalize only with editorial review, retaining existing content/slugs |
| Generic fallback article description | src/app/(marketing)/blog/[slug]/page.tsx: description fallback | Medium | Posts missing SEO description and excerpt share generic snippets | Audit records and use meaningful sanitized content excerpts or editorial descriptions |
| Raw blog images have no responsive optimization | src/components/blog/BlogCard.tsx; src/app/(marketing)/blog/[slug]/page.tsx | Medium | Browser downloads original dynamic covers; potential LCP/bandwidth opportunity | Measure cover sizes, retain reserved layout, add dimensions/sizes and safe responsive delivery for approved hosts |
| Inline article images lose size/loading attributes in sanitizer | src/lib/markdown.ts: ALLOWED_ATTR | Medium | Width/height/loading cannot survive content sanitization; layout shift and eager-load risk | Safely preserve validated dimensions and apply lazy loading to below-fold content images |
| Public blog hydrates full app shell and provider graph | src/app/(marketing)/blog/layout.tsx; src/components/app/AppLayout.tsx; src/context/AppContext.tsx | Medium | App menus, modals, account/state dependencies increase public-route JS work | Measure bundle and hydration cost; defer unused modals and isolate public navigation while preserving appearance |
| Search navigates on each keystroke | src/components/blog/BlogToolbar.tsx: onChange | Medium | Each change triggers dynamic route/database work | Debounce navigation or use submit; keep back/forward behavior and focused input |
| Home awaits blog queries sequentially and all public rendering is dynamic | src/app/(marketing)/page.tsx; src/app/(marketing)/blog/layout.tsx | Medium | Home waits for both independent calls before returning; repeated DB reads and duplicate slug reads are opportunities | Parallelize independent reads; request-memoize detail reads; evaluate bounded public caching with publication correctness |
| Sitemap change times use current time for home/blog | src/app/sitemap.ts | Low | lastmod does not represent meaningful content changes | Use reliable modification sources or omit; validate article dates rather than inventing fallback times |
| Landing has no main landmark | src/app/(marketing)/page.tsx | Medium | Sections live directly under a div around header/footer | Wrap central content in main without visual redesign; verify keyboard navigation |
| Article noindex also disables following | src/app/(marketing)/blog/[slug]/page.tsx: robots | Low | nofollow unnecessarily discourages traversal of related links if only exclusion was intended | Choose follow policy explicitly; keep noindex articles accessible only as intended |

## Metadata and indexing coverage

Home: unique marketing copy, one H1, H2/H3 sections, canonical, OG locale en_IN and image, Twitter image. Title branding needs correction. Blog index: title/description/canonical/social text exist; H1/image and pagination are missing. Article: metadata uses actual seo_title/title and seo_description/excerpt; publication/modification times are taken from records. Canonical slug is encoded in metadata but JSON-LD mainEntityOfPage interpolates the raw slug. Article image may fall back to a generic Unsplash image; social image can fall back to a square icon. These are visual quality opportunities, not evidence of invalid rich results. Privacy: unique title/description/canonical and matching displayed update date; social metadata missing. No hreflang is necessary for one English site; do not fabricate translations.

Drafts and future publications are excluded by all public post queries. noindex articles are excluded from the sitemap but remain in lists/related results, which can be intentional: noindex is not an access control. No private routes are deliberately included in sitemap. Existing `/privacy.html` and `/index.html` redirects are permanent. Trailing slash uses framework default; host and HTTPS canonical redirects are not configured in next.config and could be managed by Vercel. Their absence in source is not proof of broken production redirects. Legacy hashes are migrated client-side by LegacyHashHandler; hash fragments cannot be redirected individually by the server.

## Structured data and editorial integrity

Retain Organization and WebApplication (a SoftwareApplication subtype): free use is supported by visible signup/FAQ copy, so the zero INR Offer is not an invented price on available evidence. Footer links support existence of the social profiles, but personal creator profiles should not automatically be treated as Organization sameAs without confirming identity. Add WebSite as a modest enhancement, with no unsupported SearchAction. Add BreadcrumbList only with matching visible navigation. BlogPosting is appropriate; reuse validated dates, encode URLs consistently, and distinguish a real person from an editorial organization. Never add ratings, credentials or reviews without evidence. Actual record completeness, author identities, article heading hierarchy, link quality and financial accuracy remain unverified; source types cannot prove them for each published article.

## Performance, accessibility, and privacy

Positive: next/font with swap, responsive viewport, next/image for logos, lazy card images, semantic links, labeled blog controls, native FAQ details, mobile CSS, sanitized article HTML. CSS reserves card image height and article hero frame layout; missing HTML dimensions alone does not prove cover-image CLS. No measured LCP, INP, CLS, bundle size or Lighthouse score was obtained. The large auth companion PNG is about 1.73 MB on disk; inspect actual optimized transfer before treating it as a production bottleneck. Global app CSS and full public app shell merit profiling, not automatic redesign. No external analytics/ad script was found in the inspected public page code.

Keyboard focus, contrast in both themes, tap targets, screen-reader structure, mobile overflow and real layout stability require rendered testing. Some global controls remove outlines; verify alternate focus treatment rather than declaring universal keyboard failure. AuthSidebar supplies an H1 while forms use H2; do not add duplicate auth H1s casually.

Public SEO fetches use anonymous credentials, not service-role credentials. Environment values were not printed or copied into reports. .env.example documents a server-only optional service-role key; no active service-role usage was found in application source. User financial data is loaded in AppContext with user_id filtering and localStorage persistence. Neither that client filter nor robots is a database authorization boundary. The adjacent SQL defines a published-post select policy but does not enable RLS in that migration; actual RLS activation, other permissive policies, and per-user financial-table policies must be inspected in Supabase. No data leak is proven by this audit. Do not cache cookie-bearing responses or put account data into metadata, JSON-LD or sitemap.

## Verification completed and limitations

Inspected route/page/layout inventory, metadata, Supabase clients/query predicates, markdown renderer, authentication access and callback, app provider/state references, navigation, public image inventory, styles, package/config files, migration policy, and available verification scripts. Initial git status was clean. Installed Next version was read locally. No production build, test suite, database query, local server or deployment was run during this audit-only phase; no checks are claimed to have passed.

Attempts to read production robots.txt and sitemap.xml through the web tool returned inaccessible-tool results. This does NOT establish that either endpoint is broken. Production HTML, redirect chains, TLS, headers, sitemap freshness, live article counts and Google indexing remain unverified. Existing scripts/verify-routes.mjs checks status and placeholder text, not complete metadata correctness, and assumes a specific article slug. Reuse only with a verified published slug. Existing .next/artifacts are not proof of current build health.

## Quick wins and recommended order

1. Escape JSON-LD and add private/account noindex with coordinated robots policy.
2. Unify canonical origin and eliminate sitemap cap/error swallowing.
3. Add crawlable pagination, truthful author metadata, H1 and breadcrumbs.
4. Complete public social metadata and title treatment.
5. Measure then improve image delivery, request duplication, caching and hydration.
6. Verify production in Search Console and review actual article records/RLS with authorized access.

No blanket index:true is necessary for every public page: indexability is the default, subject to deployed headers and directives. No ranking or traffic improvement is promised.

## Primary references checked

- [Next.js JSON-LD guidance](https://nextjs.org/docs/app/guides/json-ld): escape unsafe embedded strings and validate schema.
- [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing): bots must be able to crawl a page to observe noindex.
