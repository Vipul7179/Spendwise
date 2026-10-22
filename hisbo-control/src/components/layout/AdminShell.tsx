'use client';

import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { AdminUser } from '@/types/admin';

interface AdminShellProps {
  currentUser: AdminUser | null;
  isDemo?: boolean;
  children: React.ReactNode;
}

export function AdminShell({ currentUser, isDemo, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      <AdminSidebar
        currentUser={currentUser}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="admin-main">
        <AdminTopBar
          currentUser={currentUser}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}

