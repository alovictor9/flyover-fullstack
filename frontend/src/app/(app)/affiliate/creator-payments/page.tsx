'use client';
import { useQuery } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import Link from 'next/link';
import { creatorWorkApi } from '@/lib/endpoints';
import { formatDate, formatMoney } from '@/lib/format';
import { creatorPaymentStatus } from '@/lib/creator-status';
import { Card, PageHeader } from '@/components/ui/layout';
import { Badge, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';

export default function CreatorPaymentsPage() {
  const q = useQuery({ queryKey: ['creator-payments'], queryFn: creatorWorkApi.myPayments });
  return (
    <>
      <PageHeader title="Creator payments" description="Fixed fees for approved creator work. Businesses pay you directly and record the payment here." />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon={<Banknote className="h-6 w-6" />} title="No creator payments yet" description="A payment record appears when you submit your first deliverable on a fixed-fee or hybrid campaign." />
      ) : (
        <ul className="space-y-4">
          {q.data!.map((p) => {
            const s = creatorPaymentStatus[p.status];
            return (
              <li key={p.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/marketplace/${p.campaignId}`} className="font-semibold text-navy-800 hover:underline">{p.campaign?.name ?? 'Campaign'}</Link>
                      {p.campaign?.business && <p className="text-sm text-slate">{p.campaign.business.name}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-navy-800">{formatMoney(p.amount, p.currency)}</p>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate">{s.help}</p>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    {p.paidAt && <div><dt className="text-xs text-slate">Paid on</dt><dd className="font-medium text-navy-800">{formatDate(p.paidAt)}</dd></div>}
                    {p.paymentReference && <div><dt className="text-xs text-slate">Reference</dt><dd className="break-all font-medium text-navy-800">{p.paymentReference}</dd></div>}
                    {p.paymentProvider && <div><dt className="text-xs text-slate">Paid through</dt><dd className="font-medium text-navy-800">{p.paymentProvider}</dd></div>}
                  </dl>
                  {p.adminNote && <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-slate">Note from the business: {p.adminNote}</p>}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
