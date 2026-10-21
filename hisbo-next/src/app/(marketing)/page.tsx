import { canonicalUrl, SITE_URL, serializeJsonLd } from '@/lib/seo';
import type { Metadata } from 'next';
import './landing-reference.css';
import Link from 'next/link';
import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import InteractivePreview from '@/components/marketing/InteractivePreview';
import GuestEntryButton from '@/components/auth/GuestEntryButton';
import BlogCard from '@/components/blog/BlogCard';
import BlogEmptyState from '@/components/blog/BlogEmptyState';
import { getPublishedBlogPosts, getBlogCategoriesResult } from '@/lib/blog';

// Fetch the journal at request time so a build-time outage is never baked into home.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Hisbo – Free Expense Tracker & Budget Planner' },
  description: 'Track daily expenses, manage budgets, set savings goals and split bills with friends. Hisbo makes personal finance simple and free.',
  alternates: {
    canonical: canonicalUrl('/'),
  },
  openGraph: {
    title: 'Hisbo – Free Expense Tracker & Budget Planner',
    description: 'Track daily expenses, manage budgets, set savings goals and split bills with friends. Hisbo makes personal finance simple and free.',
    url: SITE_URL,
    siteName: 'Hisbo',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Hisbo Personal Finance App',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hisbo – Free Expense Tracker & Budget Planner',
    description: 'Track daily expenses, manage budgets, set savings goals and split bills with friends. Hisbo makes personal finance simple and free.',
    images: ['/icon-512.png'],
  },
};

const FEATURES = [
  {
    title: 'Track every expense',
    desc: 'Log a spend in seconds, sort it into categories and see exactly where your money goes.',
    color: '#0f7a58',
    icon: (
      <>
        <path d="M21.2 15.9A10 10 0 1 1 8 2.8" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </>
    ),
  },
  {
    title: 'Budgets with smart alerts',
    desc: 'Set a monthly limit for each category and get a heads-up at 50%, 80% and 100% of it.',
    color: '#14a37f',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    title: 'Charts you can understand',
    desc: 'Switch between donut, pie, bars and a day-by-day view. Tap a day to see just that day.',
    color: '#e29a00',
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </>
    ),
  },
  {
    title: 'Savings goals',
    desc: 'Set a target, add to it as you go and celebrate every milestone on the way.',
    color: '#e0529c',
    icon: (
      <>
        <path d="m22 7-8.5 8.5-5-5L2 17" />
        <path d="M16 7h6v6" />
      </>
    ),
  },
  {
    title: 'Split bills with friends',
    desc: 'Create a group for your flat or trip, see who owes whom and send reminders on WhatsApp.',
    color: '#2f8cff',
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    title: 'Automate the boring parts',
    desc: 'Add recurring expenses like rent, or paste bank SMS messages to import spending in one go.',
    color: '#8a5cf6',
    icon: <path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  },
  {
    title: 'Private by design',
    desc: 'Your data syncs to your own account, is never sold, and you can hide every amount with one tap.',
    color: '#19b394',
    icon: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
  },
  {
    title: 'Light, dark, any device',
    desc: 'Works on your phone and your computer, in light or dark mode, with a clean modern design.',
    color: '#ff6b5b',
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </>
    ),
  },
];

const FAQS = [
  {
    q: 'What is Hisbo?',
    a: 'Hisbo is a free personal finance tracker. You can log your expenses, set budgets with alerts, track savings goals and split shared bills with friends, all in one place.',
  },
  {
    q: 'Do I need an account to try it?',
    a: 'No. You can try Hisbo as a guest and your data stays on your device. Create a free account when you want your data saved securely and synced across your phone and computer.',
  },
  {
    q: 'What can Hisbo automate?',
    a: 'You can add recurring expenses such as rent or subscriptions, and Hisbo logs them on the day you choose each month. You can also paste bank SMS messages or upload a CSV statement to import spending in one go.',
  },
  {
    q: 'How do budgets and alerts work?',
    a: 'Set a monthly limit for each category. Hisbo alerts you at 50%, 80% and 100% of the limit, and you can send the alert to yourself on WhatsApp or SMS with one tap.',
  },
  {
    q: 'How does splitting bills work?',
    a: 'Create a group for your flat or trip, add a shared expense, and choose who paid and who shares it. Hisbo shows who owes whom, lets you mark payments as received and opens a WhatsApp reminder. It keeps the records but does not move any money.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Your data is stored in your own account over encrypted connections, and each user can only read their own data. It is never sold. You can also hide every amount on screen with one tap. The Terms and Privacy Policy explain the details.',
  },
  {
    q: 'Can I get a monthly report?',
    a: 'Yes. Save your email in the Alerts tab and Hisbo reminds you at the end of the month to send yourself a summary of your spending, budgets and savings.',
  },
  {
    q: 'Does it work on my phone?',
    a: 'Yes. Hisbo works in your browser on phones and computers, in light or dark mode.',
  },
];

export default async function LandingPage() {
  const [{ posts, error: postError }, { categories, error: categoryError }] = await Promise.all([
    getPublishedBlogPosts({ limit: 3 }), getBlogCategoriesResult(),
  ]);
  const blogError = postError || categoryError;
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // JSON-LD structured data for web application and organization
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': canonicalUrl('/#organization'),
        name: 'Hisbo',
        url: SITE_URL,
        logo: canonicalUrl('/logo-mark.webp'),
        sameAs: [
          'https://www.instagram.com/thevipulshow',
          'https://www.linkedin.com/in/vipul-singh-46792a1a4',
        ],
      },
      {
        '@type': 'WebApplication',
        '@id': canonicalUrl('/#webapp'),
        name: 'Hisbo',
        url: SITE_URL,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
        description: 'Personal finance made simple. Track spending, stay on budget, and save more.',
      },
    ],
  };

  return (
    <div className="lp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Navbar />

      {/* Hero Section */}
      <section className="lhr">
        <i className="bl b1" />
        <i className="bl b2" />
        <div className="eb">Personal finance made simple</div>
        <h1>
          Track spending, stay on budget, <span className="gt">save more.</span>
        </h1>
        <p className="sub">
          Hisbo brings your expenses, budgets, savings goals and shared bills into one clear,
          beautiful app.
        </p>

        <div className="lcta" style={{ justifyContent: 'center' }}>
          <Link className="lbtn p big" href="/signup">
            Sign up free
          </Link>
          <GuestEntryButton className="lbtn ol big">
            Try without an account
          </GuestEntryButton>
        </div>

        <div className="ltrust" style={{ justifyContent: 'center' }}>
          <span>&#10003; Free to start</span>
          <span>&#10003; Syncs across devices</span>
          <span>&#10003; Your data is never sold</span>
        </div>

        <p className="gnote">
          No account needed to try it. In guest mode your data stays only on your device.
        </p>

        <InteractivePreview />
      </section>

      {/* Features Section */}
      <section className="lsec" id="features">
        <h2>Everything you need, nothing you don&apos;t</h2>
        <p>Simple tools that make managing money feel easy.</p>
        <div className="fg">
          {FEATURES.map((f) => (
            <div key={f.title} className="fcard">
              <div
                className="fic"
                style={{
                  background: `color-mix(in srgb, ${f.color} 14%, transparent)`,
                  color: f.color,
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {f.icon}
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works Section */}
      <section className="lsec" id="how">
        <h2>Up and running in three steps</h2>
        <p>No setup headaches. Start tracking in under two minutes.</p>
        <div className="steps">
          {[
            {
              title: 'Create your account',
              desc: 'Sign up free in seconds, or try Hisbo without an account first.',
            },
            {
              title: 'Add your spending',
              desc: 'Log expenses, set category budgets and create a savings goal.',
            },
            {
              title: 'Watch it all add up',
              desc: 'See charts, get alerts and keep your friends square on shared bills.',
            },
          ].map((s, i) => (
            <div key={s.title} className="stp">
              <b className="n">{i + 1}</b>
              <h3 style={{ margin: '0 0 4px' }}>{s.title}</h3>
              <p style={{ margin: 0, color: 'var(--mut)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Guest vs Account Section */}
      <section className="lsec" id="guest">
        <h2>Try Hisbo without an account</h2>
        <p>Start right away, and create an account whenever you are ready.</p>
        <div className="gcmp">
          <div className="gc">
            <h3>Without an account</h3>
            <ul>
              <li className="y">Start instantly, nothing to sign up for</li>
              <li className="y">All features work on your device</li>
              <li className="n">Your data is saved only in this browser on this device</li>
              <li className="n">It will not appear in another browser or on another device</li>
            </ul>
            <GuestEntryButton className="lbtn ol">
              Continue without an account
            </GuestEntryButton>
          </div>

          <div className="gc hl">
            <h3>With a free account</h3>
            <ul>
              <li className="y">Data saved securely to your account</li>
              <li className="y">Syncs across your phone and computer</li>
              <li className="y">Log in from any browser or device</li>
              <li className="y">Your data is never sold</li>
            </ul>
            <Link className="lbtn p" href="/signup">
              Sign up free
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="lsec" id="faq">
        <h2>Frequently asked questions</h2>
        <p>Quick answers about how Hisbo works.</p>
        <div className="faq">
          {FAQS.map((q) => (
            <details key={q.q}>
              <summary>
                {q.q}
                <span className="pl">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <div className="ans">{q.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Journal / From the blog Section */}
      <section className="lsec journal" id="journal">
        <div className="journal-head">
          <div>
            <span className="journal-kicker">From the blog</span>
            <h2>
              Guides &amp; tips for <span>your money life</span>
            </h2>
            <p>
              Practical advice to help you build better money habits and feel more confident with
              your finances.
            </p>
          </div>
          {posts.length > 0 && (
            <Link className="journal-link" href="/blog">
              View all articles <span aria-hidden="true">&rarr;</span>
            </Link>
          )}
        </div>

        {blogError ? (
          <BlogEmptyState kind={blogError === 'config' ? 'config' : 'error'} compact />
        ) : posts.length > 0 ? (
          <div className="journal-grid">
            {posts.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                category={categoryMap[post.category_id || '']}
                compact={true}
              />
            ))}
          </div>
        ) : (
          <BlogEmptyState kind="empty" compact={true} />
        )}
      </section>

      {/* Final CTA Section */}
      <section className="lfin">
        <i className="bl b1" />
        <div style={{ position: 'relative' }}>
          <h2>Ready to take control of your money?</h2>
          <p>Join Hisbo for free and make every rupee count.</p>
          <div className="lcta" style={{ justifyContent: 'center' }}>
            <Link className="lbtn w" href="/signup">
              Sign up free
            </Link>
            <Link className="lbtn o" href="/login">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

