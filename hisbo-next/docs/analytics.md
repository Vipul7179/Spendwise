# Hisbo GA4 setup and verification

Measurement ID: `G-LCMEK1R5HY`.

The implementation is complete locally. The requested local manual-tracking gate is enabled; explicit visitor consent is still required. Verify GA4 stream settings before release. No production deployment, GA4 account configuration, or Vercel environment change was performed during implementation.

## Enable safely

1. In the Google Analytics account that owns this measurement ID, open **Admin → Data streams → the Hisbo web stream**. Confirm the measurement ID matches exactly.
2. Turn **Enhanced Measurement off entirely**. In particular, automatic page views/history changes, form interactions, outbound link clicks, site search, and downloads must remain off. The app sends its own sanitized page views and explicit feature events. `send_page_view: false` alone does not disable Enhanced Measurement's history events.
3. Leave **Google Signals**, advertising personalization, and automatic user-provided data collection disabled. Check connected Google tag settings too. Do not install an additional GA snippet, GTM tag, Vercel injection, or duplicate event-creation rule for this stream.
4. Set these **build-time** environment variables in the appropriate Vercel deployment environment:

   ```dotenv
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-LCMEK1R5HY
   NEXT_PUBLIC_GA_MANUAL_TRACKING_READY=true
   NEXT_PUBLIC_GA_DEBUG=false
   ```

5. Rebuild/deploy only after approval. Next.js embeds `NEXT_PUBLIC_` values at build time; editing an environment variable alone does not update an existing build. Verify steps 1-3 before release; the requested local gate is enabled.
6. Optionally register event-scoped custom dimensions for `user_mode`, `feature_name`, `action_source`, and `success`. `method` is included on authentication events. Do not register account IDs as custom dimensions or user properties. Mark `sign_up` and, if useful for the product, `guest_signup_completed` as key events. Do not count both as separate registrations in a single conversion total.

`.env.example` and the ignored local `.env.local` contain the supplied measurement ID. The local manual-tracking gate is true as requested. Reject analytics during development to avoid sending developer activity.

## Privacy behavior

- Google script loading and event collection require **Allow analytics**. Unknown/rejected consent sends no Google tag or cookieless consent pings from this integration.
- No analytics popup or automatic consent banner is shown. **Analytics Preferences** is a collapsed, in-flow control within the Privacy Policy, accessible through existing Privacy links. It opens only when the visitor chooses to open it and offers equal Allow/Reject controls. Closing or ignoring it never grants consent. Existing choices are retained. GPC or DNT opt-out overrides Allow. If browser storage is unavailable, the choice works for the current document only.
- No pre-consent actions are replayed. After consent, a bounded in-memory queue retains up to 100 sanitized events while the optional tag loads. A blocker can drop analytics; it must not affect the app.
- Withdrawal disables collection, clears buffered events, resets authenticated identity, removes flow markers, and attempts to remove accessible first-party GA cookies. Already transmitted data is not automatically deleted.
- GA4 handles anonymous browser identification after consent. Guests never receive an invented authenticated ID. Only a validated Supabase UUID is used as the built-in `user_id`; email addresses and other account fields are excluded. Identity is explicitly cleared after successful logout and on cross-tab sign-out.
- Event names and property values are runtime allowlisted. Financial records, amounts, balances, categories, descriptions, merchants, group/member names, phone/email values, passwords, and tokens never enter event payloads.
- Page locations use a fixed Hisbo origin and a route allowlist. Queries, fragments, arbitrary paths, actual document titles, and external referrers are excluded. Article paths are grouped as `/blog/article`; admin/unrecognized routes become `/other`. This intentionally sacrifices per-article and search-term attribution for privacy.
- The privacy policy describes consent, cookies, internal IDs, technical usage data, advertising restrictions, and withdrawal.

## Event definitions

| Events | Successful action boundary |
| --- | --- |
| `page_view` | One consented route visit after identity initialization; repeated effect runs do not duplicate it. Real Back/Forward visits count. Query-only filter changes do not create page views. |
| `feature_opened`, `dashboard_viewed` | Supported route visits; dashboard event requires guest/authenticated mode. Quick Add also emits feature-opened on opening. |
| `guest_mode_started` | Explicit Guest Mode confirmation; reopening existing Guest Mode does not restart it. |
| `guest_session_started` | First consented guest use in a browser tab. This custom event means a tab session, not GA4's own inactivity-based session. |
| `guest_feature_used` | Companion to a successful guest feature action. No financial values are attached. |
| `guest_signup_started` | First consented visit to Signup during the guest signup flow. |
| `sign_up` | Successful email response with a real identity and an account creation timestamp during that request, or a confirmed OAuth return where Supabase reports account creation during the explicitly initiated flow. Repeated email creation responses for the same account are deduplicated for 24 hours; resending confirmation for an older unconfirmed account is not counted as signup. |
| `login` | Successful explicit email login or an explicitly initiated returning-account Google login. Session restoration, token refresh, and tab-focus `SIGNED_IN` events are excluded. |
| `login_failed` | Failed email login, Google startup failure, or a failed/cancelled OAuth return. Only a fixed method and failure flag are sent; never error text. |
| `logout` | Successful sign-out after the existing final-sync check. Failed sync/sign-out does not emit logout. |
| `guest_signup_completed` | A guest authenticates into a newly created account. For email confirmation, a consented, expiring first-party marker matches the newly created internal ID to later successful authentication (24-hour window). Existing-account guest logins do not count as signup conversions. |
| `expense_created`, `expense_updated`, `expense_deleted` | Actual expense transitions after device persistence succeeds. Explicit `quick_add`, `sms_import`, and `csv_import` sources distinguish entry flows. |
| `budget_created`, `budget_updated`, `budget_deleted` | A category gains a positive budget, changes an existing budget, or clears/deletes it. Creating a zero-limit category is not a budget creation. Default/restored categories do not generate events. |
| `savings_goal_created`, `savings_goal_updated`, `savings_goal_completed`, `savings_goal_deleted` | Saved goal changes; completion fires only on crossing the target, not every subsequent contribution. |
| `group_created`, `group_deleted`, `split_expense_created`, `split_expense_deleted` | Saved local group/split-record changes. |
| `split_expense_settled`, `split_expense_reopened` | A member share changes between paid and unpaid. Repeated “settle all” on already settled shares emits nothing. These describe record changes, not money transfers. |
| `onboarding_started`, `onboarding_completed` | First-name onboarding opens and a previously empty name is successfully saved; no name is sent. |
| `recurring_expense_created`, `recurring_expense_deleted` | Saved recurring-rule changes. Bootstrap/automatic recurrence is not presented as a manual expense creation. |
| `theme_changed`, `privacy_changed`, `chart_changed`, `notification_settings_updated`, `alerts_updated`, `sync_completed` | Existing settings, alert-state, and successful sync actions. No selected financial content or contact details are sent. |

Financial-action `success=true` means saved on this device. Cloud sync is asynchronous and separately reported; a later cloud failure does not undo a successfully saved local action. Bootstrap/cloud reads and failed local writes never emit financial-action success events.

Hisbo currently has no account-level **join group** or **invite member** flow, and no expense-edit UI. The central event type supports `group_joined`, `group_member_invited`, and `expense_updated`, but no join/invite events are fabricated from locally entered member names or WhatsApp reminders. `expense_updated` only fires if an actual persisted expense update occurs. Add instrumentation at a real successful join/invitation boundary if those features are introduced. Outbound mail/WhatsApp links are not counted as successfully delivered reports or invitations.

New-account classification is conservative: it compares Supabase's account creation timestamp to the email request or consented OAuth flow start. If newness cannot be established (including clock skew), email signup is not counted and an authenticated OAuth return is recorded as login rather than inventing a signup. OAuth flow markers expire after 30 minutes. This is client-side product analytics, not an authoritative account/audit ledger. GA4 does not guarantee historical anonymous activity is merged with later User-ID events.

## DebugView and Realtime test plan

Use a test browser/profile and synthetic financial records. First complete the stream setup above. For a local or approved preview build, set `NEXT_PUBLIC_GA_DEBUG=true` and the manual-tracking flag true, rebuild, and open the property’s **DebugView**. Restore debug=false for production. Debug mode uses an environment flag rather than a URL parameter.

1. **Anonymous visitor:** Clear this site's storage in the test profile, visit Home, and verify there is no popup, `gtag/js`, or GA `/g/collect` request before consent. Open **Analytics Preferences** within the Privacy Policy, reject, and navigate; collection must remain absent and no consent UI should open automatically. Reopen preferences, allow, and verify one page view for the current page, then one each for Login, Signup, Blog, Back. No queries/fragments should appear in `page_location`; unknown paths and article slugs must be grouped. Query-only search changes must not create extra views.
2. **Guest Mode:** Explicitly confirm Guest Mode. Expect `guest_mode_started` and one `guest_session_started`, then dashboard/feature events. Reload the same tab: no second guest-session event. Check `user_mode=guest` and absence of `user_id`.
3. **Expenses and budgets:** Create/delete a test expense and create/change/clear a budget. Open Quick Add; test successful SMS/CSV imports with synthetic content. Check successful action events and safe action sources. Invalid forms and failed local saves must not emit success. Inspect the actual network payload to ensure no amounts, names, descriptions, category values, or form values appear.
4. **Email login:** Use an existing test account. Expect one `login` with `method=email`, then events with its internal UUID. Invalid credentials produce one `login_failed` with no error text. Refresh/focus the tab: no additional login.
5. **Google login:** Begin from Hisbo and return through the existing callback. A returning test account produces one `login` with `method=google`; a demonstrably new account produces `sign_up`. Cancel once and verify one safe failure. A callback page must never send its code/token/query to GA.
6. **Logout:** Verify successful logout clears `user_id` for subsequent public-page events. Simulate a sync/sign-out failure: no logout event should be emitted. Verify cross-tab sign-out also clears identity and does not create a phantom guest session.
7. **Guest-to-signup:** From a guest tab, visit Signup, create a test email account, and complete confirmation/login. Expect one guest-signup-started, one sign-up, and one guest-signup-completed once authenticated into that account. Repeat with Google signup. Logging a guest into an existing account should produce login but no signup conversion.
8. **Privacy and blockers:** Withdraw consent with events buffered, navigate, and verify collection stops. Test rejection in a second tab, GPC/DNT, and a blocked GA script. Hisbo must remain functional.
9. **Realtime:** With consent granted and debug disabled in a test/approved build, repeat a small set of visits and actions. Check the matching events in Realtime for the same property. Normal report/custom-dimension processing may lag. Do not claim DebugView or Realtime success merely because local tests or `dataLayer` look correct.

## Verification performed on October 21, 2026

- `npm.cmd test`: **129 passed, 0 failed**, including 24 analytics tests.
- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run build`: passed. Existing warning: `turbopack.root` should be absolute.
- GA4 account settings, live collection, DebugView and Realtime were not verified in this change. Confirm stream settings before release.
- No commit, push, deployment, or remote environment changes were performed.

References: [Google consent mode](https://developers.google.com/tag-platform/security/guides/consent), [manual page views and Enhanced Measurement](https://developers.google.com/analytics/devguides/collection/ga4/views), [User-ID configuration](https://developers.google.com/analytics/devguides/collection/ga4/user-id), [parameter scope](https://developers.google.com/tag-platform/gtagjs/reference), and the installed Next.js Script documentation.

## Main implementation files

- `src/lib/analytics.ts`: typed events, payload/route filtering, consent, identity, auth-flow markers, buffering, and page-view deduplication.
- `src/lib/analytics-state.ts`: safe events derived from persisted user-driven state changes.
- `src/components/common/AnalyticsProvider.tsx`: one root Script loader, session observation, and navigation tracking; no popup UI.
- `src/components/common/AnalyticsPreferences.tsx`: collapsed Privacy Policy control. Native details/summary preserves keyboard operation and provides in-flow choices without an overlay.
- `src/app/layout.tsx` and the privacy page: root provider integration and Privacy Policy controls. `src/components/app/AppFooter.tsx` links to these controls.
- Auth forms, Google/guest buttons, AppContext, ModalContext, Quick Add, and Automate: successful-action boundaries and fixed entry-source labels.
- `.env.example`, ignored `.env.local`, `scripts/test-analytics.cjs`, existing regression fixtures, and `package.json`: configuration and verification.

Implementation references: [Google tag privacy controls](https://developers.google.com/tag-platform/security/guides/privacy) and [manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views). Authentication success callbacks deduplicate until sign-out.
