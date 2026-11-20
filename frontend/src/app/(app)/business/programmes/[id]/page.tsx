'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { programApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { formatDate } from '@/lib/format';
import { membershipStatus } from '@/lib/program-status';
import type { MembershipStatus, ProgramField, ProgramMembership } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';

type Decision = 'APPROVED' | 'REJECTED' | 'SUSPENDED';
const actionsFor: Record<MembershipStatus, { d: Decision; label: string }[]> = {
  PENDING: [{ d: 'APPROVED', label: 'Approve' }, { d: 'REJECTED', label: 'Decline' }],
  APPROVED: [{ d: 'SUSPENDED', label: 'Suspend' }],
  REJECTED: [{ d: 'APPROVED', label: 'Approve instead' }],
  SUSPENDED: [{ d: 'APPROVED', label: 'Reinstate' }],
};

function MemberRow({ m, fields, programId }: { m: ProgramMembership; fields: ProgramField[]; programId: string }) {
  const review = useApiMutation((d: Decision) => programApi.reviewMember(m.id, d), {
    success: (_r, d) => (d === 'APPROVED' ? 'Affiliate approved' : d === 'REJECTED' ? 'Application declined' : 'Affiliate suspended'),
    invalidate: [['programs', programId, 'members'], ['programs']],
  });
  const s = membershipStatus[m.status];
  const answers = Object.entries(m.answers ?? {});
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-navy-800">{m.affiliate?.user.fullName ?? 'Affiliate'}</p>
          <p className="text-xs text-slate">{m.affiliate?.user.email} · applied {formatDate(m.appliedAt)}</p>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      {answers.length > 0 && (
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {answers.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate">{fields.find((f) => f.key === k)?.label ?? k}</dt>
              <dd className="break-words font-medium text-navy-800">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {actionsFor[m.status].map((a) => (
          <Button key={a.d} size="sm" variant={a.d === 'APPROVED' ? 'primary' : 'secondary'} loading={review.isPending && review.variables === a.d} onClick={() => review.mutate(a.d)}>{a.label}</Button>
        ))}
      </div>
      {review.error && <p className="mt-2 text-xs font-medium text-brick-600">{(review.error as Error).message}</p>}
    </li>
  );
}

export default function ProgramMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const programs = useQuery({ queryKey: ['programs'], queryFn: programApi.list });
  const q = useQuery({ queryKey: ['programs', id, 'members'], queryFn: () => programApi.members(id) });
  const program = programs.data?.find((p) => p.id === id);
  const order: Record<MembershipStatus, number> = { PENDING: 0, APPROVED: 1, SUSPENDED: 2, REJECTED: 3 };
  const rows = [...(q.data ?? [])].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <>
      <PageHeader back={{ href: '/business/programmes', label: 'Programmes' }} title={program ? `${program.name}: members` : 'Programme members'} description="Review people who joined through your programme page." />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No members yet" description="Share your programme link. People who register or apply appear here." />
      ) : (
        <Card><ul className="divide-y divide-line">{rows.map((m) => <MemberRow key={m.id} m={m} fields={program?.customFields ?? []} programId={id} />)}</ul></Card>
      )}
    </>
  );
}
