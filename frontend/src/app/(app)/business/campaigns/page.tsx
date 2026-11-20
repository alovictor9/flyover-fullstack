'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Plus } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { campaignApi } from '@/lib/endpoints';
import { campaignStatus } from '@/lib/status';
import { payoutLabel, formatDate } from '@/lib/format';
import type { CampaignStatus } from '@/lib/types';
import { PageHeader, Tabs, DataTable } from '@/components/ui/layout';
import { ButtonLink } from '@/components/ui/button';
import { StatusBadge, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { AccessBadge } from '@/components/campaign/campaign-bits';
import { VerificationBanner } from '@/components/profile/verification-banner';

type Tab = 'ALL' | CampaignStatus;

export default function BusinessCampaignsPage() {
  const me = useMe();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('ALL');
  const approved = me.business!.status === 'APPROVED';
  const q = useQuery({ queryKey: ['campaigns', 'mine'], queryFn: campaignApi.mine });
  const all = q.data ?? [];
  const rows = tab === 'ALL' ? all : all.filter((c) => c.status === tab);
  const count = (s: CampaignStatus) => all.filter((c) => c.status === s).length;

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Create, submit and manage your affiliate campaigns."
        actions={approved && <ButtonLink href="/business/campaigns/new" icon={<Plus className="h-4 w-4" />}>New campaign</ButtonLink>}
      />
      {!approved && (
        <div className="mb-6">
          <VerificationBanner profile={me.business!} />
        </div>
      )}
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'ALL', label: 'All', count: all.length },
          { value: 'APPROVED', label: 'Live', count: count('APPROVED') },
          { value: 'PENDING', label: 'In review', count: count('PENDING') },
          { value: 'DRAFT', label: 'Drafts', count: count('DRAFT') },
          { value: 'REJECTED', label: 'Rejected', count: count('REJECTED') },
          { value: 'SUSPENDED', label: 'Suspended', count: count('SUSPENDED') },
        ]}
      />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title={all.length ? 'No campaigns with this status' : 'No campaigns yet'}
          description={all.length ? undefined : 'Create your first campaign to start working with affiliates.'}
          action={approved && !all.length ? <ButtonLink href="/business/campaigns/new">Create campaign</ButtonLink> : undefined}
        />
      ) : (
        <DataTable
          caption="Your campaigns"
          rows={rows}
          rowKey={(c) => c.id}
          onRowClick={(c) => router.push(`/business/campaigns/${c.id}`)}
          columns={[
            { key: 'name', header: 'Campaign', cell: (c) => <div><p className="font-semibold">{c.name}</p><p className="text-xs text-slate">{c.product?.name ?? c.category ?? '—'}</p></div> },
            { key: 'commission', header: 'Commission', cell: (c) => <span className="font-semibold tabular-nums text-brick-500">{payoutLabel(c)} <span className="text-xs font-normal text-slate">{c.action}</span></span> },
            { key: 'access', header: 'Access', cell: (c) => <AccessBadge access={c.access} />, hideOnMobile: true },
            { key: 'affiliates', header: 'Affiliates', cell: (c) => <span className="tabular-nums">{c._count?.referrals ?? 0}</span>, align: 'right' },
            { key: 'apps', header: 'Applications', cell: (c) => <span className="tabular-nums">{c._count?.applications ?? 0}</span>, align: 'right', hideOnMobile: true },
            { key: 'created', header: 'Created', cell: (c) => formatDate(c.createdAt), hideOnMobile: true },
            { key: 'status', header: 'Status', cell: (c) => <StatusBadge map={campaignStatus} value={c.status} /> },
          ]}
        />
      )}
    </>
  );
}
