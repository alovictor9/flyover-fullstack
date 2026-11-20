'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Plus, ExternalLink, Scale } from 'lucide-react';
import { z } from 'zod';
import { conversionApi, campaignApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { conversionStatus, commissionStatus } from '@/lib/status';
import { formatDate, formatMoney, parseAmount, commissionLabel } from '@/lib/format';
import { attributionLabel, isAutomaticSource } from '@/lib/attribution';
import { ApiError } from '@/lib/api-client';
import type { Conversion, ConversionStatus } from '@/lib/types';
import { PageHeader, Tabs, DataTable, DescriptionList } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { Modal, ConfirmDialog } from '@/components/ui/overlay';
import { Input, FormError, Select } from '@/components/ui/form';
import { StatusBadge, EmptyState, ErrorState, LoadingBlock, Callout, ComingSoon } from '@/components/ui/feedback';

const schema = z.object({
  referralCode: z.string().trim().min(5, 'Enter the affiliate’s referral code'),
  externalReference: z.string().trim().min(2, 'Enter your order / transaction reference'),
  amount: z.string(),
  customerReference: z.string().trim(),
  evidenceUrl: z.string().trim().url('Enter a full URL').or(z.literal('')),
  convertedAt: z.string(),
});

function SubmitConversion({ onDone }: { onDone: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useApiMutation(conversionApi.submit, {
    success: 'Conversion recorded',
    successDescription: 'It’s pending your review. The affiliate has been notified.',
    invalidate: [['conversions'], ['analytics']],
    onSuccess: onDone,
  });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
        if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])));
        const amt = parseAmount(parsed.data.amount);
        if (!amt.ok) return setErrors({ amount: amt.message });
        const d = parsed.data;
        if (d.convertedAt && new Date(d.convertedAt) > new Date()) return setErrors({ convertedAt: 'Date can’t be in the future' });
        setErrors({});
        m.mutate(
          {
            referralCode: d.referralCode,
            externalReference: d.externalReference,
            amount: amt.value,
            currency: 'NGN',
            customerReference: d.customerReference || undefined,
            evidenceUrl: d.evidenceUrl || undefined,
            convertedAt: d.convertedAt ? new Date(d.convertedAt).toISOString() : undefined,
          },
          {
            onError: (err) => {
              if (!(err instanceof ApiError)) return;
              if (err.status === 404) setErrors({ referralCode: 'No live campaign of yours uses this referral code.' });
              else if (err.code === 'CONFLICT') setErrors({ externalReference: 'This order reference was already recorded for this campaign.' });
              else setErrors(err.fieldErrors);
            },
          },
        );
      }}
    >
      <Callout tone="info">Use this when a customer referred by an affiliate buys, signs up or completes the action you pay for.</Callout>
      <Input label="Referral code" name="referralCode" required error={errors.referralCode} placeholder="e.g. ADA-A55-x7Q2pL" hint="From the affiliate’s link (the part after /r/) or your checkout records." autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Order / transaction reference" name="externalReference" required error={errors.externalReference} placeholder="ORDER-1001" hint="Must be unique per campaign." />
        <Input label="Sale value" name="amount" required inputMode="decimal" prefix="₦" error={errors.amount} placeholder="0.00" hint="For lead/sign-up campaigns, enter the value you assign." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Customer reference" name="customerReference" hint="Optional, e.g. customer ID. Avoid personal data." />
        <Input label="Date of conversion" name="convertedAt" type="date" error={errors.convertedAt} hint="Defaults to today." />
      </div>
      <Input label="Evidence link" name="evidenceUrl" type="url" error={errors.evidenceUrl} placeholder="https://" hint="Optional: link to the receipt or order in your system." />
      <FormError message={m.error && !(m.error instanceof ApiError && (m.error.status === 404 || m.error.code === 'CONFLICT' || Object.keys(m.error.fieldErrors).length)) ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={m.isPending}>
          Record conversion
        </Button>
      </div>
    </form>
  );
}

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

function ConversionsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [adding, setAdding] = useState(sp.get('new') === '1');
  const [open, setOpen] = useState<Conversion | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  useEffect(() => {
    if (sp.get('new') === '1') router.replace('/business/conversions');
  }, [sp, router]);

  const q = useQuery({ queryKey: ['conversions'], queryFn: () => conversionApi.list() });
  const camps = useQuery({ queryKey: ['campaigns', 'mine'], queryFn: campaignApi.mine });
  const review = useApiMutation((v: { id: string; decision: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) => conversionApi.review(v.id, { decision: v.decision, rejectionReason: v.rejectionReason }), {
    success: (_r, v) => (v.decision === 'APPROVED' ? 'Conversion approved' : 'Conversion rejected'),
    successDescription: 'The affiliate was notified. Approved conversions create a pending commission in their wallet.',
    invalidate: [['conversions'], ['analytics']],
    onSuccess: () => {
      setDecision(null);
      setOpen(null);
    },
  });

  const all = (q.data ?? []).filter((c) => !campaignFilter || c.campaignId === campaignFilter);
  const rows = tab === 'ALL' ? all : all.filter((c) => c.status === (tab as ConversionStatus));
  const count = (s: ConversionStatus) => all.filter((c) => c.status === s).length;

  return (
    <>
      <PageHeader
        title="Conversions"
        description="Verify sales and leads from affiliates. Only approved conversions earn commission."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Record conversion</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'PENDING', label: 'Needs review', count: count('PENDING') },
            { value: 'APPROVED', label: 'Approved', count: count('APPROVED') },
            { value: 'REJECTED', label: 'Rejected', count: count('REJECTED') },
            { value: 'ALL', label: 'All', count: all.length },
          ]}
        />
        <Select aria-label="Filter by campaign" className="sm:w-64" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} placeholder="All campaigns" options={(camps.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-6 w-6" />}
          title={tab === 'PENDING' ? 'Nothing to review' : 'No conversions here'}
          description={tab === 'PENDING' ? 'When you record a referred sale, it appears here for approval.' : undefined}
          action={tab === 'PENDING' && <Button variant="secondary" onClick={() => setAdding(true)}>Record a conversion</Button>}
        />
      ) : (
        <DataTable
          caption="Conversions"
          rows={rows}
          rowKey={(c) => c.id}
          onRowClick={setOpen}
          columns={[
            { key: 'ref', header: 'Order ref', cell: (c) => <div><p className="font-semibold">{c.externalReference}</p><p className="text-xs text-slate">{formatDate(c.convertedAt)}</p></div> },
            { key: 'aff', header: 'Affiliate', cell: (c) => c.affiliate?.user.fullName ?? '—' },
            { key: 'src', header: 'Source', cell: (c) => <span className="text-xs text-slate">{attributionLabel(c.attributionSource)}</span>, hideOnMobile: true },
            { key: 'camp', header: 'Campaign', cell: (c) => <span className="line-clamp-1">{c.campaign?.name}</span>, hideOnMobile: true },
            { key: 'amt', header: 'Sale value', cell: (c) => <span className="tabular-nums">{formatMoney(c.amount, c.currency)}</span>, align: 'right' },
            { key: 'com', header: 'Commission', cell: (c) => (c.commission ? <span className="font-semibold tabular-nums text-brick-500">{formatMoney(c.commission.commissionAmount, c.commission.currency)}</span> : <span className="text-slate">—</span>), align: 'right' },
            { key: 'st', header: 'Status', cell: (c) => <StatusBadge map={conversionStatus} value={c.status} /> },
          ]}
        />
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Record a conversion" size="lg">
        <SubmitConversion onDone={() => setAdding(false)} />
      </Modal>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        variant="drawer"
        title={open ? `Order ${open.externalReference}` : ''}
        description={open?.campaign?.name}
        footer={
          open?.status === 'PENDING' && (
            <>
              <Button variant="danger" onClick={() => setDecision('REJECTED')}>
                Reject
              </Button>
              <Button onClick={() => setDecision('APPROVED')}>Approve conversion</Button>
            </>
          )
        }
      >
        {open && (
          <div className="space-y-5">
            <StatusBadge map={conversionStatus} value={open.status} withHelp />
            {open.rejectionReason && <Callout tone="danger" title="Rejection reason">{open.rejectionReason}</Callout>}
            {isAutomaticSource(open.attributionSource) && <Callout tone="neutral">This conversion was reported automatically by one of your integrations, not entered by hand.</Callout>}
            <div>
              <p className="mb-1 text-sm font-semibold text-navy-800">Conversion</p>
              <DescriptionList
                items={[
                  { label: 'Sale value', value: formatMoney(open.amount, open.currency) },
                  { label: 'Converted', value: formatDate(open.convertedAt, true) },
                  { label: 'Recorded', value: formatDate(open.createdAt, true) },
                  { label: 'Attributed through', value: attributionLabel(open.attributionSource) },
                  { label: 'Customer ref', value: open.customerReference ?? '—' },
                  {
                    label: 'Evidence',
                    value: open.evidenceUrl ? (
                      <a href={open.evidenceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-navy-600 underline">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      '—'
                    ),
                  },
                  { label: 'Reviewed', value: formatDate(open.reviewedAt, true) },
                ]}
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-navy-800">Attribution</p>
              <DescriptionList
                items={[
                  { label: 'Affiliate', value: `${open.affiliate?.user.fullName} (${open.affiliate?.user.email})` },
                  { label: 'Campaign', value: open.campaign?.name },
                  { label: 'Terms', value: open.campaign ? `${commissionLabel(open.campaign.commissionType, open.campaign.commissionValue, open.campaign.currency)} · ${open.campaign.validationDays}-day validation` : '—' },
                ]}
              />
            </div>
            {open.commission && (
              <div>
                <p className="mb-1 text-sm font-semibold text-navy-800">Commission</p>
                <DescriptionList
                  items={[
                    { label: 'Amount', value: <span className="text-brick-500">{formatMoney(open.commission.commissionAmount, open.commission.currency)}</span> },
                    { label: 'Status', value: <StatusBadge map={commissionStatus} value={open.commission.status} /> },
                    { label: 'Withdrawable from', value: formatDate(open.commission.availableAt) },
                  ]}
                />
              </div>
            )}
            {open.status === 'APPROVED' && (
              <ComingSoon title="Reverse or dispute" endpoint="POST /businesses/conversions/:id/reverse">
                <span className="inline-flex items-center gap-1.5">
                  <Scale className="h-4 w-4" /> Refund-driven reversals within the validation period will be available soon.
                </span>
              </ComingSoon>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision === 'APPROVED' ? 'Approve this conversion?' : 'Reject this conversion?'}
        description={
          decision === 'APPROVED' ? (
            <>
              Flyover will calculate the commission from the campaign terms and add it to the affiliate&apos;s pending balance. <b>Approval can&apos;t be undone from here.</b>
            </>
          ) : (
            'The affiliate will see your reason. No commission is created.'
          )
        }
        confirmLabel={decision === 'APPROVED' ? 'Approve' : 'Reject'}
        tone={decision === 'APPROVED' ? 'primary' : 'danger'}
        reason={decision === 'REJECTED' ? { label: 'Rejection reason', required: true, placeholder: 'e.g. Order refunded / not traceable to this affiliate' } : undefined}
        loading={review.isPending}
        onConfirm={(reason) => open && decision && review.mutate({ id: open.id, decision, rejectionReason: reason || undefined })}
      />
    </>
  );
}

export default function BusinessConversionsPage() {
  return (
    <Suspense>
      <ConversionsInner />
    </Suspense>
  );
}
