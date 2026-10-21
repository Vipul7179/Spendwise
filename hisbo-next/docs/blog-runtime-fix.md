# Blog article Node runtime fix

The article Server Component imports `src/lib/markdown.ts`. Previously that module imported `isomorphic-dompurify@4.6.0`, whose server implementation loads `jsdom@30.1.3`. That loads `html-encoding-sniffer@7.0.0`, which calls `require('@exodus/bytes/encoding-lite.js')`. `@exodus/bytes@1.16.0` declares `type: module`. A runtime without CommonJS-to-ESM require support throws `ERR_REQUIRE_ESM` during module loading, before the Markdown parsing fallback can run. Every article shares this import, so every article can fail even though the production build succeeds.

The renderer now uses `xss@1.0.16` (`FilterXSS`), a pure JavaScript CommonJS-compatible sanitizer with bundled TypeScript definitions. The article tag/attribute allowlist, Marked/GFM parser, image support, and mobile table wrappers remain. Scripts, styles, executable attributes and unsafe URLs are filtered. Article routes and SEO code are unchanged. The unused DOMPurify dependency/types and the transitive jsdom chain were removed from package.json/package-lock.json through npm. No node_modules source patches, overrides, runtime flags, or Next.js configuration changes are needed for the fix.

Verification on October 21, 2026:

- `npm.cmd run build`: passed, including TypeScript. Existing warning: `turbopack.root` should be absolute.
- `npm.cmd test`: 134 passed, 0 failed. Five new real-parser tests cover CommonJS loading with ESM require support disabled, Markdown/raw HTML formatting and images, table wrappers, unsafe content removal, Unicode, and empty content.
- `npm.cmd audit --omit=dev`: 0 vulnerabilities.
- Production article file trace: no jsdom, html-encoding-sniffer, @exodus/bytes, or isomorphic-dompurify.
- Started the built app with `node --no-experimental-require-module node_modules/next/dist/bin/next start -p 3105` to verify that the fix does not depend on newer Node require(ESM) behavior.
- `node scripts/verify-blog-articles.mjs`: direct and repeated refresh-equivalent HTTP requests returned 200 for all three routes below, using real published Supabase content. Each response contained the article body, formatting, cover image, canonical URL, Open Graph article metadata and BlogPosting JSON-LD. No ERR_REQUIRE_ESM, streamed error fallback, or server errors were observed.
  - `/blog/500-se-investment-shuru-karo`
  - `/blog/salary-aati-hai-kahan-jaati-hai`
  - `/blog/college-students-money-saving-tips-india`

These checks used the local production build, not an updated Vercel deployment. No commit, push, deployment, analytics changes, or authentication changes were made. Vercel verification must follow an approved deployment.

Sanitizer API reference: https://github.com/leizongmin/js-xss#custom-filter-rules
