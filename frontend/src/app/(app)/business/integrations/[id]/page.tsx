'use client';
import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, Plus } from 'lucide-react';
import { integrationApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { API_BASE_URL } from '@/lib/config';
import { formatDate } from '@/lib/format';
import { eventStatus, integrationKind, integrationProvider, integrationStatus } from '@/lib/integration-status';
import type { IntegrationApiKeyCreated, IntegrationEvent } from '@/lib/types';
import { Card, CardHeader, PageHeader } from '@/components/ui/layout';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, Callout, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import { Input, FormError } from '@/components/ui/form';
import { CopyButton } from '@/components/ui/misc';

const adminMessage = (e: unknown) => (e instanceof ApiError && e.status === 403 ? 'Only business owners and admins can do this.' : (e as Error).message);

function NewKey({ id, onCreated, onClose }: { id: string; onCreated: (k: IntegrationApiKeyCreated) => void; onClose: () => void }) {
  const [err, setErr] = useState('');
  const m = useApiMutation((b: { name: string; expiresAt?: string }) => integrationApi.createKey(id, b), { invalidate: [['integrations', id, 'keys']], onSuccess: (k) => onCreated(k as IntegrationApiKeyCreated) });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        if (f.name!.trim().length < 2) return setErr('At least 2 characters.');
        setErr('');
        m.mutate({ name: f.name!.trim(), expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59`).toISOString() : undefined });
      }}
    >
      <Input label="Key name" name="name" placeholder="e.g. Production server" error={err} />
      <Input label="Expires on (optional)" name="expiresAt" type="date" />
      <p className="text-xs text-slate">This key can report conversions only. You will see the full key once.</p>
      <FormError message={m.error ? adminMessage(m.error) : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={m.isPending}>Create key</Button>
      </div>
    </form>
  );
}

function RotateSecret({ id, onClose }: { id: string; onClose: () => void }) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const m = useApiMutation((s: string) => integrationApi.rotateSecret(id, s), { success: 'Secret updated', successDescription: 'Update it in your provider too, or events will fail verification.', onSuccess: onClose });
  return (
    <div className="space-y-4">
      <Input label="New signing secret" value={v} onChange={(e) => { setV(e.target.value); setErr(''); }} error={err} autoComplete="off" hint="At least 16 characters. It replaces the current secret immediately." />
      <FormError message={m.error ? adminMessage(m.error) : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={m.isPending} onClick={() => (v.length < 16 ? setErr('Use at least 16 characters.') : m.mutate(v))}>Replace secret</Button>
      </div>
    </div>
  );
}

export default function IntegrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [keyOpen, setKeyOpen] = useState(false);
  const [newKey, setNewKey] = useState<IntegrationApiKeyCreated | null>(null);
  const [rotate, setRotate] = useState(false);
  const list = useQuery({ queryKey: ['integrations'], queryFn: integrationApi.list });
  const keys = useQuery({ queryKey: ['integrations', id, 'keys'], queryFn: () => integrationApi.keys(id), retry: false });
  const events = useQuery({ queryKey: ['integrations', id, 'events'], queryFn: () => integrationApi.events(id) });
  const i = list.data?.find((x) => x.id === id);
  const revokeKey = useApiMutation((keyId: string) => integrationApi.revokeKey(id, keyId), { success: 'Key revoked', invalidate: [['integrations', id, 'keys']] });
  const retry = useApiMutation((eventId: string) => integrationApi.retryEvent(id, eventId), {
    success: (r) => ((r as { duplicate?: boolean }).duplicate ? 'Already recorded' : 'Conversion recorded'),
    invalidate: [['integrations', id, 'events']],
  });
  const webhookUrl = `${API_BASE_URL.replace(/\/api\/v\d+$/, '')}/webhooks/${id}`;
  const canRetry = (e: IntegrationEvent) => i?.status === 'ACTIVE' && e.status === 'FAILED' && e.signatureVerified && e.authMethod === 'WEBHOOK_HMAC';
  return (
    <>
      <PageHeader back={{ href: '/business/integrations', label: 'Integrations' }} title={i?.name ?? 'Integration'} description={i ? `${integrationKind[i.kind].label} · ${integrationProvider[i.provider]}` : undefined} actions={<>{i && <Badge tone={integrationStatus[i.status].tone}>{integrationStatus[i.status].label}</Badge>}<ButtonLink href="/business/integrations/guide" variant="secondary" size="sm">Setup guide</ButtonLink></>} />
      {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
      <div className="space-y-6">
        {i && (
          <Card>
            <CardHeader title="Connection details" />
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-slate">Public key</dt><dd className="flex items-center gap-2"><code className="break-all text-xs text-navy-800">{i.publicKey}</code><CopyButton value={i.publicKey} label="Copy" /></dd></div>
              {i.kind !== 'TRACKING' && <div><dt className="text-xs text-slate">Webhook URL (built from this app’s API address)</dt><dd className="flex items-center gap-2"><code className="break-all text-xs text-navy-800">{webhookUrl}</code><CopyButton value={webhookUrl} label="Copy" /></dd></div>}
              <div><dt className="text-xs text-slate">Allowed websites</dt><dd className="text-navy-800">{i.allowedDomains.length ? i.allowedDomains.join(', ') : 'Any'}</dd></div>
            </dl>
            {i.kind !== 'TRACKING' && i.status !== 'REVOKED' && <Button className="mt-4" size="sm" variant="secondary" onClick={() => setRotate(true)}>Replace signing secret</Button>}
          </Card>
        )}
        {i?.kind !== 'TRACKING' && (
          <Card>
            <CardHeader title="API keys" description="Let your own server report conversions. Keys can only report conversions." action={i?.status === 'ACTIVE' ? <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setKeyOpen(true)}>New key</Button> : undefined} />
            {keys.isLoading ? <LoadingBlock rows={1} /> : keys.isError ? (
              <p className="text-sm text-slate">{adminMessage(keys.error)}</p>
            ) : (keys.data ?? []).length === 0 ? (
              <p className="text-sm text-slate">No API keys yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {keys.data!.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-navy-800"><KeyRound className="h-4 w-4 text-slate" aria-hidden />{k.name}</p>
                      <p className="text-xs text-slate">{k.keyPrefix}… · created {formatDate(k.createdAt)} · {k.lastUsedAt ? `last used ${formatDate(k.lastUsedAt)}` : 'never used'}{k.expiresAt ? ` · expires ${formatDate(k.expiresAt)}` : ''}</p>
                    </div>
                    {k.revokedAt ? <Badge tone="neutral">Revoked</Badge> : <Button size="sm" variant="secondary" loading={revokeKey.isPending && revokeKey.variables === k.id} onClick={() => revokeKey.mutate(k.id)}>Revoke</Button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        <Card>
          <CardHeader title="Recent events" description="The last 100 events received from this integration." />
          {events.isLoading ? <LoadingBlock rows={2} /> : events.isError ? <ErrorState error={events.error} onRetry={() => events.refetch()} /> : (events.data ?? []).length === 0 ? (
            <p className="text-sm text-slate">No events yet. They appear here as soon as your system sends one.</p>
          ) : (
            <ul className="divide-y divide-line">
              {events.data!.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy-800">{e.eventType}</p>
                      <p className="break-all text-xs text-slate">{e.externalEventId} · {formatDate(e.createdAt, true)} · {e.signatureVerified ? 'signature verified' : 'not verified'} · {e.attempts} attempt{e.attempts === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={eventStatus[e.status].tone}>{eventStatus[e.status].label}</Badge>
                      {canRetry(e) && <Button size="sm" variant="secondary" loading={retry.isPending && retry.variables === e.id} onClick={() => retry.mutate(e.id)}>Retry</Button>}
                    </div>
                  </div>
                  {e.lastError && <p className="mt-1 rounded-lg bg-surface-muted px-3 py-2 text-xs text-brick-600">{e.lastError}</p>}
                </li>
              ))}
            </ul>
          )}
          {retry.error && <p className="mt-2 text-xs font-medium text-brick-600">{adminMessage(retry.error)}</p>}
        </Card>
      </div>
      <Modal open={keyOpen} onClose={() => setKeyOpen(false)} title="New API key" description={i?.name}>
        {keyOpen && <NewKey id={id} onClose={() => setKeyOpen(false)} onCreated={(k) => { setKeyOpen(false); setNewKey(k); }} />}
      </Modal>
      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Copy your API key now" description={newKey?.name}>
        {newKey && (
          <div className="space-y-4">
            <Callout tone="warning">This is the only time the full key is shown. Store it somewhere safe.</Callout>
            <div className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2"><code className="min-w-0 flex-1 break-all text-xs text-navy-800">{newKey.key}</code><CopyButton value={newKey.key} label="Copy" /></div>
            <div className="flex justify-end"><Button onClick={() => setNewKey(null)}>I’ve saved it</Button></div>
          </div>
        )}
      </Modal>
      <Modal open={rotate} onClose={() => setRotate(false)} title="Replace signing secret" description={i?.name}>
        {rotate && <RotateSecret id={id} onClose={() => setRotate(false)} />}
      </Modal>
    </>
  );
}
