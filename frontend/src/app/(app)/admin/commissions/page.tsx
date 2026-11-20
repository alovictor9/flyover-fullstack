'use client';
import { useState } from 'react';
import { Coins } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { formatDate, formatMoney } from '@/lib/format';
import { commissionStatus } from '@/lib/status';
import type { Commission } from '@/lib/types';
import { PageHeader, Card, CardHeader, DescriptionList } from '@/components/ui/layout';
import { Input, FormError } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/overlay';
import { Callout, ComingSoon, StatusBadge } from '@/components/ui/feedback';

export default function AdminCommissionsPage() {
  const [id, setId] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [released, setReleased] = useState<Commission[]>([]);
  const m = useApiMutation(() => adminApi.releaseCommission(id.trim()), {
    success: 'Commission released',
    successDescription: 'It moved from the affiliate’s pending to available balance.',
    invalidate: [['admin']],
    onSuccess: (c) => {
      setReleased((r) => [c, ...r]);
      setId('');
      setConfirm(false);
    },
    silentError: true,
  });

  return (
    <>
      <PageHeader eyebrow="Administration" title="Commission release" description="Move matured commissions from pending to available once their validation period has ended." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Release a commission" description="The server checks that the commission is still pending and its validation period is over." />
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-start"
              onSubmit={(e) => {
                e.preventDefault();
                if (id.trim()) setConfirm(true);
              }}
            >
              <Input aria-label="Commission ID" placeholder="Commission ID" value={id} onChange={(e) => setId(e.target.value)} className="font-mono" />
              <Button type="submit" disabled={!id.trim()} icon={<Coins className="h-4 w-4" />}>
                Release
              </Button>
            </form>
            <div className="mt-3">
              <FormError message={m.error ? (m.error as Error).message : null} />
            </div>
          </Card>
          {released.length > 0 && (
            <Card>
              <CardHeader title="Released this session" />
              <ul className="divide-y divide-line">
                {released.map((c) => (
                  <li key={c.id} className="py-3">
                    <DescriptionList
                      items={[
                        { label: 'Commission', value: <code className="text-xs">{c.id}</code> },
                        { label: 'Amount', value: formatMoney(c.commissionAmount, c.currency) },
                        { label: 'Status', value: <StatusBadge map={commissionStatus} value={c.status} /> },
                        { label: 'Matured', value: formatDate(c.availableAt) },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <ComingSoon title="Matured commissions queue" endpoint="GET /admin/commissions?status=PENDING&matured=true">
            A list of every commission past its validation period, with one-click release, plus a scheduled automatic release.
          </ComingSoon>
          <Callout tone="neutral">Commission IDs appear in a business&apos;s conversion details and in the affiliate ledger (reference).</Callout>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Release this commission?"
        description={
          <>
            Commission <code className="text-xs">{id}</code> will become withdrawable by the affiliate. This creates ledger entries and is recorded in the audit log.
          </>
        }
        confirmLabel="Release"
        loading={m.isPending}
        onConfirm={() => m.mutate(undefined, { onError: () => setConfirm(false) })}
      />
    </>
  );
}
