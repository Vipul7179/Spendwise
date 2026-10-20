import Image from 'next/image';
import AuthPromoIcon from './AuthPromoIcon';

export default function AuthPromoArtwork() {
  return (
    <div className="auth-artwork" aria-label="Budgeting, savings and expense tracking">
      <div className="artwork-halo" />
      <Image src="/images/auth/hisbo-companion.png" alt="Friendly Hisbo companion working on a laptop" width={1536} height={1024} priority className="auth-companion" />
      <div className="promo-budget promo-float">
        <strong>Monthly Budget</strong>
        <div className="promo-budget-body"><span className="promo-ring">62%</span><span><b>62% Used</b><small>Stay on track</small></span></div>
      </div>
      <div className="promo-savings promo-float">
        <span className="promo-savings-icon" aria-hidden="true"><AuthPromoIcon name="goals" /></span>
        <strong>Savings Goal</strong><b>75% Complete</b>
        <div className="promo-progress"><span /></div>
      </div>
      <div className="promo-tracking promo-float"><span className="promo-bars" aria-hidden="true"><i /><i /><i /><i /></span><div><strong>Track Expenses</strong><small>Know where your money goes</small></div></div>
      <div className="promo-split promo-float"><span aria-hidden="true"><AuthPromoIcon name="split" /></span><strong>Split Bills</strong></div>
    </div>
  );
}
