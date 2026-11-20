'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessInsightsApi } from '@/lib/endpoints';
import { formatMoney, formatNumber } from '@/lib/format';
import { Card, CardHeader, DataTable, StatCard } from '@/components/ui/layout';
import { Callout, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Input } from '@/components/ui/form';

export function AdvancedBusinessAnalytics() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const invalid = !!from && !!to && to <= from;
  const range = invalid ? {} : { from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined, to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined };
  const camps = useQuery({ queryKey: ['analytics', 'business', 'campaigns', range], queryFn: () => businessInsightsApi.campaigns(range) });
  const affs = useQuery({ queryKey: ['analytics', 'business', 'affiliates'], queryFn: businessInsightsApi.affiliates });
  const rows = camps.data ?? [];
  const sum = (k: 'conversions' | 'approvedConversions' | 'couponAttributedConversions' | 'automaticallyVerifiedConversions') => rows.reduce((s, r) => s + r[k], 0);
  const top = [...(affs.data ?? [])].sort((a, b) => b.approvedConversionValue - a.approvedConversionValue).slice(0, 10);
  return (
    <section className="space-y-6" aria-labelledby="adv-analytics">
      <div>
        <h2 id="adv-analytics" className="text-base font-semibold text-navy-800">Campaign performance</h2>
        <p className="mt-1 text-sm text-slate">Narrow the conversion figures to a date range. Affiliate and link counts always cover all time.</p>
      </div>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} error={invalid ? 'Choose a date after the start date.' : undefined} />
        </div>
      </Card>
      {camps.isLoading ? (
        <LoadingBlock rows={2} />
      ) : camps.isError ? (
        <ErrorState error={camps.error} onRetry={() => camps.refetch()} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate">No campaigns yet.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Conversions" value={formatNumber(sum('conversions'))} hint={`${formatNumber(sum('approvedConversions'))} approved`} />
            <StatCard label="Via coupon codes" value={formatNumber(sum('couponAttributedConversions'))} />
            <StatCard label="Verified automatically" value={formatNumber(sum('automaticallyVerifiedConversions'))} hint="Reported by an integration" />
            <StatCard label="Verified sales" value={formatMoney(rows.reduce((s, r) => s + r.conversionValue, 0).toFixed(2))} />
          </div>
          <DataTable
            caption="Campaign performance in the selected period"
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              { key: 'n', header: 'Campaign', cell: (r) => <span className="font-semibold">{r.name}</span> },
              { key: 'a', header: 'Affiliates with links', cell: (r) => formatNumber(r.referrals), align: 'right' },
              { key: 'c', header: 'Conversions', cell: (r) => `${formatNumber(r.approvedConversions)} / ${formatNumber(r.conversions)}`, align: 'right' },
              { key: 'k', header: 'Coupon', cell: (r) => formatNumber(r.couponAttributedConversions), align: 'right' },
              { key: 'u', header: 'Auto-verified', cell: (r) => formatNumber(r.automaticallyVerifiedConversions), align: 'right' },
              { key: 's', header: 'Verified sales', cell: (r) => formatMoney(r.conversionValue.toFixed(2)), align: 'right' },
              { key: 'm', header: 'Commission cost', cell: (r) => <span className="text-brick-500">{formatMoney(r.commissionCost.toFixed(2))}</span>, align: 'right' },
            ]}
          />
        </>
      )}
      <Card>
        <CardHeader title="Top affiliates" description="Ranked by verified sales across all campaigns. Amounts shown in naira; other currencies are listed beside the name." />
        {affs.isLoading ? <LoadingBlock rows={2} /> : affs.isError ? <ErrorState error={affs.error} onRetry={() => affs.refetch()} /> : top.length === 0 ? (
          <p className="text-sm text-slate">No approved affiliates yet.</p>
        ) : (
          <DataTable
            caption="Top affiliates"
            rows={top}
            rowKey={(r) => r.affiliateId}
            columns={[
              {
                key: 'n',
                header: 'Affiliate',
                cell: (r) => {
                  const other = Object.entries(r.approvedConversionValueByCurrency).filter(([c]) => c !== 'NGN');
                  return <span><span className="font-semibold">{r.affiliate.fullName}</span>{other.length > 0 && <span className="ml-2 text-xs text-slate">+ {other.map(([c, v]) => formatMoney(v.toFixed(2), c)).join(', ')}</span>}</span>;
                },
              },
              { key: 'c', header: 'Campaigns', cell: (r) => formatNumber(r.campaignCount), align: 'right' },
              { key: 'v', header: 'Conversions', cell: (r) => formatNumber(r.conversions), align: 'right' },
              { key: 's', header: 'Verified sales', cell: (r) => formatMoney(r.approvedConversionValue.toFixed(2)), align: 'right' },
            ]}
          />
        )}
      </Card>
      <Callout tone="neutral">Figures update as conversions are approved and may change if a sale is refunded.</Callout>
    </section>
  );
}
