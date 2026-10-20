# Public-page screenshot comparison — 20 October 2026

Scope: landing, login, signup and forgot-password only. Supplied screenshots are the visual reference; no claim of pixel-perfect parity. Existing unrelated working-tree changes were preserved.

## Implementation

- `src/app/(marketing)/landing-reference.css`: scoped header, hero, preview, section and card proportions; single-line narrow-phone navigation; comparison-list checkmarks.
- `src/app/(marketing)/page.tsx`: import scoped styles and restore the reference's monthly-report FAQ.
- `src/app/(auth)/auth-reference.css`: centered desktop panels, pale inputs, spacing, type and recovery-dialog geometry. Selectors exclude reset-password.
- `src/app/(auth)/layout.tsx`: import scoped styles.
- `src/components/auth/LoginForm.tsx` and `src/app/(auth)/login/page.tsx`: move existing login implementation into a reusable component without changing its authentication handlers.
- `src/app/(auth)/forgot-password/page.tsx`: render existing recovery form in a native dialog over the shared login view; focus email and support Escape. Existing reset request, error and success handling retained.

## Actual verification

- Real Chrome through the ChatGPT extension; initially also inspected the in-app browser. Chrome's initial request-header policy error cleared on retry.
- Used the local production build on `127.0.0.1:3001`; an ephemeral read-only HTTP preview on port 3101 injects `data-theme="light"` solely for comparison. No theme/session settings were changed in the user's existing app origin. The preview is not application/deployment configuration.
- Desktop: authentication at 1607 × 1032; landing at 1920 px width. Mobile: all four views at 495 px; landing and signup additionally checked at 375 px.
- Viewed screenshots and saved desktop/mobile captures here. Found and fixed wrapped login/signup header labels at 375 px, then reran that browser check. No horizontal page overflow at checked widths.
- Passed in Chrome: landing login link, login/signup tabs, login and signup password visibility, recovery open, email focus, Escape dismissal, Back to login, recovery refresh.
- `npm test`: 45 passed, 0 failed.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed; final production build also completed its TypeScript check.
- Final `npm run build`: passed, 18/18 static pages. Existing middleware-convention and relative Turbopack-root warnings remain.
- Against final local production server: `PORT=3001 node scripts/verify-auth-parity.mjs` passed all 13 shared-markup checks; `PORT=3001 node scripts/test-input-styles.mjs` passed CSS and HTTP checks. These scripts are not visual-parity proof.

## Limits

No login/signup/reset submissions, real-account writes, session clearing, production deployment or legacy-file modifications. No new account was supplied or needed. Blog cards retain live published content, so their titles/images/order can differ from the older screenshot; lazy images outside the viewport may be blank in full-page captures. Supplied mobile landing image is reduced in chat, limiting fine-grained visual comparison. Mobile auth layouts were checked for usability; separate full-resolution mobile auth references were not present in this message.
