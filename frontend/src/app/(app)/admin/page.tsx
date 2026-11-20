'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, ShieldCheck, Banknote, Users, ArrowRight, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { formatMoney, formatNumber } from '@/lib/format';
import { PageHeader, StatCard, Card, CardHeader } from '@/components/ui/layout';
import { Skeleton, ComingSoon } from '@/components/ui/feedback';

export default function AdminOverview() {
  const biz = useQuery({ queryKey: ['admin', 'businesses'], queryFn: () => adminApi.businesses() });
  const camps = useQuery({ queryKey: ['admin', 'campaigns'], queryFn: () => adminApi.campaigns() });
  const wds = useQuery({ queryKey: ['admin', 'withdrawals'], queryFn: () => adminApi.withdrawals() });
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.users });
  const loading = biz.isLoading || camps.isLoading || wds.isLoading || users.isLoading;

  const pendingBiz = (biz.data ?? []).filter((b) => b.status === 'PENDING' && b.submittedAt).length;
  const pendingCamp = (camps.data ?? []).filter((c) => c.status === 'PENDING').length;
  const openWds = (wds.data ?? []).filter((w) => ['PENDING', 'APPROVED', 'PROCESSING'].includes(w.status));
  const openWdsValue = openWds.reduce((s, w) => s + Number(w.amount), 0).toFixed(2);
  const roles = (users.data ?? []).reduce<Record<string, number>>((m, u) => ((m[u.role] = (m[u.role] ?? 0) + 1), m), {});
  const suspended = (users.data ?? []).filter((u) => !u.isActive).length;

  const queues = [
    { href: '/admin/businesses', label: 'Businesses awaiting verification', count: pendingBiz, icon: BadgeCheck },
    { href: '/admin/campaigns', label: 'Campaigns awaiting review', count: pendingCamp, icon: ShieldCheck },
    { href: '/admin/withdrawals', label: 'Withdrawals to process', count: openWds.length, icon: Banknote },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Platform overview" description="Work queues and platform health." />
      <div className="space-y-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard tone="brand" label="Open payout liability" value={formatMoney(openWdsValue)} hint={`${openWds.length} withdrawal(s) not yet paid`} icon={<Banknote className="h-5 w-5" />} />
            <StatCard label="Affiliates" value={formatNumber(roles.AFFILIATE ?? 0)} icon={<Users className="h-5 w-5" />} />
            <StatCard label="Businesses" value={formatNumber(roles.BUSINESS ?? 0)} hint={`${(biz.data ?? []).filter((b) => b.status === 'APPROVED').length} verified`} icon={<BadgeCheck className="h-5 w-5" />} />
            <StatCard label="Live campaigns" value={formatNumber((camps.data ?? []).filter((c) => c.status === 'APPROVED').length)} icon={<ShieldCheck className="h-5 w-5" />} />
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader title="Work queues" />
            <ul className="divide-y divide-line">
              {queues.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="flex items-center gap-3 py-3.5 hover:bg-mist/50">
                    <q.icon className="h-5 w-5 text-navy-400" aria-hidden />
                    <span className="flex-1 text-sm font-medium text-navy-800">{q.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${q.count ? 'bg-brick-500 text-white' : 'bg-mist text-slate'}`}>{q.count}</span>
                    <ArrowRight className="h-4 w-4 text-slate" />
                  </Link>
                </li>
              ))}
            </ul>
            {suspended > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate">
                <AlertTriangle className="h-3.5 w-3.5 text-warning-600" /> {suspended} suspended account(s). <Link href="/admin/users" className="underline">Review users</Link>
              </p>
            )}
          </Card>
          <div className="space-y-4">
            <ComingSoon title="Fraud alerts & reported accounts" endpoint="GET /admin/fraud-alerts">
              Click-spike detection, duplicate IP patterns and user reports will appear here.
            </ComingSoon>
            <ComingSoon title="Financial monitoring" endpoint="GET /admin/finance/summary">
              Platform-wide pending vs available commission, and reconciliation against the ledger.
            </ComingSoon>
          </div>
        </div>
      </div>
    </>
  );
}
