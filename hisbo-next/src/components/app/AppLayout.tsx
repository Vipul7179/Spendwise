'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { appAccess } from '@/lib/auth-access';
import { AppProvider, useApp } from '@/context/AppContext';
import { ModalProvider, useModal } from '@/context/ModalContext';
import DesktopSidebar from '@/components/app/DesktopSidebar';
import TopBar from '@/components/app/TopBar';
import MobileNav from '@/components/app/MobileNav';
import MobileDrawer from '@/components/app/MobileDrawer';
import AppFooter from '@/components/app/AppFooter';
import FloatingAddButton from '@/components/app/FloatingAddButton';
import ToastContainer from '@/components/app/ToastContainer';
import ModalHost from '@/components/app/modals/ModalHost';
import AppSplash from '@/components/app/AppSplash';
import DashboardSkeleton from '@/components/common/DashboardSkeleton';

function ShortcutHandler() {
  const searchParams = useSearchParams();
  const { isLoading } = useApp();
  const { openQuickAdd } = useModal();

  useEffect(() => {
    if (!isLoading && searchParams.get('add') === '1') {
      openQuickAdd();
    }
  }, [isLoading, searchParams, openQuickAdd]);

  return null;
}

export function AppShellContent({ children, publicView = false }: { children: React.ReactNode; publicView?: boolean }) {
  const { state, isLoading, user, isGuest } = useApp();
  const router = useRouter();
  const access = appAccess(publicView, isLoading, !!user, isGuest);
  const { openName, openAccount } = useModal();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Initial onboarding check: if no name set, prompt for name
  useEffect(() => {
    if (!publicView && access === 'allow' && !state.name) {
      openName(true);
    }
  }, [publicView, access, state.name, openName]);

  useEffect(() => {
    if (access === 'login') router.replace('/login');
  }, [access, router]);

  if (access !== 'allow') {
    return <div className="app">{!publicView && !!user && <AppSplash ready={!isLoading} />}<main><div className="card" role="status" aria-label="Checking session">
      {access === 'login' ? 'Opening login…' : <DashboardSkeleton />}
    </div></main></div>;
  }

  return (
    <div className={publicView ? "app" : "app app-private"}>
      {!publicView && <AppSplash ready={!isLoading} />}
      {!publicView && (
        <Suspense fallback={null}>
          <ShortcutHandler />
        </Suspense>
      )}

      <DesktopSidebar />
      <main>
        <TopBar
          onOpenMobileMenu={() => setDrawerOpen(true)}
          onOpenAccountModal={openAccount}
        />
        {children}
        <AppFooter />
      </main>

      <MobileNav />
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      {!publicView && <FloatingAddButton />}
      <ModalHost />
      <ToastContainer />
    </div>
  );
}

export default function AppLayout({ children, publicView = false }: { children: React.ReactNode; publicView?: boolean }) {
  return (
    <AppProvider publicView={publicView}>
      <ModalProvider>
        <AppShellContent publicView={publicView}>{children}</AppShellContent>
      </ModalProvider>
    </AppProvider>
  );
}

