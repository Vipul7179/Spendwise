import AppLayout from '@/components/app/AppLayout';

// The legacy journal is public and uses the same navigation as the tracker.
export const dynamic = 'force-dynamic';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout publicView>{children}</AppLayout>;
}
