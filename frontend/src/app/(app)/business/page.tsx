'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, MousePointerClick, ArrowLeftRight, Banknote, Plus, ArrowRight } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { analyticsApi, campaignApi, conversionApi } from '@/lib/endpoints';
import { formatMoney, formatNumber, formatDate } from '@/lib/format';
import { campaignStatus } from '@/lib/status';
import { PageHeader, StatCard, Card, CardHeader } from '@/components/ui/layout';
import { ButtonLink } from '@/components/ui/button';
import { StatusBadge, LoadingBlock, Skeleton, ErrorState } from '@/components/ui/feedback';
import { VerificationBanner } from '@/components/profile/verification-banner';

export default function BusinessDashboard() {
  const me = useMe();
  const b = me.business!;
  const approved = b.status === 'APPROVED';
  const a = useQuery({ queryKey: ['analytics', 'business'], queryFn: analyticsApi.business });
  const camps = useQuery({ queryKey: ['campaigns', 'mine'], queryFn: campaignApi.mine });
  const pend = useQuery({ queryKey: ['conversions'], queryFn: () => conversionApi.list() });
  const pendingConv = (pend.data ?? []).filter((c) => c.status === 'PENDING');
  const pendingApps = (camps.data ?? []).filter((c) => c.status === 'APPROVED' && c.access === 'APPROVAL');

  return (
    <>
      <PageHeader title={b.name} description="Your affiliate programme at a glance." actions={approved && <ButtonLink href="/business/campaigns/new" icon={<Plus className="h-4 w-4" />}>New campaign</ButtonLink>} />
      <div className="space-y-6">
        <VerificationBanner profile={b} compact />
        {a.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : a.isError ? (
          <ErrorState error={a.error} onRetry={() => a.refetch()} />
        ) : (
          a.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard tone="brand" label="Verified sales value" value={formatMoney(a.data.approvedConversionValue)} hint="Approved conversions, all time" icon={<Banknote className="h-5 w-5" />} />
              <StatCard label="Referral clicks" value={formatNumber(a.data.clicks)} icon={<MousePointerClick className="h-5 w-5" />} />
              <StatCard label="Conversions" value={formatNumber(a.data.conversions)} hint={pendingConv.length ? `${pendingConv.length} need review` : 'All reviewed'} icon={<ArrowLeftRight className="h-5 w-5" />} />
              <StatCard label="Campaigns" value={formatNumber(a.data.campaigns)} hint={`${(camps.data ?? []).filter((c) => c.status === 'APPROVED').length} live`} icon={<Megaphone className="h-5 w-5" />} />
            </div>
          )
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Conversions to review" action={<Link href="/business/conversions" className="text-sm font-medium text-navy-600 hover:underline">Open queue</Link>} />
            {pend.isLoading ? (
              <LoadingBlock rows={2} />
            ) : pendingConv.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-line">
                {pendingConv.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-800">{c.externalReference}</p>
                      <p className="truncate text-xs text-slate">{c.affiliate?.user.fullName} · {formatDate(c.convertedAt)}</p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{formatMoney(c.amount, c.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Your campaigns" action={<Link href="/business/campaigns" className="text-sm font-medium text-navy-600 hover:underline">All campaigns</Link>} />
            {camps.isLoading ? (
              <LoadingBlock rows={2} />
            ) : !camps.data?.length ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate">No campaigns yet.</p>
                {approved && <ButtonLink href="/business/campaigns/new" size="sm" className="mt-3">Create your first campaign</ButtonLink>}
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {camps.data.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Link href={`/business/campaigns/${c.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-mist/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy-800">{c.name}</p>
                        <p className="text-xs text-slate">{c._count?.referrals ?? 0} affiliates · {c._count?.applications ?? 0} applications</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge map={campaignStatus} value={c.status} />
                        <ArrowRight className="h-4 w-4 text-slate" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {pendingApps.length > 0 && <p className="mt-3 text-xs text-slate">Tip: check application-based campaigns for affiliates waiting on approval.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
