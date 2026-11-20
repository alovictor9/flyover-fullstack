'use client';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Send, Users, Link2, MousePointerClick, ExternalLink, UserCheck } from 'lucide-react';
import { campaignApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { campaignStatus, applicationStatus, accessMode } from '@/lib/status';
import { formatDate, parseAmount, formatNumber } from '@/lib/format';
import { ApiError } from '@/lib/api-client';
import type { Campaign, CampaignAccess, CampaignApplication } from '@/lib/types';
import { Card, CardHeader, PageHeader, StatCard, DataTable, Tabs } from '@/components/ui/layout';
import { Button, ButtonLink } from '@/components/ui/button';
import { StatusBadge, Callout, ErrorState, LoadingBlock, EmptyState, ComingSoon } from '@/components/ui/feedback';
import { Modal, ConfirmDialog } from '@/components/ui/overlay';
import { Input, Textarea, Select, FormError } from '@/components/ui/form';
import { Avatar } from '@/components/ui/misc';
import { CampaignTerms, CommissionHeadline, AccessBadge } from '@/components/campaign/campaign-bits';
import { CouponManager } from '@/components/campaign/coupon-manager';
import { CreatorWorkManager } from '@/components/campaign/creator-work-manager';

function EditCampaign({ c, onClose }: { c: Campaign; onClose: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useApiMutation((b: Parameters<typeof campaignApi.update>[1]) => campaignApi.update(c.id, b), {
    success: 'Campaign updated',
    successDescription: 'It is saved as a draft. Submit it for review when ready.',
    invalidate: [['campaigns']],
    onSuccess: onClose,
  });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        const err: Record<string, string> = {};
        if (f.name!.trim().length < 3) err.name = 'At least 3 characters.';
        if (f.description!.trim().length < 10) err.description = 'At least 10 characters.';
        const noCommission = c.compensationModel === 'FIXED_FEE';
        const v = noCommission ? ({ ok: true, value: 0 } as const) : parseAmount(f.commissionValue!);
        if (!v.ok) err.commissionValue = v.message;
        else if (c.commissionType === 'PERCENTAGE' && v.value > 100) err.commissionValue = 'Cannot exceed 100%.';
        if (f.destinationUrl && !/^https?:\/\/\S+\.\S+/.test(f.destinationUrl)) err.destinationUrl = 'Enter a full URL.';
        setErrors(err);
        if (Object.keys(err).length) return;
        m.mutate(
          { name: f.name!.trim(), description: f.description!.trim(), instructions: f.instructions || undefined, commissionValue: noCommission ? undefined : (v as { value: number }).value, access: f.access as CampaignAccess, destinationUrl: f.destinationUrl || undefined },
          { onError: (er) => er instanceof ApiError && setErrors(er.fieldErrors) },
        );
      }}
    >
      <Input label="Campaign name" name="name" defaultValue={c.name} error={errors.name} />
      <Textarea label="Brief" name="description" defaultValue={c.description} error={errors.description} />
      {c.compensationModel !== 'FIXED_FEE' && (
      <Input
        label={c.commissionType === 'PERCENTAGE' ? 'Commission rate' : 'Commission per conversion'}
        name="commissionValue"
        inputMode="decimal"
        defaultValue={String(Number(c.commissionValue))}
        prefix={c.commissionType === 'FIXED' ? '₦' : undefined}
        suffix={c.commissionType === 'PERCENTAGE' ? '%' : undefined}
        error={errors.commissionValue}
      />
      )}
      <Select label="Access" name="access" defaultValue={c.access} options={((c.access === 'PRIVATE' ? ['PRIVATE'] : ['OPEN', 'APPROVAL', 'INVITATION']) as CampaignAccess[]).map((a) => ({ value: a, label: accessMode[a].label }))} />
      <Input label="Landing page URL" name="destinationUrl" type="url" defaultValue={c.destinationUrl ?? ''} error={errors.destinationUrl} />
      <Textarea label="Instructions for affiliates" name="instructions" defaultValue={c.instructions ?? ''} />
      <p className="text-xs text-slate">Payout model, commission type and tracking settings can&apos;t be changed after creation.</p>
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={m.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Applications({ c }: { c: Campaign }) {
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [pending, setPending] = useState<{ app: CampaignApplication; status: 'APPROVED' | 'REJECTED' } | null>(null);
  const q = useQuery({ queryKey: ['campaigns', c.id, 'applications'], queryFn: () => campaignApi.applications(c.id) });
  const m = useApiMutation((v: { id: string; status: 'APPROVED' | 'REJECTED' }) => campaignApi.reviewApplication(v.id, v.status), {
    success: (_r, v) => (v.status === 'APPROVED' ? 'Affiliate approved — they now have a referral link' : 'Application declined'),
    invalidate: [['campaigns']],
    onSuccess: () => setPending(null),
  });
  const all = q.data ?? [];
  const rows = all.filter((a) => a.status === tab);
  return (
    <Card>
      <CardHeader
        title={c.access === 'OPEN' ? 'Participating affiliates' : 'Affiliate applications'}
        description={c.access === 'OPEN' ? 'Open campaign: affiliates join instantly.' : 'Approve affiliates to give them a referral link.'}
      />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'PENDING', label: 'Pending', count: all.filter((a) => a.status === 'PENDING').length },
          { value: 'APPROVED', label: 'Approved', count: all.filter((a) => a.status === 'APPROVED').length },
          { value: 'REJECTED', label: 'Declined', count: all.filter((a) => a.status === 'REJECTED').length },
        ]}
      />
      {q.isLoading ? (
        <LoadingBlock rows={2} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title={tab === 'PENDING' ? 'No pending applications' : 'Nobody here yet'} className="border-none" />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
              <Avatar name={a.affiliate?.user.fullName ?? '?'} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-800">{a.affiliate?.user.fullName}</p>
                  <StatusBadge map={applicationStatus} value={a.status} />
                </div>
                <p className="text-xs text-slate">
                  {a.affiliate?.user.email} · {a.affiliate?.audienceSize ? `${formatNumber(a.affiliate.audienceSize)} audience` : 'Audience not stated'} · applied {formatDate(a.createdAt)}
                </p>
                {!!a.affiliate?.promotionalChannels.length && <p className="mt-1 text-xs text-navy-600">{a.affiliate.promotionalChannels.join(' · ')}</p>}
                {a.affiliate?.bio && <p className="mt-2 text-sm text-slate">{a.affiliate.bio}</p>}
                {a.message && <p className="mt-2 rounded-lg bg-mist p-3 text-sm text-navy-700">“{a.message}”</p>}
              </div>
              {a.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => setPending({ app: a, status: 'REJECTED' })}>
                    Decline
                  </Button>
                  <Button size="sm" icon={<UserCheck className="h-4 w-4" />} onClick={() => setPending({ app: a, status: 'APPROVED' })}>
                    Approve
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.status === 'APPROVED' ? `Approve ${pending.app.affiliate?.user.fullName}?` : `Decline ${pending?.app.affiliate?.user.fullName}?`}
        description={pending?.status === 'APPROVED' ? 'They will get a unique referral link and can start promoting immediately.' : 'They will not be able to promote this campaign.'}
        confirmLabel={pending?.status === 'APPROVED' ? 'Approve' : 'Decline'}
        tone={pending?.status === 'APPROVED' ? 'primary' : 'danger'}
        loading={m.isPending}
        onConfirm={() => pending && m.mutate({ id: pending.app.id, status: pending.status })}
      />
    </Card>
  );
}

export default function BusinessCampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({ queryKey: ['campaigns', 'mine'], queryFn: campaignApi.mine });
  const [editing, setEditing] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const submit = useApiMutation(() => campaignApi.submit(id), {
    success: 'Submitted for review',
    successDescription: 'You’ll be notified when Flyover approves or rejects it.',
    invalidate: [['campaigns']],
    onSuccess: () => setConfirmSubmit(false),
  });

  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data?.find((x) => x.id === id);
  if (!c) return <EmptyState title="Campaign not found" description="It may have been removed, or it belongs to another business." action={<ButtonLink href="/business/campaigns">Back to campaigns</ButtonLink>} />;
  const editable = c.status === 'DRAFT' || c.status === 'REJECTED';

  return (
    <>
      <PageHeader
        back={{ href: '/business/campaigns', label: 'Campaigns' }}
        title={c.name}
        description={<span className="flex flex-wrap items-center gap-2"><StatusBadge map={campaignStatus} value={c.status} /><AccessBadge access={c.access} /><span className="text-xs">Created {formatDate(c.createdAt)}</span></span>}
        actions={
          <>
            {editable && (
              <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {editable && (
              <Button icon={<Send className="h-4 w-4" />} onClick={() => setConfirmSubmit(true)}>
                {c.status === 'REJECTED' ? 'Resubmit' : 'Submit for review'}
              </Button>
            )}
          </>
        }
      />
      <div className="space-y-6">
        {c.status === 'REJECTED' && (
          <Callout tone="danger" title="Flyover did not approve this campaign">
            {c.rejectionReason ?? 'No reason was given.'} Edit the campaign to address this, then resubmit.
          </Callout>
        )}
        {c.status === 'SUSPENDED' && (
          <Callout tone="danger" title="Campaign suspended">
            {c.rejectionReason ?? 'This campaign was suspended by Flyover.'} It is hidden from the marketplace and referral links no longer redirect.
          </Callout>
        )}
        {c.status === 'PENDING' && <Callout tone="warning" title="In review">{campaignStatus.PENDING.help}</Callout>}
        {c.status === 'DRAFT' && <Callout tone="neutral">{campaignStatus.DRAFT.help}</Callout>}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Affiliates with links" value={formatNumber(c._count?.referrals ?? 0)} icon={<Link2 className="h-5 w-5" />} />
          <StatCard label="Applications" value={formatNumber(c._count?.applications ?? 0)} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Clicks" value="—" hint="Per-campaign clicks coming soon. See Analytics for totals." icon={<MousePointerClick className="h-5 w-5" />} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Brief" />
              <p className="whitespace-pre-line text-sm text-navy-700">{c.description}</p>
              {c.instructions && (
                <>
                  <p className="mt-5 text-sm font-semibold text-navy-800">Instructions for affiliates</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate">{c.instructions}</p>
                </>
              )}
            </Card>
            {c.status === 'APPROVED' || c.status === 'SUSPENDED' ? (
              c.access === 'INVITATION' ? (
                <ComingSoon title="Invite affiliates" endpoint="POST /campaigns/:id/invitations">
                  This is an invite-only campaign. Searching for affiliates and sending invitations will be available soon.
                </ComingSoon>
              ) : (
                <Applications c={c} />
              )
            ) : null}
            {c.status === 'APPROVED' && c.compensationModel !== 'FIXED_FEE' && <CouponManager c={c} />}
            {c.status === 'APPROVED' && (c.compensationModel === 'FIXED_FEE' || c.compensationModel === 'HYBRID') && <CreatorWorkManager c={c} />}
          </div>
          <div className="space-y-6">
            <Card>
              <CommissionHeadline c={c} size="lg" />
              <div className="mt-4">
                <CampaignTerms c={c} />
              </div>
              {c.destinationUrl && (
                <a href={c.destinationUrl} target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:underline">
                  Landing page <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </Card>
            {c.status === 'APPROVED' && (
              <Card>
                <CardHeader title="Recording sales" description="When a referred customer converts, record it with the affiliate's referral code." />
                <ButtonLink href="/business/conversions?new=1" variant="secondary" block>
                  Record a conversion
                </ButtonLink>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit campaign" description="Saving moves the campaign back to Draft.">
        <EditCampaign c={c} onClose={() => setEditing(false)} />
      </Modal>
      <ConfirmDialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        title="Submit for review?"
        description="Flyover will check the campaign against marketplace guidelines. You can't edit it while it's in review."
        confirmLabel="Submit"
        loading={submit.isPending}
        onConfirm={() => submit.mutate(undefined)}
      />
    </>
  );
}
