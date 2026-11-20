'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Bell, BadgeCheck, Megaphone, Users, ArrowLeftRight, Coins, Banknote, Info, CheckCheck } from 'lucide-react';
import { notificationApi } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth';
import { timeAgo, formatDate } from '@/lib/format';
import type { Notification, NotificationType, Role } from '@/lib/types';
import { PageHeader, Tabs } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { NotificationPreferencesCard } from '@/components/notifications/notification-preferences';
import { useRouter } from 'next/navigation';

const ICON: Record<NotificationType, typeof Bell> = {
  GENERAL: Info,
  BUSINESS_VERIFICATION: BadgeCheck,
  CAMPAIGN: Megaphone,
  APPLICATION: Users,
  CONVERSION: ArrowLeftRight,
  COMMISSION: Coins,
  WITHDRAWAL: Banknote,
};

function target(type: NotificationType, role: Role): string | null {
  const map: Partial<Record<NotificationType, Partial<Record<Role, string>>>> = {
    BUSINESS_VERIFICATION: { BUSINESS: '/business/verification' },
    CAMPAIGN: { BUSINESS: '/business/campaigns', AFFILIATE: '/marketplace' },
    APPLICATION: { BUSINESS: '/business/campaigns', AFFILIATE: '/affiliate/links' },
    CONVERSION: { BUSINESS: '/business/conversions', AFFILIATE: '/affiliate/conversions' },
    COMMISSION: { AFFILIATE: '/affiliate/wallet' },
    WITHDRAWAL: { AFFILIATE: '/affiliate/wallet', ADMIN: '/admin/withdrawals' },
  };
  return map[type]?.[role] ?? null;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [marking, setMarking] = useState(false);
  const q = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.list });
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.readAt);
  const rows = tab === 'unread' ? unread : items;

  async function markRead(n: Notification) {
    if (n.readAt) return;
    qc.setQueryData<Notification[]>(['notifications'], (old) => old?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    try {
      await notificationApi.markRead(n.id);
    } finally {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }
  }
  async function markAll() {
    setMarking(true);
    try {
      await Promise.all(unread.map((n) => notificationApi.markRead(n.id)));
    } finally {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      setMarking(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates on verification, campaigns, conversions and payouts."
        actions={unread.length > 0 && <Button variant="secondary" loading={marking} icon={<CheckCheck className="h-4 w-4" />} onClick={markAll}>Mark all as read</Button>}
      />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All', count: items.length }, { value: 'unread', label: 'Unread', count: unread.length }]} />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title={tab === 'unread' ? 'You’re all caught up' : 'No notifications yet'} description="We’ll let you know when something needs your attention." />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {rows.map((n) => {
            const I = ICON[n.type] ?? Info;
            const href = user ? target(n.type, user.role) : null;
            return (
              <li key={n.id} className="border-b border-line last:border-0">
                <button
                  onClick={() => {
                    markRead(n);
                    if (href) router.push(href);
                  }}
                  className={clsx('flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-mist/60 sm:px-5', !n.readAt && 'bg-navy-50/40')}
                >
                  <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', n.readAt ? 'bg-mist text-slate' : 'bg-navy-700 text-white')}>
                    <I className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={clsx('text-sm', n.readAt ? 'text-navy-700' : 'font-semibold text-navy-800')}>{n.title}</span>
                      <time className="shrink-0 text-xs text-slate" dateTime={n.createdAt} title={formatDate(n.createdAt, true)}>
                        {timeAgo(n.createdAt)}
                      </time>
                    </span>
                    <span className="mt-0.5 block text-sm text-slate">{n.message}</span>
                  </span>
                  {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brick-500" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-6">
        <NotificationPreferencesCard />
      </div>
    </>
  );
}
