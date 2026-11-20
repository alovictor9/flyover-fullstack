'use client';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, campaignApi, conversionApi } from '@/lib/endpoints';
import { formatMoney, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, StatCard, Card, CardHeader, DataTable } from '@/components/ui/layout';
import { ErrorState, LoadingBlock, Callout } from '@/components/ui/feedback';
import { Funnel } from '@/components/analytics/bars';
import { AdvancedBusinessAnalytics } from '@/components/analytics/advanced-business-analytics';

export default function BusinessAnalyticsPage() {
  const a = useQuery({ queryKey: ['analytics', 'business'], queryFn: analyticsApi.business });
  const camps = useQuery({ queryKey: ['campaigns', 'mine'], queryFn: campaignApi.mine });
  const convs = useQuery({ queryKey: ['conversions'], queryFn: () => conversionApi.list() });
  if (a.isLoading) return <LoadingBlock rows={4} />;
  if (a.isError || !a.data) return <ErrorState error={a.error} onRetry={() => a.refetch()} />;
  const d = a.data;
  const all = convs.data ?? [];
  const approved = all.filter((c) => c.status === 'APPROVED');
  // Commission totals are summed from server-calculated commission records (display only).
  const spend = approved.reduce((s, c) => s + Number(c.commission?.commissionAmount ?? 0), 0);
  const cpa = approved.length ? spend / approved.length : NaN;

  const perCampaign = (camps.data ?? [])
    .filter((c) => c.status !== 'DRAFT')
    .map((c) => {
      const cc = all.filter((v) => v.campaignId === c.id);
      const ap = cc.filter((v) => v.status === 'APPROVED');
      return {
        id: c.id,
        name: c.name,
        affiliates: c._count?.referrals ?? 0,
        conversions: cc.length,
        approved: ap.length,
        sales: ap.reduce((s, v) => s + Number(v.amount), 0),
        commission: ap.reduce((s, v) => s + Number(v.commission?.commissionAmount ?? 0), 0),
      };
    });

  return (
    <>
      <PageHeader title="Analytics" description="How your affiliate programme is performing." />
      <div className="space-y-6">
        <Callout tone="neutral">
          <b>All-time totals.</b> Commission figures include amounts still in their validation period and may change if a sale is refunded.
        </Callout>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard tone="brand" label="Verified sales" value={formatMoney(d.approvedConversionValue)} />
          <StatCard label="Commission expenditure" value={formatMoney(spend.toFixed(2))} hint={convs.isLoading ? 'Loading…' : `${approved.length} approved conversions`} />
          <StatCard label="Cost per acquisition" value={Number.isFinite(cpa) ? formatMoney(cpa.toFixed(2)) : '—'} hint="Commission ÷ approved" />
          <StatCard label="Conversion rate" value={formatPercent(d.clicks ? (approved.length / d.clicks) * 100 : NaN, 2)} hint={`${formatNumber(d.clicks)} clicks`} />
        </div>
        <Card>
          <CardHeader title="Funnel" />
          <Funnel steps={[{ label: 'Referral clicks', value: d.clicks }, { label: 'Conversions recorded', value: d.conversions }, { label: 'Approved', value: approved.length }]} />
        </Card>
        <div>
          <h2 className="mb-3 text-base font-semibold text-navy-800">By campaign</h2>
          {camps.isLoading || convs.isLoading ? (
            <LoadingBlock rows={2} />
          ) : perCampaign.length === 0 ? (
            <p className="text-sm text-slate">No submitted campaigns yet.</p>
          ) : (
            <DataTable
              caption="Campaign performance"
              rows={perCampaign}
              rowKey={(r) => r.id}
              columns={[
                { key: 'n', header: 'Campaign', cell: (r) => <span className="font-semibold">{r.name}</span> },
                { key: 'a', header: 'Affiliates', cell: (r) => formatNumber(r.affiliates), align: 'right' },
                { key: 'c', header: 'Conversions', cell: (r) => `${formatNumber(r.approved)} / ${formatNumber(r.conversions)}`, align: 'right' },
                { key: 's', header: 'Verified sales', cell: (r) => formatMoney(r.sales.toFixed(2)), align: 'right' },
                { key: 'k', header: 'Commission', cell: (r) => <span className="text-brick-500">{formatMoney(r.commission.toFixed(2))}</span>, align: 'right' },
              ]}
            />
          )}
        </div>
        <AdvancedBusinessAnalytics />
      </div>
    </>
  );
}
