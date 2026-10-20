# Login/signup restoration and mockup update

The routes were still present. The landing navbar used `sessionUser || isGuest` to decide whether to replace Log in / Sign up with Go to App. It now reserves Go to App for a real account session; guests retain both authentication links. The existing signed-in route redirect and session handling are unchanged.

## Changed files

- `src/components/marketing/Navbar.tsx`: guest/account distinction for header authentication links.
- `src/components/auth/AuthSidebar.tsx`: reference-inspired promotional composition, headline, feature icons and benefits.
- `src/components/auth/AuthPromoArtwork.tsx`: separate editable currency-neutral cards and progress indicators.
- `src/components/auth/AuthPromoIcon.tsx`: reusable SVG icons.
- `public/images/auth/hisbo-companion.png`: transparent character/laptop artwork derived from the supplied reference with imagegen, without embedded text, amounts or currencies.
- `src/app/(auth)/auth-reference.css`: light/dark palette, responsive illustration, form panel, fields and tabs. Desktop uses two columns; mobile keeps a compact illustrated header and prominent form.
- `src/components/auth/LoginForm.tsx`, `src/app/(auth)/signup/page.tsx`: presentation, cross-links, submit arrows and non-enforcing password guidance. Authentication handlers, validation, guest consent and recovery logic retained.
- `scripts/test-phase2.cjs`: regression coverage for guest header links and real-session app access.
- `scripts/verify-auth-parity.mjs`: recognize sidebar class membership when additional presentation classes exist.

## Actual verification

- Chrome through the ChatGPT extension, final local production application on port 3001.
- Read-only localhost preview proxies on 3101/3102 injected light/dark theme attributes for isolated checks; no existing browser settings, stored sessions or application environment/deployment configuration were changed.
- Both routes, both themes, widths 320, 375, 390, 768, 1024 and 1440: 24 browser geometry checks passed. No horizontal page overflow; form fits; illustration loaded; no promotional currency symbols. Results saved in `responsive-checks.json`.
- Viewed desktop and mobile screenshots in light and dark themes and saved representative captures here. These are reference-inspired implementations, not pixel-identical copies.
- Passed browser interactions: landing Log in / Sign up links, auth tabs/cross-links, password visibility on both forms, forgot-password dialog/return, guest confirmation open and Escape close. Guest confirmation was not accepted; no real authentication or recovery request was submitted.
- `npm run lint`: passed. `npx tsc --noEmit`: passed. `npm test`: 46 passed, 0 failed, including the new navbar regression.
- `PORT=3001 node scripts/verify-auth-parity.mjs`: all 13 shared-markup checks passed after correcting its exact-class-string assumption. This script does not establish visual parity.
- Final `npm run build`: passed, 18/18 static pages; existing middleware-convention and relative Turbopack-root warnings remain.

## Limits and preserved state

The mockups show a Google button, but no Google authentication flow was configured in the inspected code, so no nonfunctional button or new provider setup was added. Signed-in account visits still follow the existing authentication redirect. Existing Hisbo logo retained; the provided character is recreated as a clean project asset. No currency conversion, locale selection, translations, Supabase changes, deployment, legacy edits, session clearing or real-user-data mutations. Earlier unrelated working-tree changes, including app UI work and Blog loading/error changes, were preserved.
