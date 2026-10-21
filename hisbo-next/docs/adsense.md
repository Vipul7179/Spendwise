# AdSense ownership verification

Publisher: `ca-pub-6490828357850980`.

## Current behavior

The root Next.js metadata renders this official ownership marker in production HTML:

```html
<meta name="google-adsense-account" content="ca-pub-6490828357850980">
```

Use **Meta tag** as the verification method in the AdSense Sites/Connect workflow. Google explicitly supports this alternative when the advertising code should not be placed on the homepage: https://support.google.com/adsense/answer/7584263?hl=en

`src/components/blog/AdSenseScript.tsx` contains the official asynchronous script using `next/script`, `crossOrigin="anonymous"`, `strategy="afterInteractive"`, and one stable `hisbo-adsense` ID. It is mounted only by the public blog layout, covering `/blog` and `/blog/...`. There is no root advertising script, duplicate tag, ad unit, Auto Ads activation, or advertising API call.

The loader defaults to **off**. Hisbo currently has analytics-only consent, not advertising consent; selecting Allow analytics must not authorize AdSense. No advertising-consent UI or account-wide AdSense settings were changed. The inert verification meta tag is independent of consent and does not make a Google request. Existing GA4 integration and saved preferences remain unchanged.

## Before showing blog ads in a future change

Connect a proper advertising-specific consent/CMP signal to the loader's `advertisingConsent` prop, honor withdrawal/browser opt-outs, and create manual ad units only in blog components. Keep Auto Ads off unless all non-blog paths are excluded in the AdSense account. No ad-slot ID has been supplied, so no ad unit has been invented or activated.

An already loaded third-party script remains in the browser after a Next.js client navigation; simply unmounting a Script does not unload its library. Before enabling the loader, verify consent revocation and blog-to-app transitions with the chosen CMP and manual placement/account exclusions. The current verification-only configuration never loads it, including after blog navigation.

## Chrome DevTools verification after an approved deployment

1. Open `https://www.hisbo.in/` in an incognito window. Open DevTools > Elements and search for `google-adsense-account`. Confirm exactly one tag with the publisher ID above. View Page Source should also contain it; it is not added only after hydration.
2. In the Console, run:

   ```js
   [...document.querySelectorAll('meta[name="google-adsense-account"]')].map(tag => tag.content)
   ```

   Expected: `["ca-pub-6490828357850980"]`.
3. In Network, filter `adsbygoogle` or `googlesyndication`; reload Home, `/blog`, an article, `/overview`, `/budgets`, `/savings`, and `/login`. **Expect no advertising script requests in this verification-only release**, even when analytics was allowed. Also check:

   ```js
   document.querySelectorAll('script[src*="pagead/js/adsbygoogle.js"]').length
   ```

   Expected: `0` until a separate advertising-consent integration is implemented. There should be no inserted `ins.adsbygoogle` ad slots.
4. Use the existing Privacy Policy analytics controls to confirm that GA4 still follows saved consent; no advertising choice is inferred from them.
5. In AdSense, choose **Meta tag**, confirm publication, and request verification/review. Local builds are not visible to Google's crawler; approval and successful account-side verification cannot be confirmed before deployment.

## Changed files

- `src/app/layout.tsx`: additive root verification metadata only.
- `src/app/(marketing)/blog/layout.tsx`: blog-scoped loader mount; retains the existing AppLayout/provider tree.
- `src/components/blog/AdSenseScript.tsx`: consent-default-off official script loader, blog route guard and browser opt-out guard.
- `scripts/test-seo-p0.cjs`: metadata, scope, script configuration and privacy regressions.
- `docs/adsense.md`: scope, privacy and verification instructions.

TypeScript and 147 automated tests passed. Final lint/build and production-HTML verification results are recorded after completing those checks. No commit, push, deployment or AdSense account changes were performed.
