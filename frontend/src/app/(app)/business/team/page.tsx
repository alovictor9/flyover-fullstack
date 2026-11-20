'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { teamApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import type { TeamMember, TeamRole } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { Badge, Callout, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import { Input, Select, FormError } from '@/components/ui/form';

type EditableRole = Exclude<TeamRole, 'OWNER'>;
const ROLES: { value: EditableRole; label: string; help: string }[] = [
  { value: 'ANALYST', label: 'Analyst', help: 'Can view campaigns, conversions and reports. Cannot change anything.' },
  { value: 'MANAGER', label: 'Manager', help: 'Can also create and edit campaigns and review conversions.' },
  { value: 'ADMIN', label: 'Admin', help: 'Can also manage the team, integrations and creator payments.' },
];
const roleLabel = (r: TeamRole) => (r === 'OWNER' ? 'Owner' : ROLES.find((x) => x.value === r)!.label);
const message = (e: unknown) => (e instanceof ApiError && e.status === 403 ? 'Only business owners and admins can manage the team.' : (e as Error).message);

function AddMember({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<EditableRole>('ANALYST');
  const [err, setErr] = useState('');
  const m = useApiMutation(teamApi.add, { success: 'Team member added', invalidate: [['team']], onSuccess: onClose });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address.');
        setErr('');
        m.mutate({ email, role });
      }}
    >
      <Input label="Email address" name="email" type="email" error={err} hint="They must already have a Flyover business account with this email." />
      <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as EditableRole)} options={ROLES.map((r) => ({ value: r.value, label: r.label }))} hint={ROLES.find((r) => r.value === role)!.help} />
      <FormError message={m.error ? (m.error instanceof ApiError && m.error.status === 404 ? 'No active business account has that email. Ask them to sign up as a business user first.' : message(m.error)) : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={m.isPending}>Add member</Button>
      </div>
    </form>
  );
}

function MemberRow({ m }: { m: TeamMember }) {
  const upd = useApiMutation((b: { role?: EditableRole; isActive?: boolean }) => teamApi.update(m.id!, b), { success: 'Team updated', invalidate: [['team']] });
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-navy-800">{m.user.fullName}</p>
        <p className="truncate text-xs text-slate">{m.user.email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {m.isOwner ? (
          <Badge tone="brand">Owner</Badge>
        ) : (
          <>
            <select
              aria-label={`Role for ${m.user.fullName}`}
              value={m.role}
              disabled={upd.isPending}
              onChange={(e) => upd.mutate({ role: e.target.value as EditableRole })}
              className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-500 disabled:opacity-60"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {!m.isActive && <Badge tone="neutral">No access</Badge>}
            <Button size="sm" variant="secondary" loading={upd.isPending} onClick={() => upd.mutate({ isActive: !m.isActive })}>{m.isActive ? 'Remove access' : 'Restore access'}</Button>
          </>
        )}
      </div>
      {upd.error && <p className="w-full text-xs font-medium text-brick-600">{message(upd.error)}</p>}
    </li>
  );
}

export default function TeamPage() {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['team'], queryFn: teamApi.list, retry: false });
  return (
    <>
      <PageHeader title="Team" description="Give colleagues access to your business account with the right level of control." actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>Add member</Button>} />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        q.error instanceof ApiError && q.error.status === 403 ? <Callout tone="neutral" title="Team access is limited">Only business owners and admins can see and manage the team.</Callout> : <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <>
          <Card><ul className="divide-y divide-line">{(q.data ?? []).map((m) => <MemberRow key={m.id ?? 'owner'} m={m} />)}</ul></Card>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {ROLES.map((r) => (<div key={r.value} className="rounded-xl border border-line bg-white p-3"><dt className="text-sm font-semibold text-navy-800">{roleLabel(r.value)}</dt><dd className="mt-1 text-xs text-slate">{r.help}</dd></div>))}
          </dl>
        </>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add a team member" description="They sign in with their own account.">
        {open && <AddMember onClose={() => setOpen(false)} />}
      </Modal>
    </>
  );
}
