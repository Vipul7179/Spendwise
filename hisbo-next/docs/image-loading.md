# Image and dashboard loading

## Shared implementation

- `src/components/common/SkeletonImage.tsx`: reusable decode-aware image frame. Uses Next Image by default; `native` keeps externally hosted images on the existing native image path. Existing URLs, srcsets, sizes, lazy/eager loading, priority, alt text and event callbacks are forwarded. Existing image styles/classes size the frame; image fitting remains cover/contain as appropriate.
- `src/lib/image-loading.ts`: load/decode/error lifecycle, cached-image fast path, cancellation on source change/unmount, and explicit same-URL retry. No polling, per-image timers, automatic retries, or fallback network requests.
- `src/components/common/DashboardSkeleton.tsx`: structured placeholders for data/session loading only. Real spending values are not tied to decorative image state.
- `src/app/globals.css`: shared light/dark colors, 1.8-second CSS shimmer, 250ms fade, static error placeholder, reduced-motion overrides, and image-frame sizing.
- `src/app/layout.tsx`: no-JavaScript image visibility fallback.

## Integration files

- `src/components/app/overview/BannerCarousel.tsx`
- `src/components/blog/BlogCard.tsx`
- `src/app/(marketing)/blog/[slug]/page.tsx`
- `src/app/(app)/admin/banners/page.tsx` (retry available on the full-size edit preview)
- `src/components/marketing/Navbar.tsx`
- `src/components/auth/AuthSidebar.tsx`
- `src/components/auth/AuthPromoArtwork.tsx`
- `src/components/app/TopBar.tsx`
- `src/components/app/DesktopSidebar.tsx`
- `src/components/app/MobileDrawer.tsx`
- `src/components/app/AppSplash.tsx`
- `src/components/app/modals/CoffeeModal.tsx`
- `src/components/app/AppLayout.tsx`
- `src/app/(app)/loading.tsx`

Profile avatars currently use initials and financial/category icons use inline SVGs rather than asynchronous images. They do not receive artificial loading delays. Existing dashboard redesign edits were already present when this task began and have been retained.

## Verification

- `npm.cmd test`: 144 passed, including nine image-loading regressions.
- `npm.cmd run lint`: passed without warnings after adding explicit forwarded alt props.
- `npm.cmd run build`: passed, including TypeScript. Existing `turbopack.root` warning remains.
- Isolated headless Chrome with image requests paused: immediate nonblank image placeholders, correct dark/light base colors, 1.8s shimmer, and reduced-motion animation disabled.
- Throttled blog requests (500ms latency, 70KB/s): decoded-image fade used 250ms; thumbnail frame stayed 266 x 166.25 CSS pixels before/after load, with an unchanged URL. Cached reload used the cached fast path.
- Throttled banner requests (500ms latency, 200KB/s): banner frame stayed 746.796875 x 231.984375 CSS pixels before/after load. Financial values remained visible during image loading.
- Forced image failures: neutral fallback displayed, broken image hidden, shimmer stopped, and frame dimensions retained. Explicit retry recovered using the same source.
- Blog and banner layouts checked at 320px, 390px and 768px, plus desktop. No horizontal overflow or runtime exceptions in these checks.

The source tests are in `scripts/test-image-loading.cjs`, registered in `package.json`. Browser checks used isolated synthetic guest storage and the existing local development server. They did not edit account data or exercise an authenticated admin session. API queries, authentication, routing and financial calculations were not changed. No dependencies were added, and nothing was committed, pushed or deployed.
