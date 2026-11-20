'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { campaignStatus } from '@/lib/status';
import { payoutLabel, formatDate } from '@/lib/format';
import type { Campaign, CampaignStatus } from '@/lib/types';
import { PageHeader, Tabs, DataTable } from '@/components/ui/layout';
import { StatusBadge, EmptyState, ErrorState, LoadingBlock, Callout } from '@/components/ui/feedback';
import { Modal, ConfirmDialog } from '@/components/ui/overlay';
import { Button } from '@/components/ui/button';
import { CampaignTerms, CommissionHeadline, AccessBadge } from '@/components/campaign/campaign-bits';

type Decision = 'APPROVED' | 'REJECTED' | 'SUSPENDED';
type Tab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ALL';

const checklist = [
  'Business is verified and the offer matches what they sell',
  'Commission terms are clear and realistic',
  'Landing page works and matches the brief',
  'No misleading claims, prohibited products or unsafe instructions',
];

export default function AdminCampaignsPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const q = useQuery({ queryKey: ['admin', 'campaigns'], queryFn: () => adminApi.campaigns() });
  const [open, setOpen] = useState<Campaign | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const m = useApiMutation((v: { id: string; decision: Decision; reason?: string }) => adminApi.reviewCampaign(v.id, v.decision, v.reason), {
    success: (_r, v) => ({ APPROVED: 'Campaign approved and live', REJECTED: 'Campaign rejected', SUSPENDED: 'Campaign suspended' })[v.decision],
    successDescription: 'The business was notified and the action was recorded in the audit log.',
    invalidate: [['admin']],
    onSuccess: () => {
      setDecision(null);
      setOpen(null);
    },
  });

  // Drafts are private to businesses; admins only see submitted campaigns here.
  const all = (q.data ?? []).filter((c) => c.status !== 'DRAFT');
  const rows = tab === 'ALL' ? all : all.filter((c) => c.status === (tab as CampaignStatus));
  const count = (s: CampaignStatus) => all.filter((c) => c.status === s).length;

  return (
    <>
      <PageHeader eyebrow="Administration" title="Campaign moderation" description="Only approved campaigns are visible in the marketplace." />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'PENDING', label: 'Awaiting review', count: count('PENDING') },
          { value: 'APPROVED', label: 'Live', count: count('APPROVED') },
          { value: 'REJECTED', label: 'Rejected', count: count('REJECTED') },
          { value: 'SUSPENDED', label: 'Suspended', count: count('SUSPENDED') },
          { value: 'ALL', label: 'All', count: all.length },
        ]}
      />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title={tab === 'PENDING' ? 'No campaigns waiting' : 'Nothing here'} />
      ) : (
        <DataTable
          caption="Campaigns"
          rows={rows}
          rowKey={(c) => c.id}
          onRowClick={setOpen}
          columns={[
            { key: 'name', header: 'Campaign', cell: (c) => <div><p className="font-semibold">{c.name}</p><p className="text-xs text-slate">{c.business?.name}</p></div> },
            { key: 'com', header: 'Commission', cell: (c) => <span className="tabular-nums">{payoutLabel(c)} · {c.action}</span> },
            { key: 'access', header: 'Access', cell: (c) => <AccessBadge access={c.access} />, hideOnMobile: true },
            { key: 'updated', header: 'Updated', cell: (c) => formatDate(c.updatedAt), hideOnMobile: true },
            { key: 'status', header: 'Status', cell: (c) => <StatusBadge map={campaignStatus} value={c.status} /> },
          ]}
        />
      )}

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        variant="drawer"
        title={open?.name ?? ''}
        description={open?.business?.name}
        footer={
          open && (
            <>
              {open.status === 'APPROVED' && (
                <Button variant="danger" onClick={() => setDecision('SUSPENDED')}>
                  Suspend
                </Button>
              )}
              {open.status === 'PENDING' && (
                <>
                  <Button variant="danger" onClick={() => setDecision('REJECTED')}>
                    Reject
                  </Button>
                  <Button onClick={() => setDecision('APPROVED')}>Approve & publish</Button>
                </>
              )}
              {open.status === 'SUSPENDED' && <Button onClick={() => setDecision('APPROVED')}>Reinstate</Button>}
            </>
          )
        }
      >
        {open && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge map={campaignStatus} value={open.status} />
              <AccessBadge access={open.access} />
            </div>
            <CommissionHeadline c={open} size="lg" />
            <div>
              <p className="text-sm font-medium text-navy-700">Brief</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate">{open.description}</p>
            </div>
            {open.instructions && (
              <div>
                <p className="text-sm font-medium text-navy-700">Instructions</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate">{open.instructions}</p>
              </div>
            )}
            <CampaignTerms c={open} />
            {open.destinationUrl && (
              <a href={open.destinationUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 underline">
                Open landing page <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {open.rejectionReason && <Callout tone="danger" title="Previous reason">{open.rejectionReason}</Callout>}
            {open.status === 'PENDING' && (
              <div className="rounded-xl border border-line bg-mist p-4">
                <p className="text-sm font-semibold text-navy-800">Review checklist</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
                  {checklist.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision === 'APPROVED' ? (open?.status === 'SUSPENDED' ? 'Reinstate this campaign?' : 'Approve and publish?') : decision === 'REJECTED' ? 'Reject this campaign?' : 'Suspend this campaign?'}
        description={
          decision === 'APPROVED'
            ? 'It will appear in the marketplace immediately and affiliates can start joining.'
            : decision === 'SUSPENDED'
              ? 'It will be hidden from the marketplace and existing referral links will stop redirecting.'
              : 'The business will see your reason and can edit and resubmit.'
        }
        confirmLabel={decision === 'APPROVED' ? 'Approve' : decision === 'REJECTED' ? 'Reject' : 'Suspend'}
        tone={decision === 'APPROVED' ? 'primary' : 'danger'}
        reason={decision === 'APPROVED' ? undefined : { label: 'Reason shown to the business', required: true }}
        loading={m.isPending}
        onConfirm={(reason) => open && decision && m.mutate({ id: open.id, decision, reason: reason || undefined })}
      />
    </>
  );
}
