'use client';
import { useQuery } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
import { couponApi } from '@/lib/endpoints';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import type { Coupon } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/layout';
import { Badge, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { CopyButton } from '@/components/ui/misc';
import { ButtonLink } from '@/components/ui/button';

function couponState(c: Coupon): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  const now = Date.now();
  if (!c.isActive) return { label: 'Paused by business', tone: 'neutral' };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: 'Starts ' + formatDate(c.startsAt), tone: 'warning' };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return { label: 'Expired', tone: 'danger' };
  return { label: 'Active', tone: 'success' };
}

const discount = (c: Coupon) =>
  c.discountType === 'PERCENTAGE' ? `${Number(c.discountValue)}% off` : `${formatMoney(c.discountValue, c.campaign?.currency ?? 'NGN')} off`;

export default function AffiliateCouponsPage() {
  const q = useQuery({ queryKey: ['affiliate-coupons'], queryFn: couponApi.mine });
  return (
    <>
      <PageHeader title="My coupons" description="Codes issued to you by businesses. Share a code and sales that use it are credited to you." />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-6 w-6" />}
          title="No coupons yet"
          description="When a business issues you a coupon for one of its campaigns, it appears here."
          action={<ButtonLink href="/marketplace" variant="secondary">Browse campaigns</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {q.data!.map((c) => {
            const s = couponState(c);
            return (
              <li key={c.id}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate">{c.campaign?.name ?? 'Campaign'}{c.campaign?.business ? ` · ${c.campaign.business.name}` : ''}</p>
                      <p className="mt-1 font-mono text-xl font-semibold tracking-wide text-navy-800">{c.code}</p>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-slate">Customer gets</dt><dd className="font-medium text-navy-800">{discount(c)}</dd></div>
                    <div><dt className="text-xs text-slate">Redemption limit</dt><dd className="font-medium text-navy-800">{c.maxRedemptions ? formatNumber(c.maxRedemptions) : 'No limit'}</dd></div>
                    <div><dt className="text-xs text-slate">Valid until</dt><dd className="font-medium text-navy-800">{c.expiresAt ? formatDate(c.expiresAt) : 'No end date'}</dd></div>
                  </dl>
                  <div className="mt-4"><CopyButton value={c.code} label="Copy code" /></div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
