'use client';
import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/layout/guards';
import { AppShell } from '@/components/layout/app-shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
