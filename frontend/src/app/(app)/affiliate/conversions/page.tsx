'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, referralApi, walletApi } from '@/lib/endpoints';
import { conversionStatus } from '@/lib/status';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import type { ConversionStatus } from '@/lib/types';
import { PageHeader, Card, CardHeader, DataTable } from '@/components/ui/layout';
import { StatusBadge, ErrorState, LoadingBlock, ComingSoon, EmptyState } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';

const ORDER: ConversionStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'REVERSED', 'DISPUTED'];

export default function AffiliateConversionsPage() {
  const a = useQuery({ queryKey: ['analytics', 'affiliate'], queryFn: analyticsApi.affiliate });
  const refs = useQuery({ queryKey: ['referrals'], queryFn: referralApi.mine });
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: walletApi.get });
  if (a.isLoading || refs.isLoading) return <LoadingBlock rows={4} />;
  if (a.isError) return <ErrorState error={a.error} onRetry={() => a.refetch()} />;
  const by = Object.fromEntries((a.data?.conversionsByStatus ?? []).map((x) => [x.status, x._count._all])) as Partial<Record<ConversionStatus, number>>;
  const earned = (wallet.data?.transactions ?? []).filter((t) => t.type === 'PENDING_CREDIT');

  return (
    <>
      <PageHeader title="Conversions" description="Sales and leads that businesses have recorded from your links, and what happened to them." />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ORDER.map((s) => (
            <div key={s} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <StatusBadge map={conversionStatus} value={s} />
              <p className="mt-2 text-2xl font-bold tabular-nums text-navy-800">{formatNumber(by[s] ?? 0)}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Commissions earned" description="Each approved conversion creates one commission record." />
              {earned.length === 0 ? (
                <EmptyState title="No commissions yet" description="When a business approves a conversion from your link, the commission shows here." className="border-none" action={<ButtonLink href="/affiliate/links" variant="secondary">View my links</ButtonLink>} />
              ) : (
                <DataTable
                  rows={earned}
                  rowKey={(t) => t.id}
                  columns={[
                    { key: 'd', header: 'Date', cell: (t) => formatDate(t.createdAt) },
                    { key: 'desc', header: 'Record', cell: (t) => <span className="text-slate">{t.description}</span>, hideOnMobile: true },
                    { key: 'amt', header: 'Commission', cell: (t) => <span className="font-semibold tabular-nums text-brick-500">{formatMoney(t.amount, t.currency)}</span>, align: 'right' },
                  ]}
                />
              )}
            </Card>
            <Card>
              <CardHeader title="By link" />
              {!refs.data?.length ? (
                <p className="text-sm text-slate">No links yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {refs.data.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <Link href={`/marketplace/${r.campaignId}`} className="font-medium text-navy-700 hover:underline">
                        {r.campaign?.name}
                      </Link>
                      <span className="tabular-nums text-slate">
                        {formatNumber(r._count?.conversions ?? 0)} conversions · {formatNumber(r._count?.clicks ?? 0)} clicks
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <ComingSoon title="Full conversion history with order references and rejection reasons" endpoint="GET /affiliates/conversions" />
          </div>
          <Card className="lg:self-start">
            <CardHeader title="What the statuses mean" />
            <ul className="space-y-4">
              {ORDER.map((s) => (
                <li key={s}>
                  <StatusBadge map={conversionStatus} value={s} />
                  <p className="mt-1 text-sm text-slate">{conversionStatus[s].help}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-xs text-slate">
              Think a conversion was rejected unfairly? Contact <a className="font-medium text-navy-700 underline" href="mailto:support@flyover.ng">support@flyover.ng</a> with the order reference. In-app disputes are coming soon.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
