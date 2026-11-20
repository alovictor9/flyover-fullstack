'use client';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, referralApi } from '@/lib/endpoints';
import { formatMoney, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, StatCard, Card, CardHeader } from '@/components/ui/layout';
import { ErrorState, LoadingBlock, Callout, ComingSoon } from '@/components/ui/feedback';
import { BarList, Funnel } from '@/components/analytics/bars';

export default function AffiliateAnalyticsPage() {
  const a = useQuery({ queryKey: ['analytics', 'affiliate'], queryFn: analyticsApi.affiliate });
  const refs = useQuery({ queryKey: ['referrals'], queryFn: referralApi.mine });
  if (a.isLoading) return <LoadingBlock rows={4} />;
  if (a.isError || !a.data) return <ErrorState error={a.error} onRetry={() => a.refetch()} />;
  const d = a.data;
  const by = (s: string) => d.conversionsByStatus.find((x) => x.status === s)?._count._all ?? 0;
  const totalConv = d.conversionsByStatus.reduce((s, x) => s + x._count._all, 0);
  const approved = by('APPROVED');
  const rate = d.totalClicks ? (approved / d.totalClicks) * 100 : NaN;
  const epc = d.totalClicks ? d.totalCommission / d.totalClicks : NaN;

  return (
    <>
      <PageHeader title="Analytics" description="Performance across all your referral links." />
      <div className="space-y-6">
        <Callout tone="neutral">
          <b>All-time totals, live from your records.</b> Pending conversions and commissions can still change until verified and cleared, so treat them as provisional.
        </Callout>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total clicks" value={formatNumber(d.totalClicks)} />
          <StatCard label="Approved conversions" value={formatNumber(approved)} hint={`${formatNumber(totalConv)} recorded in total`} />
          <StatCard label="Conversion rate" value={formatPercent(rate, 2)} hint="Approved ÷ clicks" />
          <StatCard tone="brand" label="Commission earned" value={formatMoney(d.totalCommission)} hint={Number.isFinite(epc) ? `${formatMoney(epc.toFixed(2))} per click` : 'Includes pending'} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Funnel" description="From click to verified conversion." />
            <Funnel steps={[{ label: 'Clicks', value: d.totalClicks }, { label: 'Conversions recorded', value: totalConv }, { label: 'Approved', value: approved }]} />
          </Card>
          <Card>
            <CardHeader title="Clicks by campaign" />
            {refs.isLoading ? (
              <LoadingBlock rows={2} />
            ) : !refs.data?.length ? (
              <p className="text-sm text-slate">No links yet.</p>
            ) : (
              <BarList items={refs.data.map((r) => ({ label: r.campaign?.name ?? r.code, value: r._count?.clicks ?? 0 }))} />
            )}
          </Card>
          <Card>
            <CardHeader title="Earnings breakdown" />
            <BarList
              valueLabel={(n) => formatMoney(n.toFixed(2))}
              items={[
                { label: 'Available', value: d.wallet.available, tone: 'bg-success-600' },
                { label: 'Pending', value: d.wallet.pending, tone: 'bg-warning-600' },
                { label: 'Withdrawn', value: d.wallet.withdrawn, tone: 'bg-navy-700' },
                { label: 'Reversed', value: d.wallet.reversed, tone: 'bg-brick-500' },
              ]}
            />
          </Card>
          <ComingSoon title="Trends over time & channel breakdown" endpoint="GET /analytics/affiliate?from=&to=&groupBy=day|source">
            Daily clicks and earnings charts, and performance by source tag (Instagram, WhatsApp…).
          </ComingSoon>
        </div>
      </div>
    </>
  );
}
