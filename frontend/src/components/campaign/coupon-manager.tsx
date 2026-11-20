'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Ticket } from 'lucide-react';
import { campaignApi, couponApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { formatDate, formatMoney, formatNumber, parseAmount } from '@/lib/format';
import type { Campaign, Coupon, CouponDiscountType } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import { Input, Select, FormError } from '@/components/ui/form';

const discountLabel = (c: Coupon, currency: string) =>
  c.discountType === 'PERCENTAGE' ? `${Number(c.discountValue)}% off` : `${formatMoney(c.discountValue, currency)} off`;

function IssueCoupon({ c, onClose }: { c: Campaign; onClose: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [type, setType] = useState<CouponDiscountType>('PERCENTAGE');
  const apps = useQuery({ queryKey: ['campaigns', c.id, 'applications'], queryFn: () => campaignApi.applications(c.id) });
  const affiliates = (apps.data ?? []).filter((a) => a.status === 'APPROVED');
  const m = useApiMutation((b: Parameters<typeof couponApi.create>[1]) => couponApi.create(c.id, b), {
    success: 'Coupon issued',
    successDescription: 'The affiliate can now see it under My coupons.',
    invalidate: [['campaigns', c.id, 'coupons']],
    onSuccess: onClose,
  });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        const err: Record<string, string> = {};
        if (!f.affiliateId) err.affiliateId = 'Choose an affiliate.';
        if (!/^[a-zA-Z0-9_-]{3,40}$/.test(f.code ?? '')) err.code = '3–40 letters, numbers, dashes or underscores.';
        const v = parseAmount(f.discountValue ?? '');
        if (!v.ok) err.discountValue = v.message;
        else if (type === 'PERCENTAGE' && v.value > 100) err.discountValue = 'Cannot exceed 100%.';
        const limit = f.maxRedemptions ? Number(f.maxRedemptions) : undefined;
        if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) err.maxRedemptions = 'Enter a whole number, 1 or more.';
        setErrors(err);
        if (Object.keys(err).length) return;
        m.mutate(
          {
            affiliateId: f.affiliateId!,
            code: f.code!.trim(),
            discountType: type,
            discountValue: (v as { value: number }).value,
            maxRedemptions: limit,
            expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59`).toISOString() : undefined,
          },
          { onError: (er) => er instanceof ApiError && setErrors(er.fieldErrors) },
        );
      }}
    >
      <Select
        label="Affiliate"
        name="affiliateId"
        placeholder={apps.isLoading ? 'Loading affiliates…' : affiliates.length ? 'Choose an affiliate' : 'No approved affiliates yet'}
        options={affiliates.map((a) => ({ value: a.affiliateId, label: a.affiliate?.user.fullName ?? a.affiliateId }))}
        error={errors.affiliateId}
        hint="Only affiliates already approved for this campaign can receive a coupon."
      />
      <Input label="Coupon code" name="code" placeholder="e.g. AMAKA10" error={errors.code} hint="Codes are saved in capitals and must be unique." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Discount type" value={type} onChange={(e) => setType(e.target.value as CouponDiscountType)} options={[{ value: 'PERCENTAGE', label: 'Percentage' }, { value: 'FIXED_AMOUNT', label: 'Fixed amount' }]} />
        <Input label="Discount value" name="discountValue" inputMode="decimal" prefix={type === 'FIXED_AMOUNT' ? '₦' : undefined} suffix={type === 'PERCENTAGE' ? '%' : undefined} error={errors.discountValue} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Redemption limit (optional)" name="maxRedemptions" inputMode="numeric" error={errors.maxRedemptions} />
        <Input label="Expires on (optional)" name="expiresAt" type="date" error={errors.expiresAt} />
      </div>
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={m.isPending}>Issue coupon</Button>
      </div>
    </form>
  );
}

export function CouponManager({ c }: { c: Campaign }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['campaigns', c.id, 'coupons'], queryFn: () => couponApi.forCampaign(c.id) });
  const toggle = useApiMutation((v: { id: string; isActive: boolean }) => couponApi.update(v.id, { isActive: v.isActive }), {
    success: (_r, v) => (v.isActive ? 'Coupon resumed' : 'Coupon paused'),
    invalidate: [['campaigns', c.id, 'coupons']],
  });
  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader
        title="Coupons"
        description="Give an affiliate a code their audience can use. Sales that use it are credited to them."
        action={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Issue coupon</Button>}
      />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Ticket className="h-6 w-6" />} title="No coupons yet" className="border-0 p-6" description="Issue a coupon to an approved affiliate to track sales by code." />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-navy-800">{k.code}</p>
                <p className="text-xs text-slate">
                  {k.affiliate?.user?.fullName ?? 'Affiliate'} · {discountLabel(k, c.currency)} · {k.maxRedemptions ? `limit ${formatNumber(k.maxRedemptions)}` : 'no limit'} · {k.expiresAt ? `expires ${formatDate(k.expiresAt)}` : 'no end date'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={k.isActive ? 'success' : 'neutral'}>{k.isActive ? 'Active' : 'Paused'}</Badge>
                <Button size="sm" variant="secondary" loading={toggle.isPending && toggle.variables?.id === k.id} onClick={() => toggle.mutate({ id: k.id, isActive: !k.isActive })}>
                  {k.isActive ? 'Pause' : 'Resume'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Issue a coupon" description={`For ${c.name}`}>
        <IssueCoupon c={c} onClose={() => setOpen(false)} />
      </Modal>
    </Card>
  );
}
