import React from 'react';
import { redirect } from 'next/navigation';
import { verifyAdminSession } from '@/lib/auth/session';
import { AdminShell } from '@/components/layout/AdminShell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyAdminSession();

  if (!session.isAuthenticated || !session.isAdmin) {
    redirect('/login');
  }

  return (
    <AdminShell currentUser={session.user} isDemo={session.isDemo}>
      {children}
    </AdminShell>
  );
}

