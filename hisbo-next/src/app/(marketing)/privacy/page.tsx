import { canonicalUrl } from '@/lib/seo';
import type { Metadata } from 'next';
import PolicyBackButton from '@/components/common/PolicyBackButton';
import AnalyticsPreferences from '@/components/common/AnalyticsPreferences';

export const metadata: Metadata = {
  title: 'Terms and Privacy Policy',
  description: 'Hisbo is a personal expense tracker made by Vipul Singh. Read our terms of use and privacy policy.',
  alternates: {
    canonical: canonicalUrl('/privacy'),
  },
};

export default function PrivacyPage() {
  return (
    <main className="privacy-main">
      <PolicyBackButton />

      <div className="card" style={{ marginBottom: '18px' }}>
        <h1>Terms and Privacy Policy</h1>
        <p style={{ color: 'var(--mut)', fontSize: '0.88rem', margin: '4px 0 14px' }}>
          Last updated: October 21, 2026
        </p>
        <p>
          Hisbo is a personal expense tracker made by Vipul Singh. This page explains in plain
          language what we collect, how we use it, and the rules for using the app.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '18px' }}>
        <h2>Privacy Policy</h2>
        <h3>What we collect</h3>
        <ul>
          <li>
            <b>Account details:</b> your name and email address. Your password is handled by our
            sign-in provider and is stored in scrambled form, so we cannot read it.
          </li>
          <li>
            <b>What you add to the app:</b> expenses, categories, budgets, savings goals, recurring
            items, and group names, member names and shared bills. If you choose to save phone
            numbers for reminders, those too.
          </li>
          <li>
            <b>Basic technical data:</b> your last activity time and standard logs kept by our hosting
            providers.
          </li>
        </ul>

        <h3>How we use it</h3>
        <ul>
          <li>To run the app and keep your data in sync across your devices.</li>
          <li>To send you account emails, such as a welcome email and password reset.</li>
          <li>To count overall usage, such as the number of users, so we can improve the app.</li>
        </ul>

        <h3>We never sell your data</h3>
        <p>
          We do not sell your personal data and we do not use it for third-party advertising. We
          share it only with the service providers needed to run Hisbo, and when the law requires
          it.
        </p>

        <h3>Optional usage analytics</h3>
        <p>
          With your permission, we use Google Analytics 4 to understand page visits,
          feature usage, and successful actions such as signing in or adding an expense.
          Analytics is optional and stays off until you choose “Allow analytics.”
          Rejecting analytics does not affect the app. Open “Analytics Preferences” in
          the footer or below to change your choice. We also honor browser Global Privacy Control
          and Do Not Track preferences.
        </p>
        <p>
          When enabled, Google uses an anonymous browser identifier and first-party
          analytics cookies. After you sign in, we may associate subsequent events
          with your internal Hisbo account ID. We clear that identity when you sign out.
          This does not mean all earlier anonymous activity is automatically merged
          with your account. Google processes technical usage information such as
          browser and device characteristics and may derive approximate location.
        </p>
        <p>
          We do not send amounts, balances, categories, merchant names, transaction
          descriptions, group or member names, email addresses, phone numbers,
          passwords, or authentication tokens to analytics. Page queries and fragments
          are excluded, article paths are grouped, and automatic form and link tracking
          are not enabled. Google Signals and advertising personalization are disabled.
          Your consent preference is saved on this browser. Withdrawing consent stops
          future collection and removes accessible Hisbo analytics cookies; it does
          not automatically delete information previously processed by Google.
          See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google’s Privacy Policy</a>.
        </p>
        <AnalyticsPreferences embedded />

        <h3>Where it is stored</h3>
        <p>
          Your data is stored in a database provided by Supabase. The app is hosted on Vercel and
          emails are sent through Resend. Data travels over encrypted connections, and access rules
          ensure each signed-in user can read only their own data.
        </p>

        <h3>Guest mode</h3>
        <p>
          If you use Hisbo without an account, your financial records stay only in your own browser
          on your device and are not sent to us. Optional usage analytics, described above, only
          runs if you allow it.
        </p>

        <h3>Your choices</h3>
        <ul>
          <li>You can edit or delete your entries at any time inside the app.</li>
          <li>
            You can ask us to delete your account and all stored data by contacting the developer
            using the links below.
          </li>
        </ul>

        <h3>Security</h3>
        <p>
          We take reasonable steps to protect your data, but no online service can promise perfect
          security. Please choose a strong password and do not share it.
        </p>

        <h3>Children</h3>
        <p>Hisbo is not meant for children under 18.</p>
      </div>

      <div className="card" style={{ marginBottom: '18px' }}>
        <h2>Terms of Use</h2>
        <ul>
          <li>
            <b>Not financial advice.</b> Hisbo helps you record and understand your spending. It
            does not give financial, tax or investment advice.
          </li>
          <li>
            <b>Check your numbers.</b> Features such as SMS import and automatic categories can make
            mistakes. You are responsible for checking your entries.
          </li>
          <li>
            <b>Shared groups only keep records.</b> Hisbo shows who owes whom but does not move money
            or confirm that a payment happened.
          </li>
          <li>
            <b>Use it fairly.</b> Do not misuse the app, try to break into other people&apos;s
            accounts, or use it for anything unlawful.
          </li>
          <li>
            <b>Your account.</b> Keep your login details safe. You are responsible for activity
            under your account.
          </li>
          <li>
            <b>Changes and availability.</b> The app is provided as is, without a guarantee that it
            will always be available or error free. We may change or stop features, and we may
            update these terms. Continuing to use the app means you accept the updated terms.
          </li>
          <li>
            <b>Liability.</b> To the extent the law allows, we are not responsible for losses that
            result from using the app.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Contact</h2>
        <p>
          Questions or deletion requests? Reach Vipul Singh on{' '}
          <a
            href="https://www.instagram.com/thevipulshow"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>{' '}
          or{' '}
          <a
            href="https://www.linkedin.com/in/vipul-singh-46792a1a4"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          .
        </p>
      </div>
    </main>
  );
}
