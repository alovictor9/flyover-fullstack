'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Wallet, Hourglass, CheckCircle2, Undo2, ArrowDownToLine, Info } from 'lucide-react';
import { walletApi } from '@/lib/endpoints';
import { ledgerType, withdrawalStatus } from '@/lib/status';
import { formatDate, formatMoney, toKobo } from '@/lib/format';
import { MIN_WITHDRAWAL } from '@/lib/config';
import { PageHeader, StatCard, Card, CardHeader, Tabs, DataTable } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/overlay';
import { StatusBadge, EmptyState, ErrorState, LoadingBlock, Callout } from '@/components/ui/feedback';
import { WithdrawForm } from '@/components/wallet/withdraw-form';

export default function WalletPage() {
  const w = useQuery({ queryKey: ['wallet'], queryFn: walletApi.get });
  const wd = useQuery({ queryKey: ['withdrawals'], queryFn: walletApi.withdrawals });
  const [tab, setTab] = useState<'ledger' | 'withdrawals'>('ledger');
  const [withdrawing, setWithdrawing] = useState(false);

  if (w.isLoading) return <LoadingBlock rows={4} />;
  if (w.isError || !w.data) return <ErrorState error={w.error} onRetry={() => w.refetch()} />;
  const b = w.data.balances;
  const canWithdraw = toKobo(b.available) >= toKobo(MIN_WITHDRAWAL);
  const inFlight = (wd.data ?? []).filter((x) => ['PENDING', 'APPROVED', 'PROCESSING'].includes(x.status));

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Your balances are calculated from an auditable ledger of every commission and withdrawal."
        actions={
          <Button icon={<ArrowDownToLine className="h-4 w-4" />} disabled={!canWithdraw} onClick={() => setWithdrawing(true)} title={canWithdraw ? undefined : `Minimum withdrawal is ${formatMoney(MIN_WITHDRAWAL)}`}>
            Withdraw
          </Button>
        }
      />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard tone="brand" label="Available" value={formatMoney(b.available)} hint="Ready to withdraw" icon={<Wallet className="h-5 w-5" />} />
          <StatCard label="Pending" value={formatMoney(b.pending)} hint="In validation period" icon={<Hourglass className="h-5 w-5" />} />
          <StatCard label="Withdrawn" value={formatMoney(b.withdrawn)} hint="Paid to your bank" icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard label="Reversed" value={formatMoney(b.reversed)} hint="Refunds / reversals" icon={<Undo2 className="h-5 w-5" />} />
        </div>
        {!canWithdraw && (
          <Callout tone="info">
            You can withdraw once your available balance reaches {formatMoney(MIN_WITHDRAWAL)}. Pending commissions become available after each campaign&apos;s validation period.
          </Callout>
        )}
        {inFlight.length > 0 && (
          <Callout tone="warning" title={`${inFlight.length} withdrawal${inFlight.length > 1 ? 's' : ''} in progress`}>
            {formatMoney(inFlight.reduce((s, x) => s + Number(x.amount), 0).toFixed(2))} is held from your available balance until it is paid or returned.
          </Callout>
        )}

        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'ledger', label: 'Transactions', count: w.data.transactions.length },
            { value: 'withdrawals', label: 'Withdrawals', count: wd.data?.length },
          ]}
        />

        {tab === 'ledger' ? (
          w.data.transactions.length === 0 ? (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="No transactions yet" description="Commissions appear here as soon as a business approves one of your conversions." />
          ) : (
            <DataTable
              caption="Wallet ledger"
              rows={w.data.transactions}
              rowKey={(t) => t.id}
              columns={[
                { key: 'd', header: 'Date', cell: (t) => formatDate(t.createdAt, true) },
                {
                  key: 'type',
                  header: 'Entry',
                  cell: (t) => (
                    <div>
                      <p className="font-medium">{ledgerType[t.type].label}</p>
                      <p className="text-xs text-slate">{t.description}</p>
                    </div>
                  ),
                },
                { key: 'bucket', header: 'Balance', cell: (t) => <span className="text-slate">{ledgerType[t.type].bucket}</span>, hideOnMobile: true },
                {
                  key: 'amt',
                  header: 'Amount',
                  align: 'right',
                  cell: (t) => {
                    const s = ledgerType[t.type].sign;
                    return (
                      <span className={clsx('font-semibold tabular-nums', s > 0 ? 'text-success-700' : s < 0 ? 'text-brick-600' : 'text-navy-700')}>
                        {s > 0 ? '+' : s < 0 ? '−' : ''}
                        {formatMoney(t.amount, t.currency)}
                      </span>
                    );
                  },
                },
              ]}
            />
          )
        ) : wd.isLoading ? (
          <LoadingBlock rows={2} />
        ) : !wd.data?.length ? (
          <EmptyState icon={<ArrowDownToLine className="h-6 w-6" />} title="No withdrawals yet" />
        ) : (
          <DataTable
            caption="Withdrawals"
            rows={wd.data}
            rowKey={(x) => x.id}
            columns={[
              { key: 'd', header: 'Requested', cell: (x) => formatDate(x.createdAt, true) },
              { key: 'amt', header: 'Amount', cell: (x) => <span className="font-semibold tabular-nums">{formatMoney(x.amount, x.currency)}</span> },
              { key: 'bank', header: 'To', cell: (x) => `${x.bankName} ••${x.accountNumber.slice(-4)}`, hideOnMobile: true },
              { key: 'ref', header: 'Payment ref', cell: (x) => x.paymentReference ?? <span className="text-slate">—</span> },
              { key: 'st', header: 'Status', cell: (x) => <StatusBadge map={withdrawalStatus} value={x.status} /> },
            ]}
          />
        )}
        <Card>
          <CardHeader title="How your money moves" />
          <ol className="grid gap-4 text-sm sm:grid-cols-3">
            <li className="flex gap-2"><Info className="h-4 w-4 shrink-0 text-navy-400" /><span className="text-slate"><b className="text-navy-800">Pending:</b> a business approved your conversion. It stays pending during the validation period in case of refunds.</span></li>
            <li className="flex gap-2"><Info className="h-4 w-4 shrink-0 text-navy-400" /><span className="text-slate"><b className="text-navy-800">Available:</b> the commission has cleared and can be withdrawn to your bank.</span></li>
            <li className="flex gap-2"><Info className="h-4 w-4 shrink-0 text-navy-400" /><span className="text-slate"><b className="text-navy-800">Withdrawn:</b> Flyover paid it to your bank and recorded the payment reference.</span></li>
          </ol>
        </Card>
      </div>
      <Modal open={withdrawing} onClose={() => setWithdrawing(false)} title="Withdraw to your bank">
        <WithdrawForm available={b.available} onDone={() => setWithdrawing(false)} />
      </Modal>
    </>
  );
}
