import { canonicalUrl, SITE_URL, serializeJsonLd } from '@/lib/seo';
import type { Metadata } from 'next';
import './landing-reference.css';
import Link from 'next/link';
import Image from '@/components/common/SkeletonImage';
import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import HeroDeviceMockup from '@/components/marketing/HeroDeviceMockup';
import ExpenseCalculator from '@/components/marketing/ExpenseCalculator';
import TestimonialCarousel from '@/components/marketing/TestimonialCarousel';
import GuestEntryButton from '@/components/auth/GuestEntryButton';
import BlogCard from '@/components/blog/BlogCard';
import BlogEmptyState from '@/components/blog/BlogEmptyState';
import { getPublishedBlogPosts, getBlogCategoriesResult } from '@/lib/blog';

// Fetch the journal at request time so a build-time outage is never baked into home.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Hisbo – Free Expense Tracker & Budget Planner' },
  description:
    'Track daily expenses, manage budgets, set savings goals and split bills with friends. Hisbo makes personal finance simple and free.',
  alternates: {
    canonical: canonicalUrl('/'),
  },
  openGraph: {
    title: 'Hisbo – Free Expense Tracker & Budget Planner',
    description:
      'Track daily expenses, manage budgets, set savings goals and split bills with friends. Hisbo makes personal finance simple and free.',
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
    description:
      'Track daily expenses, manage budgets, set savings goals and split bills with friends. Hisbo makes personal finance simple and free.',
    images: ['/icon-512.png'],
  },
};

const FEATURES = [
  {
    title: 'Track every expense',
    desc: 'Log a spend in seconds, sort it into categories and see exactly where your money goes.',
    color: '#0f7a58',
    bg: 'linear-gradient(135deg, rgba(15, 122, 88, 0.22), rgba(39, 192, 138, 0.12))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    ),
  },
  {
    title: 'Budgets with smart alerts',
    desc: 'Set a monthly limit for each category and get a heads-up at 50%, 80% and 100% of it.',
    color: '#e29a00',
    bg: 'linear-gradient(135deg, rgba(226, 154, 0, 0.22), rgba(245, 179, 1, 0.12))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    title: 'Charts you can understand',
    desc: 'Switch between donut, pie, bars and a day-by-day view. Tap a day to see just that day.',
    color: '#2f8cff',
    bg: 'linear-gradient(135deg, rgba(47, 140, 255, 0.22), rgba(34, 211, 238, 0.12))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: 'Savings goals',
    desc: 'Set a target, add to it as you go and celebrate every milestone on the way.',
    color: '#e0529c',
    bg: 'linear-gradient(135deg, rgba(224, 82, 156, 0.22), rgba(244, 114, 182, 0.12))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    title: 'Split bills with friends',
    desc: 'Create a group for your flat or trip, see who owes whom and send reminders on WhatsApp.',
    color: '#0284c7',
    bg: 'linear-gradient(135deg, rgba(2, 132, 199, 0.22), rgba(56, 189, 248, 0.12))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Automate the boring parts',
    desc: 'Add recurring expenses like rent, subscriptions or EMIs. Hisbo reminds you so nothing is missed.',
    color: '#14a37f',
    bg: 'linear-gradient(135deg, rgba(20, 163, 127, 0.22), rgba(63, 217, 160, 0.12))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: 'Private by design',
    desc: 'Your data syncs to your own account, is never sold, and you can hide every amount with one tap.',
    color: '#0d9488',
    bg: 'linear-gradient(135deg, rgba(13, 148, 136, 0.22), rgba(45, 212, 191, 0.12))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: 'Light, dark, any device',
    desc: 'Works on your phone and your computer, in light or dark mode, with a clean modern design.',
    color: '#f97316',
    bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.22), rgba(251, 146, 60, 0.12))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
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
    getPublishedBlogPosts({ limit: 3 }),
    getBlogCategoriesResult(),
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
        description:
          'Personal finance made simple. Track spending, stay on budget, and save more.',
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
      <section className="lhr" aria-labelledby="hero-title">
        <div className="eb">Personal finance made simple</div>
        <h1 id="hero-title">
          Track spending, stay on budget, <span className="gt">save more.</span>
        </h1>
        <p className="sub">
          Hisbo brings your expenses, budgets, savings goals and shared bills into one clear,
          beautiful app.
        </p>

        <div className="lcta">
          <Link className="lbtn p big" href="/signup">
            <span>Sign up free</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <GuestEntryButton className="lbtn ol big">
            Try without an account
          </GuestEntryButton>
        </div>

        <div className="ltrust">
          <span>&#10003; Free to start</span>
          <span>&#10003; Syncs across devices</span>
          <span>&#10003; Your data is never sold</span>
        </div>

        <p className="gnote">
          No account needed to try it. In guest mode your data stays only on your device.
        </p>

        {/* Hero Realistic Device Composition */}
        <HeroDeviceMockup />
      </section>

      {/* Features Section */}
      <section className="lsec" id="features" aria-labelledby="features-heading">
        <h2 id="features-heading">Everything you need, nothing you don&apos;t</h2>
        <p>Simple tools that make managing money feel easy.</p>
        <div className="fg">
          {FEATURES.map((f) => (
            <div key={f.title} className="fcard">
              <div className="fcard-header-row">
                <div
                  className="fic-3d"
                  style={{
                    background: f.bg,
                    color: f.color,
                  }}
                >
                  {f.icon}
                </div>
                <span className="fcard-arrow" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Expense Calculator */}
      <ExpenseCalculator />

      {/* How it works Section: Cohesive Step Number & Icon Grouping */}
      <section className="lsec" id="how" aria-labelledby="how-heading">
        <h2 id="how-heading">Up and running in three steps</h2>
        <p>No setup headaches. Start tracking in under two minutes.</p>
        <div className="steps-container">
          {[
            {
              step: '1',
              title: 'Create your account',
              desc: 'Sign up in a few seconds, or try Hisbo without an account first.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              ),
            },
            {
              step: '2',
              title: 'Add your spending',
              desc: 'Log expenses, set category budgets and create a savings goal.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
                </svg>
              ),
            },
            {
              step: '3',
              title: 'Watch it all add up',
              desc: 'See charts, get alerts and keep your friends in sync on shared bills.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              ),
            },
          ].map((s) => (
            <div key={s.title} className="step-card">
              {/* Cohesive Header Group: Balanced Step Badge + Progression Arrow + Unified Icon Box */}
              <div className="step-header-row">
                <span className="step-number-badge">{s.step}</span>
                <span className="step-progression-arrow" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
                <div className="step-illustration-box" aria-hidden="true">
                  {s.icon}
                </div>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Guest vs Account Section */}
      <section className="lsec" id="guest" aria-labelledby="guest-heading">
        <h2 id="guest-heading">Try Hisbo without an account</h2>
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
            <span className="gc-pill-badge">Recommended</span>
            <h3>With a free account</h3>
            <ul>
              <li className="y">Data saved securely to your account</li>
              <li className="y">Syncs across your phone and computer</li>
              <li className="y">Log in from any browser or device</li>
              <li className="y">Your data is never sold</li>
            </ul>
            <Link className="lbtn p" href="/signup">
              <span>Sign up free</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel Section */}
      <TestimonialCarousel />

      {/* Journal / From the blog Section */}
      <section className="lsec journal" id="journal" aria-labelledby="journal-heading">
        <div className="journal-head">
          <div>
            <span className="journal-kicker">From the blog</span>
            <h2 id="journal-heading">
              Guides &amp; tips for <span className="gt">your money life</span>
            </h2>
            <p>
              Practical advice to help you build better money habits and feel more confident with
              your finances.
            </p>
          </div>
          {posts.length > 0 && (
            <Link className="journal-link" href="/blog">
              <span>View all articles</span>
              <span aria-hidden="true">&rarr;</span>
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

      {/* FAQ Section */}
      <section className="lsec" id="faq" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Frequently asked questions</h2>
        <p>Quick answers about how Hisbo works.</p>
        <div className="faq">
          {FAQS.map((q) => (
            <details key={q.q}>
              <summary>
                <span>{q.q}</span>
                <span className="pl" aria-hidden="true">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </summary>
              <div className="ans">{q.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA Section with Official Logo */}
      <section className="lfin" aria-labelledby="final-cta-heading">
        <div className="final-cta-content-grid">
          <div className="final-cta-text-panel">
            <h2 id="final-cta-heading">Start your smarter money journey today</h2>
            <p>
              Start tracking, saving and working towards your goals with Hisbo.
            </p>
            <div className="lcta">
              <Link className="lbtn w big" href="/signup">
                <span>Sign up free</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <GuestEntryButton className="lbtn o big">
                Try without an account
              </GuestEntryButton>
            </div>
          </div>

          <div className="final-cta-mockup-panel">
            <div className="final-cta-device-card" aria-hidden="true">
              <div className="final-mini-phone">
                <div className="final-mini-phone-logo">
                  <Image
                    src="/logo-mark.webp"
                    alt="Hisbo"
                    width={40}
                    height={40}
                    className="lgi"
                  />
                </div>
                <span className="label-hisbo">Hisbo</span>
              </div>
              <div className="final-handwritten-note">
                Manage today for a brighter tomorrow ~
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
