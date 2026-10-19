'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { state, isLoading } = useApp();
  const { openName } = useModal();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Initial onboarding check: if no name set, prompt for name
  useEffect(() => {
    if (!isLoading && !state.name) {
      openName(true);
    }
  }, [isLoading, state.name, openName]);

  return (
    <div className="app">
      <Suspense fallback={null}>
        <ShortcutHandler />
      </Suspense>

      <DesktopSidebar />
      <main>
        <TopBar
          onOpenMobileMenu={() => setDrawerOpen(true)}
          onOpenAccountModal={() => {}}
        />
        {children}
        <AppFooter />
      </main>

      <MobileNav />
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <FloatingAddButton />
      <ModalHost />
      <ToastContainer />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ModalProvider>
        <AppShellContent>{children}</AppShellContent>
      </ModalProvider>
    </AppProvider>
  );
}
