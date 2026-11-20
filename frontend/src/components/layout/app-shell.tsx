'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogOut, Settings, HelpCircle, MoreHorizontal, X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { navByRole, isActive } from '@/lib/nav';
import { notificationApi } from '@/lib/endpoints';
import { USE_MOCKS } from '@/lib/config';
import { Logo, Avatar } from '@/components/ui/misc';

const roleLabel = { AFFILIATE: 'Affiliate', BUSINESS: 'Business', ADMIN: 'Administrator' } as const;

export function useUnreadCount() {
  const q = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.list, refetchInterval: 60_000 });
  return q.data?.filter((n) => !n.readAt).length ?? 0;
}

function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-mist"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.fullName} className="h-8 w-8" />
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-navy-800 sm:block">{user.fullName}</span>
        <ChevronDown className="hidden h-4 w-4 text-slate sm:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-navy-800">{user.fullName}</p>
            <p className="truncate text-xs text-slate">{user.email}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-brick-500">{roleLabel[user.role]}</p>
          </div>
          <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-navy-700 hover:bg-mist">
            <Settings className="h-4 w-4" /> Account settings
          </Link>
          <Link role="menuitem" href="/help" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-navy-700 hover:bg-mist">
            <HelpCircle className="h-4 w-4" /> Help & support
          </Link>
          <button
            role="menuitem"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-sm text-brick-600 hover:bg-brick-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const unread = useUnreadCount();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname]);
  if (!user) return null;
  const items = navByRole[user.role];
  const primary = items.filter((i) => i.primary).slice(0, 4);
  const secondary = items.filter((i) => !primary.includes(i));

  return (
    <div className="min-h-dvh bg-mist">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-pop">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Link href={items[0]!.href}>
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main">
          {items.map((i) => {
            const on = isActive(pathname, i);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? 'page' : undefined}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  on ? 'bg-navy-700 text-white' : 'text-navy-600 hover:bg-mist hover:text-navy-800',
                )}
              >
                <i.icon className="h-[18px] w-[18px]" aria-hidden />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate">Signed in as</p>
          <p className="text-sm font-semibold text-brick-500">{roleLabel[user.role]}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
          <Link href={items[0]!.href} className="lg:hidden">
            <Logo compact />
          </Link>
          {USE_MOCKS && (
            <span className="rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-semibold text-warning-700 ring-1 ring-warning-600/25">Demo data</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Link href="/notifications" className="relative rounded-xl p-2.5 text-navy-600 hover:bg-mist" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brick-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <UserMenu />
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
        <div className="grid grid-cols-5">
          {primary.map((i) => {
            const on = isActive(pathname, i);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? 'page' : undefined}
                className={clsx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', on ? 'text-navy-700' : 'text-slate')}
              >
                <i.icon className={clsx('h-5 w-5', on && 'text-brick-500')} aria-hidden />
                {i.label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={clsx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', secondary.some((i) => isActive(pathname, i)) ? 'text-navy-700' : 'text-slate')}
            aria-expanded={moreOpen}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
            More
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/40" onClick={() => setMoreOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-pop" role="dialog" aria-label="More navigation">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="font-semibold text-navy-800">More</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-1.5 text-slate" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {[...secondary, { href: '/settings', label: 'Account settings', icon: Settings }, { href: '/help', label: 'Help & support', icon: HelpCircle }].map((i) => (
              <Link key={i.href} href={i.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-navy-700 hover:bg-mist">
                <i.icon className="h-5 w-5 text-slate" aria-hidden />
                {i.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
