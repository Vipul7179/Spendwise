import type { Metadata } from 'next';
import './auth-reference.css';
import AuthSidebar from '@/components/auth/AuthSidebar';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Account · Hisbo',
  description: 'Sign in or create your Hisbo account to sync your personal finance data.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth">
      <div className="aw">
        <AuthSidebar />
        <section className="ap">
          <div className="ab">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

