'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import AuthPromoArtwork from './AuthPromoArtwork';
import AuthPromoIcon from './AuthPromoIcon';

const FEATURES = [
  ['↗', 'Track Expenses', 'Know where your money goes', 'tracking'],
  ['◎', 'Set Budgets', 'Stay on track with your goals', 'budgets'],
  ['♜', 'Reach Goals', 'Turn your dreams into plans', 'goals'],
  ['♧', 'Split Bills', 'Manage shared expenses easily', 'split'],
] as const;

export default function AuthSidebar() {
  const isSignup = usePathname() === '/signup';
  return (
    <aside className="ah auth-promo">
      <div className="atop">
        <Link className="abrand" href="/" aria-label="Hisbo home"><span className="tlogo"><Image src="/logo-mark.webp" alt="Hisbo" width={40} height={40} className="lgi" priority /></span>Hisbo</Link>
        <Link className="bkb" href="/"><span aria-hidden="true">←</span> Back</Link>
      </div>
      <div className="auth-promo-content">
        <div className="auth-promo-copy">
          <span className="companion-badge">✦ Your Personal Finance Companion</span>
          <h1 className="ht">{isSignup ? 'Build a better' : 'Welcome back'}<span>{isSignup ? 'money future' : 'to a better you'}</span></h1>
          <p className="hp2">{isSignup ? 'Track expenses, set smart budgets, reach savings goals and split bills with friends.' : 'Log in to sync your expenses, budgets and savings across all your devices.'}</p>
          <div className="auth-features">{FEATURES.map(([, title, text, tone]) => <div className={`auth-feature ${tone}`} key={title}><span className="feature-symbol" aria-hidden="true"><AuthPromoIcon name={tone} /></span><div><strong>{title}</strong><small>{text}</small></div></div>)}</div>
        </div>
        <AuthPromoArtwork />
      </div>
      <div className="auth-benefits"><div><span aria-hidden="true"><AuthPromoIcon name="tracking" /></span><p><strong>Smart Tracking</strong><small>Every moment matters</small></p></div><div><span aria-hidden="true"><AuthPromoIcon name="privacy" /></span><p><strong>Privacy First</strong><small>You’re in control</small></p></div><div><span aria-hidden="true"><AuthPromoIcon name="free" /></span><p><strong>Free to Use</strong><small>Start in seconds</small></p></div></div>
    </aside>
  );
}
