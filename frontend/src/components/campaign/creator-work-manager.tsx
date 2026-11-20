'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { creatorWorkApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { formatDate, formatMoney } from '@/lib/format';
import type { Campaign, CreatorDeliverable, CreatorPayment, CreatorPaymentDecision, DeliverableDecision } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { Badge, Callout, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import { Input, Textarea, FormError } from '@/components/ui/form';
import { deliverableStatus } from '@/components/campaign/creator-deliverables';
import { creatorPaymentStatus } from '@/lib/creator-status';

const decisionLabel: Record<DeliverableDecision, string> = { IN_REVIEW: 'Start review', APPROVED: 'Approve', REVISION_REQUESTED: 'Request changes', REJECTED: 'Reject' };
const nextDecisions: Record<string, DeliverableDecision[]> = {
  SUBMITTED: ['IN_REVIEW', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED'],
  IN_REVIEW: ['APPROVED', 'REVISION_REQUESTED', 'REJECTED'],
  REVISION_REQUESTED: ['IN_REVIEW', 'APPROVED', 'REJECTED'],
};
const paymentNext: Record<string, CreatorPaymentDecision[]> = { APPROVED: ['PROCESSING', 'PAID', 'FAILED'], PROCESSING: ['PAID', 'FAILED'], FAILED: ['PROCESSING'] };
const payLabel: Record<CreatorPaymentDecision, string> = { PROCESSING: 'Mark as processing', PAID: 'Mark as paid', FAILED: 'Mark as failed' };

function ReviewDialog({ d, decision, onClose }: { d: CreatorDeliverable; decision: DeliverableDecision; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const needsNotes = decision === 'REVISION_REQUESTED' || decision === 'REJECTED';
  const m = useApiMutation((b: { decision: DeliverableDecision; reviewNotes?: string }) => creatorWorkApi.review(d.id, b), {
    success: 'Deliverable updated',
    invalidate: [['campaigns', d.campaignId, 'deliverables'], ['campaigns', d.campaignId, 'creator-payments']],
    onSuccess: onClose,
  });
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate">{d.title} by {d.affiliate?.user.fullName ?? 'the creator'}</p>
      <Textarea label={needsNotes ? 'Tell the creator why' : 'Note (optional)'} value={notes} onChange={(e) => { setNotes(e.target.value); setErr(''); }} error={err} />
      <FormError message={m.error ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant={decision === 'REJECTED' ? 'danger' : 'primary'}
          loading={m.isPending}
          onClick={() => {
            if (needsNotes && notes.trim().length < 3) return setErr('Add a short note so the creator knows what to do next.');
            m.mutate({ decision, reviewNotes: notes.trim() || undefined });
          }}
        >
          {decisionLabel[decision]}
        </Button>
      </div>
    </div>
  );
}

function PaymentDialog({ p, decision, onClose }: { p: CreatorPayment; decision: CreatorPaymentDecision; onClose: () => void }) {
  const [err, setErr] = useState<Record<string, string>>({});
  const m = useApiMutation((b: Parameters<typeof creatorWorkApi.updatePayment>[1]) => creatorWorkApi.updatePayment(p.id, b), {
    success: 'Payment updated',
    invalidate: [['campaigns', p.campaignId, 'creator-payments']],
    onSuccess: onClose,
  });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        if (decision === 'PAID' && !f.paymentReference?.trim()) return setErr({ paymentReference: 'Enter the transfer or payment reference.' });
        setErr({});
        m.mutate({ decision, paymentReference: f.paymentReference?.trim() || undefined, paymentProvider: f.paymentProvider?.trim() || undefined, adminNote: f.adminNote?.trim() || undefined });
      }}
    >
      <Callout tone="neutral">Flyover records this payment, it does not send money. Pay the creator yourself first, then mark it paid.</Callout>
      <p className="text-sm text-slate">{p.affiliate?.user.fullName ?? 'Creator'} · {formatMoney(p.amount, p.currency)}</p>
      <Input label={decision === 'PAID' ? 'Payment reference' : 'Payment reference (optional)'} name="paymentReference" defaultValue={p.paymentReference ?? ''} error={err.paymentReference} />
      <Input label="Paid through (optional)" name="paymentProvider" defaultValue={p.paymentProvider ?? ''} hint="For example: bank transfer, Paystack." />
      <Textarea label="Note to the creator (optional)" name="adminNote" defaultValue={p.adminNote ?? ''} />
      <FormError message={m.error ? (m.error instanceof ApiError && m.error.status === 403 ? 'Only business owners and admins can update creator payments.' : (m.error as Error).message) : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant={decision === 'FAILED' ? 'danger' : 'primary'} loading={m.isPending}>{payLabel[decision]}</Button>
      </div>
    </form>
  );
}

export function CreatorWorkManager({ c }: { c: Campaign }) {
  const [review, setReview] = useState<{ d: CreatorDeliverable; decision: DeliverableDecision } | null>(null);
  const [pay, setPay] = useState<{ p: CreatorPayment; decision: CreatorPaymentDecision } | null>(null);
  const del = useQuery({ queryKey: ['campaigns', c.id, 'deliverables'], queryFn: () => creatorWorkApi.forCampaign(c.id) });
  const pays = useQuery({ queryKey: ['campaigns', c.id, 'creator-payments'], queryFn: () => creatorWorkApi.paymentsForCampaign(c.id) });
  const quick = useApiMutation((v: { id: string }) => creatorWorkApi.review(v.id, { decision: 'IN_REVIEW' }), { success: 'Review started', invalidate: [['campaigns', c.id, 'deliverables']] });
  return (
    <>
      <Card>
        <CardHeader title="Creator deliverables" description={`Each creator needs ${c.requiredDeliverables ?? 1} approved deliverable${(c.requiredDeliverables ?? 1) === 1 ? '' : 's'} to earn the fixed fee.`} />
        {del.isLoading ? <LoadingBlock rows={1} /> : del.isError ? <ErrorState error={del.error} onRetry={() => del.refetch()} /> : (del.data ?? []).length === 0 ? (
          <p className="text-sm text-slate">No deliverables yet. They appear here when approved creators submit their work.</p>
        ) : (
          <ul className="divide-y divide-line">
            {del.data!.map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-800">{d.title} <span className="text-xs font-normal text-slate">v{d.version}</span></p>
                    <p className="text-xs text-slate">{d.affiliate?.user.fullName ?? 'Creator'} · submitted {formatDate(d.submittedAt)}</p>
                    <a href={d.assetUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:underline">Open content <ExternalLink className="h-3 w-3" /></a>
                    {d.description && <p className="mt-1 text-xs text-slate">{d.description}</p>}
                  </div>
                  <Badge tone={deliverableStatus[d.status].tone}>{deliverableStatus[d.status].label}</Badge>
                </div>
                {nextDecisions[d.status] && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {nextDecisions[d.status]!.map((x) =>
                      x === 'IN_REVIEW' ? (
                        <Button key={x} size="sm" variant="secondary" loading={quick.isPending && quick.variables?.id === d.id} onClick={() => quick.mutate({ id: d.id })}>{decisionLabel[x]}</Button>
                      ) : (
                        <Button key={x} size="sm" variant={x === 'APPROVED' ? 'primary' : 'secondary'} onClick={() => setReview({ d, decision: x })}>{decisionLabel[x]}</Button>
                      ),
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader title="Creator payments" description="Fixed fees you owe. Pay the creator yourself, then record it here." />
        {pays.isLoading ? <LoadingBlock rows={1} /> : pays.isError ? <ErrorState error={pays.error} onRetry={() => pays.refetch()} /> : (pays.data ?? []).length === 0 ? (
          <p className="text-sm text-slate">A payment record is created when a creator submits their first deliverable.</p>
        ) : (
          <ul className="divide-y divide-line">
            {pays.data!.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{p.affiliate?.user.fullName ?? 'Creator'} · {formatMoney(p.amount, p.currency)}</p>
                    <p className="text-xs text-slate">{creatorPaymentStatus[p.status].help}{p.paymentReference ? ` Ref: ${p.paymentReference}.` : ''}</p>
                  </div>
                  <Badge tone={creatorPaymentStatus[p.status].tone}>{creatorPaymentStatus[p.status].label}</Badge>
                </div>
                {paymentNext[p.status] && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {paymentNext[p.status]!.map((x) => <Button key={x} size="sm" variant={x === 'PAID' ? 'primary' : 'secondary'} onClick={() => setPay({ p, decision: x })}>{payLabel[x]}</Button>)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal open={!!review} onClose={() => setReview(null)} title={review ? decisionLabel[review.decision] : ''} description={c.name}>
        {review && <ReviewDialog key={review.d.id + review.decision} d={review.d} decision={review.decision} onClose={() => setReview(null)} />}
      </Modal>
      <Modal open={!!pay} onClose={() => setPay(null)} title={pay ? payLabel[pay.decision] : ''} description={c.name}>
        {pay && <PaymentDialog key={pay.p.id + pay.decision} p={pay.p} decision={pay.decision} onClose={() => setPay(null)} />}
      </Modal>
    </>
  );
}
