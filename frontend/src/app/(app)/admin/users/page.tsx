'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { useMe } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import type { AdminUser, Role } from '@/lib/types';
import { PageHeader, Tabs, DataTable } from '@/components/ui/layout';
import { Badge, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/overlay';
import { Avatar } from '@/components/ui/misc';

const ROLE: Record<Role, string> = { AFFILIATE: 'Affiliate', BUSINESS: 'Business', ADMIN: 'Admin' };

export default function AdminUsersPage() {
  const me = useMe();
  const [tab, setTab] = useState<'ALL' | Role | 'SUSPENDED'>('ALL');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<AdminUser | null>(null);
  const q = useQuery({ queryKey: ['admin', 'users'], queryFn: adminApi.users });
  const m = useApiMutation((u: AdminUser) => adminApi.setUserActive(u.id, !u.isActive), {
    success: (r) => (r.isActive ? `${r.fullName} reactivated` : `${r.fullName} suspended`),
    successDescription: 'Recorded in the audit log.',
    invalidate: [['admin']],
    onSuccess: () => setTarget(null),
  });
  const all = q.data ?? [];
  const s = search.toLowerCase();
  const rows = all.filter((u) => (tab === 'ALL' ? true : tab === 'SUSPENDED' ? !u.isActive : u.role === tab) && (!s || u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)));

  return (
    <>
      <PageHeader eyebrow="Administration" title="Users" description="Suspend accounts that break the rules. Suspended users can’t sign in." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'ALL', label: 'All', count: all.length },
            { value: 'AFFILIATE', label: 'Affiliates', count: all.filter((u) => u.role === 'AFFILIATE').length },
            { value: 'BUSINESS', label: 'Businesses', count: all.filter((u) => u.role === 'BUSINESS').length },
            { value: 'ADMIN', label: 'Admins', count: all.filter((u) => u.role === 'ADMIN').length },
            { value: 'SUSPENDED', label: 'Suspended', count: all.filter((u) => !u.isActive).length },
          ]}
        />
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" aria-label="Search users" className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200" />
        </div>
      </div>
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No users match" />
      ) : (
        <DataTable
          caption="Users"
          rows={rows}
          rowKey={(u) => u.id}
          columns={[
            { key: 'u', header: 'User', cell: (u) => <div className="flex items-center gap-3"><Avatar name={u.fullName} className="hidden md:inline-flex" /><div><p className="font-semibold">{u.fullName}</p><p className="text-xs text-slate">{u.email}</p></div></div> },
            { key: 'r', header: 'Role', cell: (u) => <Badge tone={u.role === 'ADMIN' ? 'brand' : 'neutral'}>{ROLE[u.role]}</Badge> },
            { key: 'j', header: 'Joined', cell: (u) => formatDate(u.createdAt), hideOnMobile: true },
            { key: 's', header: 'Status', cell: (u) => (u.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Suspended</Badge>) },
            {
              key: 'a',
              header: 'Action',
              align: 'right',
              cell: (u) =>
                u.id === me.id ? (
                  <span className="text-xs text-slate">You</span>
                ) : (
                  <Button size="sm" variant={u.isActive ? 'danger' : 'secondary'} onClick={() => setTarget(u)}>
                    {u.isActive ? 'Suspend' : 'Reactivate'}
                  </Button>
                ),
            },
          ]}
        />
      )}
      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        title={target?.isActive ? `Suspend ${target.fullName}?` : `Reactivate ${target?.fullName}?`}
        description={target?.isActive ? 'They will be signed out at their next token refresh and unable to sign in. Their records are kept.' : 'They will be able to sign in again.'}
        confirmLabel={target?.isActive ? 'Suspend account' : 'Reactivate'}
        tone={target?.isActive ? 'danger' : 'primary'}
        loading={m.isPending}
        onConfirm={() => target && m.mutate(target)}
      />
    </>
  );
}
