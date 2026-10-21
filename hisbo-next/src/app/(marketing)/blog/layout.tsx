import AppLayout from '@/components/app/AppLayout';
import AdSenseScript from '@/components/blog/AdSenseScript';

// The legacy journal is public and uses the same navigation as the tracker.
export const dynamic = 'force-dynamic';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout publicView><AdSenseScript />{children}</AppLayout>;
}
