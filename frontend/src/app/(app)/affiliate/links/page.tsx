'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, MousePointerClick, ArrowLeftRight, Hourglass, AlertTriangle, Ticket } from 'lucide-react';
import { referralApi } from '@/lib/endpoints';
import { localApplications, type LocalApplication } from '@/lib/hooks';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { PageHeader, StatCard, Card } from '@/components/ui/layout';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingBlock, Badge, ComingSoon, StatusBadge } from '@/components/ui/feedback';
import { ReferralLinkBox } from '@/components/campaign/referral-link-box';
import { campaignStatus } from '@/lib/status';

export default function MyLinksPage() {
  const q = useQuery({ queryKey: ['referrals'], queryFn: referralApi.mine });
  const [apps, setApps] = useState<Record<string, LocalApplication>>({});
  useEffect(() => setApps(localApplications.all()), []);
  const refs = q.data ?? [];
  const clicks = refs.reduce((s, r) => s + (r._count?.clicks ?? 0), 0);
  const convs = refs.reduce((s, r) => s + (r._count?.conversions ?? 0), 0);
  const pendingApps = Object.entries(apps).filter(([cid, a]) => a.status === 'PENDING' && !refs.some((r) => r.campaignId === cid));

  return (
    <>
      <PageHeader title="My links" description="Your unique referral links. Share them anywhere — every click is tracked to you." actions={<ButtonLink href="/marketplace" variant="secondary">Find more campaigns</ButtonLink>} />
      {q.isLoading ? (
        <LoadingBlock rows={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Active links" value={formatNumber(refs.filter((r) => r.campaign?.status === 'APPROVED').length)} icon={<Link2 className="h-5 w-5" />} />
            <StatCard label="Total clicks" value={formatNumber(clicks)} icon={<MousePointerClick className="h-5 w-5" />} />
            <StatCard label="Conversions recorded" value={formatNumber(convs)} hint={clicks ? `${formatPercent((convs / clicks) * 100)} of clicks` : undefined} icon={<ArrowLeftRight className="h-5 w-5" />} />
          </div>

          {pendingApps.length > 0 && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-navy-800">
                <Hourglass className="h-4 w-4 text-warning-600" /> Awaiting business approval
              </h2>
              <ul className="divide-y divide-line">
                {pendingApps.map(([cid, a]) => (
                  <li key={cid} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/marketplace/${cid}`} className="font-medium text-navy-700 hover:underline">
                      {a.campaignName}
                    </Link>
                    <span className="text-xs text-slate">Applied {formatDate(a.at)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate">Tracked on this device. Your link appears below as soon as the business approves you.</p>
            </Card>
          )}

          {refs.length === 0 ? (
            <EmptyState
              icon={<Link2 className="h-6 w-6" />}
              title="No links yet"
              description="Join an open campaign or get approved for one to receive your unique referral link."
              action={<ButtonLink href="/marketplace">Browse the marketplace</ButtonLink>}
            />
          ) : (
            <ul className="space-y-4">
              {refs.map((r) => {
                const live = r.campaign?.status === 'APPROVED';
                const cl = r._count?.clicks ?? 0;
                const cv = r._count?.conversions ?? 0;
                return (
                  <li key={r.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/marketplace/${r.campaignId}`} className="font-semibold text-navy-800 hover:underline">
                          {r.campaign?.name}
                        </Link>
                        <p className="text-xs text-slate">Joined {formatDate(r.createdAt)}</p>
                      </div>
                      {live ? <Badge tone="success">Tracking</Badge> : r.campaign && <StatusBadge map={campaignStatus} value={r.campaign.status} />}
                    </div>
                    {!live && (
                      <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-warning-50 px-3 py-2 text-xs font-medium text-warning-700">
                        <AlertTriangle className="h-3.5 w-3.5" /> This campaign isn&apos;t live, so the link won&apos;t redirect. Stop sharing it for now.
                      </p>
                    )}
                    <div className="mt-4">
                      <ReferralLinkBox code={r.code} title={r.campaign?.name ?? 'Flyover'} compact={!live} />
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                      <div>
                        <dt className="text-xs text-slate">Clicks</dt>
                        <dd className="text-lg font-bold tabular-nums text-navy-800">{formatNumber(cl)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate">Conversions</dt>
                        <dd className="text-lg font-bold tabular-nums text-navy-800">{formatNumber(cv)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate">Conv. rate</dt>
                        <dd className="text-lg font-bold tabular-nums text-navy-800">{cl ? formatPercent((cv / cl) * 100) : '—'}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-center text-[11px] text-slate">
                      Referral code <code className="font-semibold text-navy-700">{r.code}</code> — businesses use it to record your sales.
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <ComingSoon title="Coupon codes" endpoint="Coupon attribution (roadmap phase 11)">
            <span className="inline-flex items-center gap-1.5">
              <Ticket className="h-4 w-4" /> Campaigns that support coupon tracking will show your personal coupon code here.
            </span>
          </ComingSoon>
        </div>
      )}
    </>
  );
}
