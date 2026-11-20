'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Wallet, MousePointerClick, Link2, ArrowRight, Store, Hourglass } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { analyticsApi, campaignApi, referralApi } from '@/lib/endpoints';
import { formatMoney, formatNumber } from '@/lib/format';
import { PageHeader, StatCard, Card, CardHeader } from '@/components/ui/layout';
import { ButtonLink } from '@/components/ui/button';
import { Callout, LoadingBlock, Skeleton, ErrorState } from '@/components/ui/feedback';
import { ProgressBar } from '@/components/ui/misc';
import { CommissionHeadline } from '@/components/campaign/campaign-bits';
import { affiliateCompleteness } from '@/components/profile/affiliate-profile-form';

export default function AffiliateDashboard() {
  const me = useMe();
  const a = useQuery({ queryKey: ['analytics', 'affiliate'], queryFn: analyticsApi.affiliate });
  const refs = useQuery({ queryKey: ['referrals'], queryFn: referralApi.mine });
  const interest = me.affiliate?.interests[0];
  const rec = useQuery({ queryKey: ['marketplace', 'rec', interest], queryFn: () => campaignApi.marketplace({ category: interest, limit: 4 }) });
  const { percent } = affiliateCompleteness(me);
  const joined = new Set((refs.data ?? []).map((r) => r.campaignId));
  const recs = (rec.data?.data ?? []).filter((c) => !joined.has(c.id)).slice(0, 3);
  const approved = a.data?.conversionsByStatus.find((x) => x.status === 'APPROVED')?._count._all ?? 0;
  const pending = a.data?.conversionsByStatus.find((x) => x.status === 'PENDING')?._count._all ?? 0;

  return (
    <>
      <PageHeader title={`Hi, ${me.fullName.split(' ')[0]}`} description="Here’s how your links are performing." />
      <div className="space-y-6">
        {percent < 100 && (
          <Callout tone="brand" title="Complete your profile" action={<ButtonLink href="/affiliate/profile" size="sm">Finish profile</ButtonLink>}>
            <div className="mt-2 max-w-sm">
              <ProgressBar value={percent} />
            </div>
            <p className="mt-2">Businesses are more likely to approve affiliates with a complete profile.</p>
          </Callout>
        )}

        {a.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : a.isError ? (
          <ErrorState error={a.error} onRetry={() => a.refetch()} />
        ) : (
          a.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard tone="brand" label="Available balance" value={formatMoney(a.data.wallet.available)} hint={<Link href="/affiliate/wallet" className="underline">Go to wallet</Link>} icon={<Wallet className="h-5 w-5" />} />
              <StatCard label="Pending earnings" value={formatMoney(a.data.wallet.pending)} hint="Clears after validation" icon={<Hourglass className="h-5 w-5" />} />
              <StatCard label="Clicks" value={formatNumber(a.data.totalClicks)} hint={`${a.data.referralLinks} active link${a.data.referralLinks === 1 ? '' : 's'}`} icon={<MousePointerClick className="h-5 w-5" />} />
              <StatCard label="Conversions" value={formatNumber(approved)} hint={pending ? `${pending} awaiting verification` : 'Approved by businesses'} icon={<Link2 className="h-5 w-5" />} />
            </div>
          )
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Your top links" action={<Link href="/affiliate/links" className="text-sm font-medium text-navy-600 hover:underline">All links</Link>} />
            {refs.isLoading ? (
              <LoadingBlock rows={2} />
            ) : !refs.data?.length ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate">You haven&apos;t joined any campaigns yet.</p>
                <ButtonLink href="/marketplace" className="mt-3" size="sm">Browse campaigns</ButtonLink>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {[...refs.data].sort((x, y) => (y._count?.clicks ?? 0) - (x._count?.clicks ?? 0)).slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/marketplace/${r.campaignId}`} className="min-w-0 truncate text-sm font-medium text-navy-700 hover:underline">
                      {r.campaign?.name}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-slate">
                      {formatNumber(r._count?.clicks ?? 0)} clicks · {formatNumber(r._count?.conversions ?? 0)} conv.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title={interest ? `Campaigns in ${interest}` : 'New in the marketplace'} action={<Link href="/marketplace" className="text-sm font-medium text-navy-600 hover:underline">Marketplace</Link>} />
            {rec.isLoading ? (
              <LoadingBlock rows={2} />
            ) : recs.length === 0 ? (
              <div className="py-6 text-center">
                <Store className="mx-auto h-8 w-8 text-navy-200" />
                <p className="mt-2 text-sm text-slate">No new campaigns to suggest right now.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {recs.map((c) => (
                  <li key={c.id}>
                    <Link href={`/marketplace/${c.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-mist/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy-800">{c.name}</p>
                        <p className="text-xs text-slate">{c.business?.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <CommissionHeadline c={c} />
                        <ArrowRight className="h-4 w-4 text-slate" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
