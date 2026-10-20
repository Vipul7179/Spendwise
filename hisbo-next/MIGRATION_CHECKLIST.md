# Hisbo migration parity checklist

Updated 2026-10-20. Repository: `C:\Hisbo\Spendwise`. App: `hisbo-next`. Branch: `migrate/nextjs`.

The source of truth is `../index.html` and its root-level assets. Those files remain read-only. Existing working-tree changes, including banner button styles and Blog loading/error blank lines, are preserved. No production data, RLS/schema, secrets, deployment configuration, cookies or real authentication sessions were changed during verification.

## Status meanings

- **Source compared**: implementation/reference inspected; no end-to-end claim.
- **Fixture tested**: executed against synthetic data, mocked auth/storage/network, or parsed reference CSS. This is not real persistence or browser verification.
- **HTTP tested**: requests to the local production server, including read-only public Supabase data. This does not verify hydration, clicks, Back or visual layout.
- **Browser tested**: real browser interactions executed. None in this phase: browser inventory was empty.
- **Visual verified**: matching-viewport screenshots inspected. None in this phase.
- **Persistence verified**: real create/edit/delete/reload/sync in an isolated non-production backend. None in this phase; no such dataset was provided.
- **Pending**: remaining work with a specific next action below.

## Phase 2 fixes implemented

1. **Private access**: app children are withheld until session/guest resolution. Resolved anonymous private visits open login; guest and signed-in visits continue. Public Blog access is independent. Signed-in login/signup visits return to Overview; password recovery is excluded.
2. **Guest entry**: restored the legacy warning/choice dialog. Landing CTAs no longer rely on the unhandled `?guest=1` parameter. The guest flag is established only after confirmation; returning guests keep their existing data.
3. **Truthful sync**: writes return success/failure; failed writes cannot produce a success toast. Reads must succeed before an uninitialized cloud snapshot can be written. Pending state stays in the existing `spendwise_v1` store; `sw_pending_user` is ownership/retry metadata, not a parallel state store. Writes serialize across provider remounts, pending writes flush on navigation, and failed final sync/sign-out preserves data and the session. Account/drawer UI stays available when sign-out fails.
4. **Reload restoration**: saved empty collections and explicit false settings are preserved. Restoring local state no longer merges default categories/settings back over user choices. Pending full snapshots for the same account preserve local edits/deletions on retry.
5. **Recurring expenses**: bootstrap and newly added recurring items share one transition. Each generated expense evaluates the existing threshold/over-budget rules in legacy order. Dates clamp to shorter months; monthly markers, alerts and expenses persist in the same snapshot. Failed sync/reload does not duplicate that month's entries.
6. **Hero privacy**: restored `hh` fallback/override semantics. Hero toggle changes only `hh`; global toggle changes `hide` and clears the override. All hero amounts use the hero mask, while the remainder of the tracker uses global masking. Amounts do not change.
7. **Blog failures**: category query failure differs from a valid empty category list. Listing/landing render recoverable error/configuration states. Article failures throw a recoverable `BlogDataError`, including metadata generation; only a successful empty query becomes not-found. A Blog-specific not-found view retains the return link. Publication status/date filters, live search and six-post load-more remain intact.
8. **Banner safety**: upload replacement, commit and verify the database row, then clean up the previous object only after checking references. On failed/lost DB responses, read back before removing a new upload. Unknown state retains the object; cleanup failure after a confirmed save produces a warning, not a false failed-save result. Invalid external image protocols are rejected. All verification uses mocked storage/DB services.
9. **Lint compatibility**: replaced removed `next lint` with ESLint CLI and the matching Next.js flat configuration. Added only development dependencies `eslint` and `eslint-config-next`. Fixed reported effect/ref issues without suppressing rules. Cache/guest snapshots use SSR-safe subscriptions; form drafts reconcile changed source props without effect-driven extra renders.

## Inventory and next actions

Every row retains separate visual, functional and data evidence. `Pending` in browser/visual/persistence columns is deliberate.

| Original feature -> Next.js equivalent | Source | Functional / fixture evidence | HTTP evidence | Browser / visual | Persistence | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Landing sections, FAQ, CTAs and journal preview -> marketing page/components | Source compared | Fixture tested: guest consent; Pending: FAQ/other CTAs | HTTP tested | Pending | Pending | Compare desktop/mobile screenshots and click FAQ/CTAs; exercise preview network failure in browser. |
| Login/signup/session return -> auth pages, AuthSessionRedirect | Source compared | Fixture tested: signed-in return, recovery exclusions | HTTP tested: public form markup | Pending | Pending | Isolated sign-in/signup/confirmation and reload; screenshot comparison. No real auth submissions performed. |
| Password reset/recovery -> forgot/reset pages, auth callback | Source compared | Pending | HTTP tested: routes/fields | Pending | Pending | Use non-production recovery links; test expired/invalid links and redirect/session state. |
| Guest warning/onboarding -> GuestEntryButton, NameModal | Source compared | Fixture tested: consent before flag, guest access and saved-state reload | HTTP tested: entry markup | Pending | Pending | Click all guest entries, test cancel/create-account choice and first-name onboarding in browser. |
| Private navigation gate -> AppLayout, appAccess, AppContext | Source compared | Fixture tested: actual shell withholds children while loading/anonymous; guest/signed-in/public Blog distinctions | HTTP tested: anonymous session shell | Pending | Pending | Real browser Back/direct URL/refresh with separate anonymous, guest and authenticated test profiles. |
| Sidebar/header/footer/mobile drawer -> shared app chrome | Source compared | Fixture tested: failed sign-out retains session; Pending: all menu interactions | HTTP tested: public Blog navigation markup | Pending | Pending | Matching viewport screenshots; menu focus/backdrop, links and account actions. |
| Overview totals/date selection/budget progress -> overview page | Source compared | Pending: comprehensive totals/date-selection fixtures | HTTP tested: anonymous access shell only | Pending | Pending | Authorized browser month/day filters; legacy total/comparison fixtures and screenshots. |
| Global and independent hero privacy -> transitions, overview, TopBar | Source compared | Fixture tested: all six hide/hh combinations, toggle/reset, unchanged amounts and guest reload | HTTP tested: access shell only | Pending | Pending | Verify rendered hero vs charts/lists and preference reload in an isolated account. |
| Expense create/sort/delete -> overview, DeleteExpenseModal, context | Source compared | Fixture tested: create/delete and synthetic reload; Pending: all sort/validation boundaries | HTTP tested: access shell only | Pending | Pending | Authorized form/confirmation interaction; high/low/recent sorting; real isolated save/delete/reload. |
| Donut/pie/category bars/daily drill-down -> OverviewCharts | Source compared | Pending: chart interaction/complete totals fixtures | HTTP tested: access shell only | Pending | Pending | Screenshots for empty/populated data; mouse/keyboard/legend/day selection at both viewport sizes. |
| Category CRUD and budget limits -> budgets page/context | Source compared | Fixture tested: duplicate rejection, create/edit/delete, saved empty collections | HTTP tested: access shell only | Pending | Pending | Numeric boundary/step validation; confirm cascaded expense/recurring deletion and isolated reload. |
| Recurring expenses -> automate, applyRecurringExpenses | Source compared | Fixture tested: leap/non-leap February, deduplication, threshold ordering, failed sync/reload/retry | HTTP tested: access shell only | Pending | Pending | Authorized recurring form and alert UI; real isolated monthly snapshot persistence. |
| SMS/CSV import, credit/duplicate skipping, ambiguous dates -> automate | Source compared | Pending: comprehensive parser/import fixtures | HTTP tested: access shell only | Pending | Pending | Build representative synthetic statement fixtures; test date-choice cancel/confirm and import summaries before isolated writes. |
| Savings goals/contributions/milestones -> savings/context | Source compared | Fixture tested: create, 25/50/75/100 milestones, over-target contribution, delete and synthetic reload | HTTP tested: access shell only | Pending | Pending | Original validation/upper-bound fixtures; isolated contribution/reload and mobile screenshots. |
| Group shares/paise allocation/pending dues/net balances -> groups/calculations | Source compared | Fixture tested: direct legacy comparison across 45 combinations | HTTP tested: access shell only | Pending | Pending | Screenshot split preview and all debt/payer selections; validate real isolated group reload. |
| Settlement/member phone/share/reminders -> groups/context | Source compared | Fixture tested: create, share expense, toggle/bulk settle, phone storage, delete and synthetic reload | HTTP tested: access shell only | Pending | Pending | Browser group switching, participant defaults, reminder links/clipboard; isolated settlement reload. |
| Alerts/thresholds/settings/reports -> alerts/context/calculations | Source compared | Fixture tested: recurring/manual thresholds, settings, clear and synthetic reload; shared confirm callbacks | HTTP tested: access shell only | Pending | Pending | Full threshold/month-reset fixtures, report content comparison, email/phone form and confirmation browser checks. |
| Local/cloud merging -> mergeS and restoreState | Source compared | Fixture tested: category remapping, cloud precedence, input immutability, empty defaults, pending deletions | Pending | Pending | Pending | Broader conflict cases, different-account/multiple-tab scenarios and isolated backend reload tests. |
| Debounced/manual sync/navigation/sign-out -> context, sync serializer | Source compared | Fixture tested: failed reads/writes, retries, order, unmount flush, failed/successful sign-out | Pending | Pending | Pending | Browser delayed requests/unload/reconnect/account switching; isolated real sync. Concurrent edits on multiple devices need explicit conflict tests. |
| Public Blog routes/legacy hashes -> Blog layout, LegacyHashHandler | Source compared | Fixture tested: aliases, trailing slash, encoded slugs, hash-change cleanup and actual shell policy | HTTP tested | Pending | Pending | Click header/footer/mobile links; browser Back/forward, refresh and direct URLs in all three auth modes. |
| Blog listing/categories/date/status visibility -> blog helpers/index | Source compared | Fixture tested: empty vs failed categories, publication constraints | HTTP tested | Pending | Pending | Browser category/error retry; isolated scheduled/draft publication visibility. |
| Blog live search/six-post load-more -> BlogToolbar/BlogPostList | Source compared | Fixture tested: typed search/history props, appending, filters, duplicate-click guard and retry offsets | HTTP tested: current public listing/search | Pending | Pending | Browser caret/focus/history checks; >6 isolated published fixtures for real pagination. Live public data currently contains three articles. |
| Article content/metadata/related/not-found -> Blog article/helpers | Source compared | Fixture tested: network error differs from absence; page/metadata never call notFound on network failure | HTTP tested: three public articles | Pending | Pending | Browser article/error/related links and sanitized Markdown screenshots; isolate network loss vs unpublished/missing records. |
| Blog loading/empty/config/error/retry -> loading/error/empty components | Source compared | Fixture tested: failure classification; original empty-state copy/illustration retained | HTTP tested: normal/empty-search | Pending | Pending | Browser network/config failure and retry; capture loading/error/empty screenshots. |
| Banner carousel/admin/upload/replace/delete -> BannerCarousel, banners helper/admin | Source compared | Fixture tested: replacement order, DB/upload/read-back/delete failures, ambiguous commits, external URL and shared-object cleanup | HTTP tested: admin access shell only | Pending | Pending | Use isolated storage bucket/table records for upload/replace/toggle/delete/reload, plus carousel controls and mobile screenshots. |
| Quick add/name/account/coffee/confirmations -> modal components/shared CSS | Source compared | Fixture tested: shared confirm/cancel/Escape/backdrop, account sync outcomes; Pending: every modal form | HTTP tested: access shell only | Pending | Pending | Keyboard/focus/Enter/loading states, small-height overflow and long action labels at desktop/mobile sizes. |
| Light/dark/auto/white inputs/number spinners -> globals.css/theme actions | Source compared | Fixture tested: selected legacy CSS and spinner rules; numeric types/handlers retained | HTTP tested: CSS/auth markup | Pending | Pending | Chrome/Firefox/WebKit screenshots for light/dark/auto; ArrowUp/ArrowDown, step/min/max and legitimate icons. |
| Support/social/privacy/coffee/UPI -> footers/CoffeeModal/privacy | Source compared | Pending: clipboard/external app interactions | HTTP tested: privacy route and link markup | Pending | Pending | Test clipboard fallback, mailto/UPI and QR readability without sending messages or making payments. |
| PWA manifest/icons/service worker -> public assets | Source compared | Pending: offline worker deliberately not added | HTTP tested: manifest/assets via build | Pending | Pending | Verify a Next-compatible worker in an isolated browser before implementation; details below. |

## PWA review: deferred implementation

The legacy worker caches navigations and arbitrary same-origin GET responses and falls back to cached legacy HTML. Copying it could serve stale login/private HTML or RSC responses after account/navigation changes. The Next app currently ships its manifest/icons but does not register an offline worker.

Next action: in an isolated browser/profile, implement and test explicit static-asset allowlisting, versioned chunk handling, network-only auth/Supabase/RSC traffic, and a deliberate offline navigation policy. Test online/offline reload, deployment version changes, account switching, session expiry, and recovery before enabling registration. No existing worker/cache/session was cleared or modified in this phase. Full offline tracker parity remains Pending.

## Changed/added in Phase 2

Earlier working-tree changes remain present; this list identifies the Phase 2 implementation areas.

- Access/auth/guest: `src/lib/auth-access.ts`, `src/components/app/AppLayout.tsx`, `src/components/auth/{AuthSessionRedirect,GuestEntryButton}.tsx`, `src/app/(auth)/{layout,login/page,signup/page}.tsx`, marketing `page.tsx`.
- State/persistence/privacy: `src/context/AppContext.tsx`, `src/lib/state/{sync,transitions,merge}.ts`, overview `page.tsx`, `AccountModal.tsx`, `MobileDrawer.tsx`.
- Banner safety: `src/types/banner.ts`, `src/lib/banners.ts`, admin banners `page.tsx`; existing banner button inline customizations retained.
- Blog failures: `src/lib/blog.ts`, Blog index, marketing journal preview, `src/app/(marketing)/blog/not-found.tsx`.
- Hook/lint fixes: `BlogToolbar.tsx`, `Navbar.tsx`, `BannerCarousel.tsx`, alerts/groups/admin pages; shared guest-warning styles in `globals.css`.
- Verification/tooling: `package.json`, `package-lock.json`, `eslint.config.mjs`, `scripts/helpers/source-runtime.cjs`, `scripts/test-{phase2,banner-safety,blog-errors}.cjs`, existing Blog regression mocks, input/Blog HTTP scripts, this checklist.

## Current verification log

- `npm.cmd test`: **44 passed, 0 failed**. Synthetic auth/storage/network and selected source/CSS comparisons; no real records mutated.
- `npx.cmd tsc --noEmit --incremental false`: **passed**.
- `npm.cmd run lint`: **passed** using ESLint 10 and the Next.js 16.4.2 configuration; no rule suppressions added.
- Final production build: running; result recorded before delivery.
- Final production HTTP checks: pending build completion.
- `npm.cmd audit --omit=dev --json`: **passed**, zero production vulnerabilities reported.
- Full npm audit: **five high-severity development dependency advisories** in `eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces` (GHSA-vfj7-8cjw-p6xm). npm recommends an incompatible Next lint-config downgrade. No forced downgrade applied. Next action: move to a compatible patched dependency tree when available and rerun audit/lint; these packages are development tooling, not production application dependencies.
- Browser inventory: no browsers/apps connected. No Browser tested, Visual verified or Persistence verified status is claimed.
- Earlier phase results (20 fixtures, 17 HTTP routes, public Blog reads and input/auth markup checks) remain historical evidence; final results below supersede their run counts.

The migration is not complete. Live persistence and visual parity require the isolated backend/browser checks listed above; a passing build or mocked reload alone does not establish either.
