'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { businessStatus } from '@/lib/status';
import { formatDate } from '@/lib/format';
import type { AdminBusiness, BusinessStatus } from '@/lib/types';
import { PageHeader, Tabs, DataTable, DescriptionList } from '@/components/ui/layout';
import { StatusBadge, EmptyState, ErrorState, LoadingBlock, Callout } from '@/components/ui/feedback';
import { Modal, ConfirmDialog } from '@/components/ui/overlay';
import { Button } from '@/components/ui/button';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

export default function AdminBusinessesPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const q = useQuery({ queryKey: ['admin', 'businesses'], queryFn: () => adminApi.businesses() });
  const [open, setOpen] = useState<AdminBusiness | null>(null);
  const [confirm, setConfirm] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const review = useApiMutation((v: { id: string; decision: 'APPROVED' | 'REJECTED'; notes?: string }) => adminApi.reviewBusiness(v.id, v.decision, v.notes), {
    success: (_r, v) => (v.decision === 'APPROVED' ? 'Business approved' : 'Business rejected'),
    successDescription: 'The business has been notified and the action was recorded in the audit log.',
    invalidate: [['admin']],
    onSuccess: () => {
      setConfirm(null);
      setOpen(null);
    },
  });

  const all = q.data ?? [];
  // Only businesses that have actually submitted are "in the queue"; fresh sign-ups also start as PENDING.
  const awaiting = all.filter((b) => b.status === 'PENDING' && b.submittedAt);
  const rows = tab === 'ALL' ? all : tab === 'PENDING' ? awaiting : all.filter((b) => b.status === (tab as BusinessStatus));
  const notSubmitted = all.filter((b) => b.status === 'PENDING' && !b.submittedAt).length;

  return (
    <>
      <PageHeader eyebrow="Administration" title="Business verification" description="Approve businesses before they can create products and publish campaigns." />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'PENDING', label: 'Awaiting review', count: awaiting.length },
          { value: 'APPROVED', label: 'Approved', count: all.filter((b) => b.status === 'APPROVED').length },
          { value: 'REJECTED', label: 'Rejected', count: all.filter((b) => b.status === 'REJECTED').length },
          { value: 'ALL', label: 'All', count: all.length },
        ]}
      />
      {tab === 'PENDING' && notSubmitted > 0 && (
        <p className="mb-3 text-xs text-slate">{notSubmitted} business account(s) registered but haven&apos;t submitted verification details yet (visible under All).</p>
      )}
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<BadgeCheck className="h-6 w-6" />} title={tab === 'PENDING' ? 'Queue is clear' : 'Nothing here'} description={tab === 'PENDING' ? 'No businesses are waiting for verification.' : undefined} />
      ) : (
        <DataTable
          caption="Businesses"
          rows={rows}
          rowKey={(b) => b.id}
          onRowClick={setOpen}
          columns={[
            { key: 'name', header: 'Business', cell: (b) => <div><p className="font-semibold">{b.name}</p><p className="text-xs text-slate">{b.user.email}</p></div> },
            { key: 'reg', header: 'Reg. number', cell: (b) => b.registrationNumber ?? '—' },
            { key: 'submitted', header: 'Submitted', cell: (b) => (b.submittedAt ? formatDate(b.submittedAt) : <span className="text-slate">Not submitted</span>) },
            { key: 'status', header: 'Status', cell: (b) => <StatusBadge map={businessStatus} value={b.status} /> },
          ]}
        />
      )}

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        variant="drawer"
        title={open?.name ?? ''}
        description={open ? `Owner: ${open.user.fullName} · ${open.user.email}` : undefined}
        footer={
          open && open.status !== 'APPROVED' && open.submittedAt ? (
            <>
              <Button variant="danger" onClick={() => setConfirm('REJECTED')}>
                Reject
              </Button>
              <Button onClick={() => setConfirm('APPROVED')}>Approve business</Button>
            </>
          ) : undefined
        }
      >
        {open && (
          <div className="space-y-5">
            {!open.submittedAt && <Callout tone="neutral">This business has not submitted verification details yet.</Callout>}
            <DescriptionList
              items={[
                { label: 'Status', value: <StatusBadge map={businessStatus} value={open.status} /> },
                { label: 'Registration no.', value: open.registrationNumber ?? '—' },
                { label: 'Country', value: open.country },
                {
                  label: 'Website',
                  value: open.website ? (
                    <a href={open.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-navy-600 underline">
                      {open.website.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Registered', value: formatDate(open.createdAt) },
                { label: 'Submitted', value: formatDate(open.submittedAt, true) },
                { label: 'Last reviewed', value: formatDate(open.reviewedAt, true) },
              ]}
            />
            <div>
              <p className="text-sm font-medium text-navy-700">About</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate">{open.description || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-navy-700">Notes</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate">{open.verificationNotes || '—'}</p>
            </div>
            <Callout tone="info">Check the registration number on the CAC public search before approving. Document uploads are coming soon.</Callout>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === 'APPROVED' ? `Approve ${open?.name}?` : `Reject ${open?.name}?`}
        description={confirm === 'APPROVED' ? 'They will be able to create products and submit campaigns for review.' : 'The business will see your reason and can resubmit.'}
        confirmLabel={confirm === 'APPROVED' ? 'Approve' : 'Reject'}
        tone={confirm === 'APPROVED' ? 'primary' : 'danger'}
        reason={confirm === 'REJECTED' ? { label: 'Reason shown to the business', required: true, placeholder: 'e.g. Registration number does not match business name.' } : { label: 'Internal note (optional)' }}
        loading={review.isPending}
        onConfirm={(notes) => open && confirm && review.mutate({ id: open.id, decision: confirm, notes: notes || undefined })}
      />
    </>
  );
}
