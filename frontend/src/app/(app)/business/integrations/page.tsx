'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plug, Plus, RefreshCw } from 'lucide-react';
import { campaignApi, integrationApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { integrationKind, integrationProvider, integrationStatus } from '@/lib/integration-status';
import type { Integration, IntegrationCreated, IntegrationKind, IntegrationProvider } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/layout';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, Callout, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import { Input, Select, Textarea, FormError } from '@/components/ui/form';
import { CopyButton } from '@/components/ui/misc';

const HOST_RE = /^[a-z0-9.-]{3,255}$/i;
const randomSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate">{label}</p>
      <div className="mt-1 flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2">
        <code className="min-w-0 flex-1 break-all text-xs text-navy-800">{value}</code>
        <CopyButton value={value} label="Copy" />
      </div>
    </div>
  );
}

function CreateIntegration({ onCreated, onClose }: { onCreated: (r: IntegrationCreated) => void; onClose: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<IntegrationKind>('PAYMENT');
  const [secret, setSecret] = useState('');
  const campaigns = useQuery({ queryKey: ['campaigns', 'mine'], queryFn: campaignApi.mine });
  const approved = (campaigns.data ?? []).filter((c) => c.status === 'APPROVED');
  const m = useApiMutation(integrationApi.create, { invalidate: [['integrations']], onSuccess: (r) => onCreated(r as IntegrationCreated) });
  const tracking = kind === 'TRACKING';
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        const err: Record<string, string> = {};
        if (f.name!.trim().length < 2) err.name = 'At least 2 characters.';
        if (tracking && !f.campaignId) err.campaignId = 'Choose the campaign this script will track.';
        if (!tracking && secret.length < 16) err.webhookSecret = 'Use at least 16 characters.';
        const domains = Array.from(new Set((f.allowedDomains ?? '').split(/[\s,]+/).map((d) => d.trim().toLowerCase()).filter(Boolean)));
        if (domains.some((d) => !HOST_RE.test(d))) err.allowedDomains = 'Use website names only, like shop.example.com, without https:// or paths.';
        setErrors(err);
        if (Object.keys(err).length) return;
        m.mutate(
          { name: f.name!.trim(), kind, provider: tracking ? 'GENERIC_HMAC' : (f.provider as IntegrationProvider), campaignId: f.campaignId || undefined, webhookSecret: tracking ? undefined : secret, allowedDomains: domains },
          { onError: (er) => er instanceof ApiError && setErrors(er.fieldErrors) },
        );
      }}
    >
      <Input label="Name" name="name" placeholder="e.g. Main store checkout" error={errors.name} />
      <Select label="What do you want to connect?" value={kind} onChange={(e) => setKind(e.target.value as IntegrationKind)} options={(Object.keys(integrationKind) as IntegrationKind[]).map((k) => ({ value: k, label: integrationKind[k].label }))} hint={integrationKind[kind].help} />
      {!tracking && <Select label="Provider" name="provider" defaultValue="GENERIC_HMAC" options={(Object.keys(integrationProvider) as IntegrationProvider[]).map((k) => ({ value: k, label: integrationProvider[k] }))} />}
      <Select label={tracking ? 'Campaign' : 'Campaign (optional)'} name="campaignId" placeholder={tracking ? 'Choose a campaign' : 'All your campaigns'} options={approved.map((c) => ({ value: c.id, label: c.name }))} error={errors.campaignId} />
      {!tracking && (
        <div>
          <Input label="Webhook signing secret" value={secret} onChange={(e) => setSecret(e.target.value)} error={errors.webhookSecret} hint="Paste the secret your provider signs webhooks with, or generate one and set it in your provider." autoComplete="off" />
          <Button variant="ghost" size="sm" className="mt-1" icon={<RefreshCw className="h-4 w-4" />} onClick={() => setSecret(randomSecret())}>Generate a secret</Button>
        </div>
      )}
      <Textarea label="Allowed websites (optional)" name="allowedDomains" error={errors.allowedDomains} hint="One per line. If set, only these sites can send events." />
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error instanceof ApiError && m.error.status === 403 ? 'Only business owners and admins can connect integrations, and your business must be approved.' : (m.error as Error).message) : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={m.isPending}>Connect</Button>
      </div>
    </form>
  );
}

function IntegrationCard({ i, onRevoke }: { i: Integration; onRevoke: (i: Integration) => void }) {
  const s = integrationStatus[i.status];
  const set = useApiMutation((status: 'ACTIVE' | 'PAUSED') => integrationApi.setStatus(i.id, status), { success: 'Integration updated', invalidate: [['integrations']] });
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-navy-800">{i.name}</h2>
          <p className="text-xs text-slate">{integrationKind[i.kind].label} · {integrationProvider[i.provider]}</p>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      <p className="mt-3 text-xs text-slate">{i._count?.webhookEvents ?? 0} events · {i._count?.apiKeys ?? 0} API keys · {i.lastEventAt ? `last event ${formatDate(i.lastEventAt, true)}` : 'no events yet'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href={`/business/integrations/${i.id}`} size="sm" variant="secondary">Manage</ButtonLink>
        {i.status === 'ACTIVE' && <Button size="sm" variant="secondary" loading={set.isPending} onClick={() => set.mutate('PAUSED')}>Pause</Button>}
        {i.status === 'PAUSED' && <Button size="sm" variant="secondary" loading={set.isPending} onClick={() => set.mutate('ACTIVE')}>Resume</Button>}
        {i.status !== 'REVOKED' && <Button size="sm" variant="ghost" onClick={() => onRevoke(i)}>Revoke</Button>}
      </div>
      {set.error && <p className="mt-2 text-xs font-medium text-brick-600">{(set.error as Error).message}</p>}
    </Card>
  );
}

export default function IntegrationsPage() {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<IntegrationCreated | null>(null);
  const [revoking, setRevoking] = useState<Integration | null>(null);
  const q = useQuery({ queryKey: ['integrations'], queryFn: integrationApi.list });
  const revoke = useApiMutation((id: string) => integrationApi.setStatus(id, 'REVOKED'), { success: 'Integration revoked', invalidate: [['integrations']], onSuccess: () => setRevoking(null) });
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect your store, payment provider or website so conversions can be recorded automatically."
        actions={<><ButtonLink href="/business/integrations/guide" variant="secondary">Setup guide</ButtonLink><Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>New integration</Button></>}
      />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon={<Plug className="h-6 w-6" />} title="No integrations yet" description="Manual conversion review keeps working without any. Connect one when you want sales recorded automatically." action={<Button onClick={() => setCreating(true)}>Connect an integration</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{q.data!.map((i) => <IntegrationCard key={i.id} i={i} onRevoke={setRevoking} />)}</div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="Connect an integration" description="Events from it are checked before any conversion is recorded.">
        {creating && <CreateIntegration onClose={() => setCreating(false)} onCreated={(r) => { setCreating(false); setCreated(r); }} />}
      </Modal>
      <Modal open={!!created} onClose={() => setCreated(null)} title="Integration connected" description={created?.name}>
        {created && (
          <div className="space-y-4">
            <Callout tone="success">Use these details in your provider or website. Your webhook secret is not shown again.</Callout>
            {created.kind !== 'TRACKING' && <CopyRow label="Webhook URL" value={created.webhookUrl} />}
            <CopyRow label="Public key" value={created.publicKey} />
            {created.kind === 'TRACKING' && created.trackingSnippet && <CopyRow label="Add this to every page of your site" value={created.trackingSnippet} />}
            {created.kind === 'TRACKING' && <CopyRow label="Tracking endpoint" value={created.trackingEndpoint} />}
            <div className="flex justify-end gap-2">
              <ButtonLink href={`/business/integrations/${created.id}`} variant="secondary">Manage</ButtonLink>
              <Button onClick={() => setCreated(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!revoking} onClose={() => setRevoking(null)} title="Revoke this integration?" description={revoking?.name}>
        <p className="text-sm text-slate">It stops accepting events and API keys for it stop working. This cannot be undone, but you can create a new integration.</p>
        <FormError message={revoke.error ? (revoke.error as Error).message : null} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRevoking(null)}>Keep it</Button>
          <Button variant="danger" loading={revoke.isPending} onClick={() => revoking && revoke.mutate(revoking.id)}>Revoke</Button>
        </div>
      </Modal>
    </>
  );
}
