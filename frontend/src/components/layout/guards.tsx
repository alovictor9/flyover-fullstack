'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, roleHome } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { Logo } from '@/components/ui/misc';
import { Spinner } from '@/components/ui/feedback';

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-mist">
      <Logo />
      <Spinner />
    </div>
  );
}

/** Redirects anonymous users to /login?next=… */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);
  if (status !== 'authenticated') return <FullScreenLoader />;
  return <>{children}</>;
}

/** Sends users to their own role home if they open another role's section. */
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const ok = !!user && allow.includes(user.role);
  useEffect(() => {
    if (user && !ok) router.replace(roleHome[user.role]);
  }, [user, ok, router]);
  if (!ok) return null;
  return <>{children}</>;
}

/** For /login and /register: signed-in users go straight to their dashboard. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  // Only redirect users who arrived already signed in; a fresh login/register handles its own navigation.
  const arrivedAuthed = useRef<boolean | null>(null);
  if (arrivedAuthed.current === null && status !== 'loading') arrivedAuthed.current = status === 'authenticated';
  useEffect(() => {
    if (arrivedAuthed.current && status === 'authenticated' && user) {
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : roleHome[user.role]);
    }
  }, [status, user, router]);
  if (status === 'loading' || (arrivedAuthed.current && status === 'authenticated')) return <FullScreenLoader />;
  return <>{children}</>;
}
