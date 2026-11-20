'use client';
import { use, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ExternalLink, CheckCircle2, Hourglass, Mail, XCircle, Package } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { campaignApi, referralApi } from '@/lib/endpoints';
import { useApiMutation, localApplications, type LocalApplication } from '@/lib/hooks';
import { formatMoney } from '@/lib/format';
import { ApiError } from '@/lib/api-client';
import type { Campaign } from '@/lib/types';
import { Card, CardHeader, PageHeader } from '@/components/ui/layout';
import { Button, ButtonLink } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/overlay';
import { Callout, ErrorState, LoadingBlock, EmptyState, ComingSoon, Badge } from '@/components/ui/feedback';
import { CampaignTerms, CommissionHeadline, AccessBadge, TrustStrip } from '@/components/campaign/campaign-bits';
import { ReferralLinkBox } from '@/components/campaign/referral-link-box';
import { CreatorDeliverables } from '@/components/campaign/creator-deliverables';

function JoinPanel({ c }: { c: Campaign }) {
  const refs = useQuery({ queryKey: ['referrals'], queryFn: referralApi.mine });
  const [local, setLocal] = useState<LocalApplication | undefined>();
  const [applyOpen, setApplyOpen] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setLocal(localApplications.all()[c.id]), [c.id]);

  const join = useApiMutation(() => campaignApi.apply(c.id, message || undefined), {
    invalidate: [['referrals'], ['analytics']],
    success: c.access === 'OPEN' ? 'You’ve joined! Your link is ready.' : 'Application sent',
    successDescription: c.access === 'OPEN' ? undefined : `${c.business?.name ?? 'The business'} will review it. Once approved, your link appears under My links.`,
    onSuccess: () => {
      if (c.access === 'APPROVAL') {
        const a: LocalApplication = { status: 'PENDING', at: new Date().toISOString(), campaignName: c.name };
        localApplications.set(c.id, a);
        setLocal(a);
      }
      setApplyOpen(false);
    },
  });

  const applyModal = (
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={`Apply to ${c.name}`}
        description="Tell the business why you're a good fit. They'll see your profile too."
        footer={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button loading={join.isPending} onClick={() => join.mutate(undefined)}>
              Send application
            </Button>
          </>
        }
      >
        <Textarea label="Message to the business" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={5} placeholder="Your audience, where you'll promote, results from similar campaigns…" hint={`${message.length}/1000`} />
      </Modal>
    );

  if (refs.isLoading) return <LoadingBlock rows={1} />;
  const referral = refs.data?.find((r) => r.campaignId === c.id);

  if (referral)
    return (
      <Card className="border-success-600/30">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success-600" aria-hidden />
          <h2 className="font-semibold text-navy-800">You&apos;re promoting this campaign</h2>
        </div>
        <ReferralLinkBox code={referral.code} title={c.name} />
        <p className="mt-3 text-xs text-slate">Every click is recorded. Commissions are created when {c.business?.name ?? 'the business'} verifies a conversion.</p>
        {(c.compensationModel === 'FIXED_FEE' || c.compensationModel === 'HYBRID') && <CreatorDeliverables c={c} />}
      </Card>
    );

  if (c.access === 'INVITATION')
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-navy-600" aria-hidden />
          <h2 className="font-semibold text-navy-800">Invite-only campaign</h2>
        </div>
        <p className="mt-1 text-sm text-slate">This business hand-picks affiliates. Keep your profile complete to get noticed.</p>
        <div className="mt-4">
          <ComingSoon title="Accept or decline invitations" endpoint="GET /affiliates/invitations, POST /invitations/:id/accept" />
        </div>
        <ButtonLink href="/affiliate/profile" variant="secondary" className="mt-4">
          Improve my profile
        </ButtonLink>
      </Card>
    );

  if (c.access === 'APPROVAL' && local?.status === 'PENDING')
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Hourglass className="h-5 w-5 text-warning-600" aria-hidden />
          <h2 className="font-semibold text-navy-800">Application awaiting approval</h2>
        </div>
        <p className="mt-1 text-sm text-slate">
          {c.business?.name ?? 'The business'} is reviewing your application. When approved, your link will appear here and under <b>My links</b>.
        </p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setApplyOpen(true)}>
          Update application message
        </Button>
        {applyModal}
      </Card>
    );

  return (
    <Card>
      <CardHeader title={c.access === 'OPEN' ? 'Start promoting' : 'Apply to promote'} description={c.access === 'OPEN' ? 'Open campaign — join instantly and get your unique link.' : 'This business approves each affiliate before they can promote.'} />
      {join.error instanceof ApiError && join.error.status === 403 && <Callout tone="danger" className="mb-3">{join.error.message}</Callout>}
      <Button block size="lg" loading={join.isPending && c.access === 'OPEN'} onClick={() => (c.access === 'OPEN' ? join.mutate(undefined) : setApplyOpen(true))}>
        {c.access === 'OPEN' ? 'Join campaign & get my link' : 'Apply to campaign'}
      </Button>
      {local?.status === 'REJECTED' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-brick-600">
          <XCircle className="h-3.5 w-3.5" /> A previous application was declined. You can apply again.
        </p>
      )}
      {applyModal}
    </Card>
  );
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['campaign', id], queryFn: () => campaignApi.detail(id) });
  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error instanceof ApiError && q.error.status === 404)
    return <EmptyState title="Campaign unavailable" description="This campaign isn't live right now. It may have ended or been paused." action={<ButtonLink href="/marketplace">Back to marketplace</ButtonLink>} />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const c = q.data;

  return (
    <>
      <PageHeader
        back={{ href: '/marketplace', label: 'Marketplace' }}
        eyebrow={c.category ?? undefined}
        title={c.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-navy-700">
              <Building2 className="h-4 w-4" /> {c.business?.name}
            </span>
            <AccessBadge access={c.access} />
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="About this campaign" />
            <p className="whitespace-pre-line text-sm leading-relaxed text-navy-700">{c.description}</p>
            <div className="mt-5 border-t border-line pt-5">
              <TrustStrip c={c} />
            </div>
          </Card>
          {c.instructions && (
            <Card>
              <CardHeader title="How to promote" description="Follow these to keep your conversions eligible." />
              <p className="whitespace-pre-line text-sm leading-relaxed text-navy-700">{c.instructions}</p>
            </Card>
          )}
          {c.product && (
            <Card>
              <CardHeader title="Product" />
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mist">
                  {c.product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.product.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-7 w-7 text-navy-200" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-navy-800">{c.product.name}</p>
                  {c.product.price && <p className="text-sm font-medium text-navy-600">{formatMoney(c.product.price, c.product.currency)}</p>}
                  {c.product.description && <p className="mt-1 text-sm text-slate">{c.product.description}</p>}
                </div>
              </div>
            </Card>
          )}
          {c.business?.description && (
            <Card>
              <CardHeader title={`About ${c.business.name}`} action={<Badge tone="success">Verified business</Badge>} />
              <p className="text-sm text-slate">{c.business.description}</p>
            </Card>
          )}
        </div>
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate">You earn</p>
            <div className="mt-1">
              <CommissionHeadline c={c} size="lg" />
            </div>
            <div className="mt-4">
              <CampaignTerms c={c} />
            </div>
            {c.destinationUrl && (
              <a href={c.destinationUrl} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:underline">
                Preview landing page <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </Card>
          {user?.role === 'AFFILIATE' ? (
            <JoinPanel c={c} />
          ) : (
            <Callout tone="neutral">You&apos;re viewing this as {user?.role === 'BUSINESS' ? 'a business' : 'an administrator'}. Only affiliate accounts can join campaigns.</Callout>
          )}
        </div>
      </div>
    </>
  );
}
