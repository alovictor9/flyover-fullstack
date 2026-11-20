'use client';
import type { ReactNode } from 'react';
import { RoleGate } from '@/components/layout/guards';

export default function Layout({ children }: { children: ReactNode }) {
  return <RoleGate allow={['BUSINESS']}>{children}</RoleGate>;
}
