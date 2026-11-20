'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { withdrawalStatus } from '@/lib/status';
import { formatDate, formatMoney } from '@/lib/format';
import type { Withdrawal, WithdrawalStatus, WithdrawalReviewInput } from '@/lib/types';
import { PageHeader, Tabs, DataTable, DescriptionList, StatCard } from '@/components/ui/layout';
import { StatusBadge, EmptyState, ErrorState, LoadingBlock, Callout } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import { Button } from '@/components/ui/button';
import { Input, Textarea, FormError } from '@/components/ui/form';
import { CopyButton } from '@/components/ui/misc';

type Decision = WithdrawalReviewInput['decision'];
const NEXT: Record<WithdrawalStatus, Decision[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['PROCESSING', 'PAID', 'FAILED'],
  PROCESSING: ['PAID', 'FAILED'],
  PAID: [],
  REJECTED: [],
  FAILED: [],
};
const ACTION_LABEL: Record<Decision, string> = { APPROVED: 'Approve', REJECTED: 'Reject', PROCESSING: 'Mark processing', PAID: 'Mark as paid', FAILED: 'Mark failed' };
type Tab = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'CLOSED';

function Act({ w, decision, onDone }: { w: Withdrawal; decision: Decision; onDone: () => void }) {
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const m = useApiMutation((b: WithdrawalReviewInput) => adminApi.reviewWithdrawal(w.id, b), {
    success: `Withdrawal ${withdrawalStatus[decision === 'APPROVED' ? 'APPROVED' : decision].label.toLowerCase()}`,
    successDescription: decision === 'REJECTED' || decision === 'FAILED' ? 'The amount was returned to the affiliate’s available balance.' : 'Recorded in the audit log.',
    invalidate: [['admin']],
    onSuccess: onDone,
  });
  const terminal = decision === 'PAID' || decision === 'REJECTED' || decision === 'FAILED';
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate">
        {ACTION_LABEL[decision]} the {formatMoney(w.amount, w.currency)} withdrawal for <b className="text-navy-800">{w.affiliate?.user.fullName}</b>.
      </p>
      {decision === 'PAID' && (
        <>
          <Callout tone="warning">This only records a payment you already made outside Flyover. It does not send money.</Callout>
          <Input label="Bank payment reference" required value={ref} onChange={(e) => setRef(e.target.value)} error={err.ref} placeholder="e.g. GTB-TRF-883120" />
        </>
      )}
      {(decision === 'REJECTED' || decision === 'FAILED') && <Callout tone="info">The amount will be returned to the affiliate&apos;s available balance.</Callout>}
      <Textarea label={decision === 'REJECTED' || decision === 'FAILED' ? 'Reason (shown to affiliate)' : 'Admin note'} required={decision === 'REJECTED' || decision === 'FAILED'} value={note} onChange={(e) => setNote(e.target.value)} error={err.note} rows={3} maxLength={1000} />
      {terminal && <p className="text-xs font-medium text-brick-600">This is a final status and cannot be changed afterwards.</p>}
      <FormError message={m.error ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant={decision === 'REJECTED' || decision === 'FAILED' ? 'accent' : 'primary'}
          loading={m.isPending}
          onClick={() => {
            const e: Record<string, string> = {};
            if (decision === 'PAID' && !ref.trim()) e.ref = 'Enter the bank reference for this payment.';
            if ((decision === 'REJECTED' || decision === 'FAILED') && !note.trim()) e.note = 'A reason is required.';
            setErr(e);
            if (Object.keys(e).length) return;
            m.mutate({ decision, adminNote: note.trim() || undefined, paymentReference: ref.trim() || undefined });
          }}
        >
          {ACTION_LABEL[decision]}
        </Button>
      </div>
    </div>
  );
}

export default function AdminWithdrawalsPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const q = useQuery({ queryKey: ['admin', 'withdrawals'], queryFn: () => adminApi.withdrawals() });
  const [open, setOpen] = useState<Withdrawal | null>(null);
  const [act, setAct] = useState<Decision | null>(null);
  const all = q.data ?? [];
  const rows = tab === 'CLOSED' ? all.filter((w) => w.status === 'REJECTED' || w.status === 'FAILED') : all.filter((w) => w.status === tab);
  const sum = (s: WithdrawalStatus[]) => all.filter((w) => s.includes(w.status)).reduce((t, w) => t + Number(w.amount), 0).toFixed(2);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Withdrawal requests" description="Review requests, pay affiliates through your bank, then record the payment reference here." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting review" value={formatMoney(sum(['PENDING']))} hint={`${all.filter((w) => w.status === 'PENDING').length} requests`} />
        <StatCard label="Approved / processing" value={formatMoney(sum(['APPROVED', 'PROCESSING']))} />
        <StatCard label="Paid out (all time)" value={formatMoney(sum(['PAID']))} />
      </div>
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'PENDING', label: 'Requested', count: all.filter((w) => w.status === 'PENDING').length },
          { value: 'APPROVED', label: 'Approved', count: all.filter((w) => w.status === 'APPROVED').length },
          { value: 'PROCESSING', label: 'Processing', count: all.filter((w) => w.status === 'PROCESSING').length },
          { value: 'PAID', label: 'Paid', count: all.filter((w) => w.status === 'PAID').length },
          { value: 'CLOSED', label: 'Rejected / failed', count: all.filter((w) => w.status === 'REJECTED' || w.status === 'FAILED').length },
        ]}
      />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Banknote className="h-6 w-6" />} title="Nothing here" />
      ) : (
        <DataTable
          caption="Withdrawals"
          rows={rows}
          rowKey={(w) => w.id}
          onRowClick={setOpen}
          columns={[
            { key: 'who', header: 'Affiliate', cell: (w) => <div><p className="font-semibold">{w.affiliate?.user.fullName}</p><p className="text-xs text-slate">{w.affiliate?.user.email}</p></div> },
            { key: 'amt', header: 'Amount', cell: (w) => <span className="font-semibold tabular-nums">{formatMoney(w.amount, w.currency)}</span>, align: 'right' },
            { key: 'bank', header: 'Bank', cell: (w) => `${w.bankName} ••${w.accountNumber.slice(-4)}`, hideOnMobile: true },
            { key: 'd', header: 'Requested', cell: (w) => formatDate(w.createdAt, true), hideOnMobile: true },
            { key: 'st', header: 'Status', cell: (w) => <StatusBadge map={withdrawalStatus} value={w.status} /> },
          ]}
        />
      )}

      <Modal
        open={!!open && !act}
        onClose={() => setOpen(null)}
        variant="drawer"
        title={open ? formatMoney(open.amount, open.currency) : ''}
        description={open ? `Requested ${formatDate(open.createdAt, true)}` : undefined}
        footer={
          open &&
          NEXT[open.status].length > 0 &&
          NEXT[open.status].map((d) => (
            <Button key={d} variant={d === 'REJECTED' || d === 'FAILED' ? 'danger' : d === 'PAID' ? 'primary' : 'secondary'} onClick={() => setAct(d)}>
              {ACTION_LABEL[d]}
            </Button>
          ))
        }
      >
        {open && (
          <div className="space-y-5">
            <StatusBadge map={withdrawalStatus} value={open.status} withHelp />
            <DescriptionList
              items={[
                { label: 'Affiliate', value: open.affiliate?.user.fullName },
                { label: 'Email', value: open.affiliate?.user.email },
                { label: 'Bank', value: open.bankName },
                { label: 'Account name', value: open.accountName },
                { label: 'Account number', value: <span className="inline-flex items-center gap-2">{open.accountNumber}<CopyButton value={open.accountNumber} compact label="Copy account number" /></span> },
                { label: 'Payment reference', value: open.paymentReference ?? '—' },
                { label: 'Admin note', value: open.adminNote ?? '—' },
                { label: 'Processed', value: formatDate(open.processedAt, true) },
              ]}
            />
            <Callout tone="info">Confirm the account name matches the affiliate before paying. The amount is already held from their available balance.</Callout>
          </div>
        )}
      </Modal>
      <Modal open={!!open && !!act} onClose={() => setAct(null)} title={act ? ACTION_LABEL[act] : ''} size="sm">
        {open && act && (
          <Act
            w={open}
            decision={act}
            onDone={() => {
              setAct(null);
              setOpen(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}
