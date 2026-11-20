'use client';
import { useDeferredValue, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Contact, Plus } from 'lucide-react';
import { businessInsightsApi, crmApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { CrmRecord, CrmStage } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import { Input, Select, Textarea, FormError } from '@/components/ui/form';

const STAGES: { value: CrmStage; label: string; tone: 'neutral' | 'brand' | 'warning' | 'success' }[] = [
  { value: 'DISCOVERED', label: 'Discovered', tone: 'neutral' },
  { value: 'CONTACTED', label: 'Contacted', tone: 'brand' },
  { value: 'NEGOTIATING', label: 'Negotiating', tone: 'warning' },
  { value: 'PARTNER', label: 'Partner', tone: 'success' },
  { value: 'INACTIVE', label: 'Inactive', tone: 'neutral' },
];
const stageOf = (s: CrmStage) => STAGES.find((x) => x.value === s)!;
type Target = { affiliateId: string; name: string; record?: CrmRecord };

function CrmForm({ t, onClose }: { t: Target; onClose: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const r = t.record;
  const m = useApiMutation((b: Parameters<typeof crmApi.save>[1]) => crmApi.save(t.affiliateId, b), { success: 'Saved', invalidate: [['crm']], onSuccess: onClose });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        const tags = Array.from(new Set((f.tags ?? '').split(',').map((x) => x.trim()).filter(Boolean)));
        const err: Record<string, string> = {};
        if (tags.length > 30 || tags.some((x) => x.length > 40)) err.tags = 'Up to 30 tags, each 40 characters or fewer.';
        if ((f.notes ?? '').length > 5000) err.notes = 'Notes can be up to 5,000 characters.';
        setErrors(err);
        if (Object.keys(err).length) return;
        m.mutate(
          { stage: f.stage as CrmStage, tags, notes: f.notes?.trim() || undefined, lastContactAt: f.lastContactAt ? new Date(`${f.lastContactAt}T12:00:00`).toISOString() : undefined },
          { onError: (er) => er instanceof ApiError && setErrors(er.fieldErrors) },
        );
      }}
    >
      <Select label="Stage" name="stage" defaultValue={r?.stage ?? 'DISCOVERED'} options={STAGES.map((s) => ({ value: s.value, label: s.label }))} />
      <Input label="Tags (optional)" name="tags" defaultValue={r?.tags.join(', ') ?? ''} error={errors.tags} hint="Separate with commas, for example: fashion, lagos, high-reach." />
      <Input label="Last contacted (optional)" name="lastContactAt" type="date" defaultValue={r?.lastContactAt ? r.lastContactAt.slice(0, 10) : ''} />
      <Textarea label="Private notes (optional)" name="notes" defaultValue={r?.notes ?? ''} error={errors.notes} hint="Only your business can see these." />
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={m.isPending}>Save</Button>
      </div>
    </form>
  );
}

function PickAffiliate({ onPick }: { onPick: (t: Target) => void }) {
  const q = useQuery({ queryKey: ['analytics', 'business', 'affiliates'], queryFn: businessInsightsApi.affiliates });
  if (q.isLoading) return <LoadingBlock rows={2} />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const rows = q.data ?? [];
  if (rows.length === 0) return <p className="text-sm text-slate">No affiliates have been approved on your campaigns yet. They appear here once they are.</p>;
  return (
    <ul className="max-h-72 divide-y divide-line overflow-auto">
      {rows.map((a) => (
        <li key={a.affiliateId}>
          <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-mist/60" onClick={() => onPick({ affiliateId: a.affiliateId, name: a.affiliate.fullName })}>
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-navy-800">{a.affiliate.fullName}</span><span className="block truncate text-xs text-slate">{a.affiliate.email}</span></span>
            <span className="text-xs text-slate">{a.campaignCount} campaign{a.campaignCount === 1 ? '' : 's'}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function CrmPage() {
  const [stage, setStage] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Target | null>(null);
  const [picking, setPicking] = useState(false);
  const deferred = useDeferredValue(search.trim());
  const q = useQuery({
    queryKey: ['crm', stage, deferred, page],
    queryFn: () => crmApi.list({ stage: (stage || undefined) as CrmStage | undefined, search: deferred || undefined, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const rows = q.data?.data ?? [];
  const meta = q.data?.meta;
  return (
    <>
      <PageHeader title="Affiliate CRM" description="Keep track of the affiliates and creators you work with: where each relationship stands, tags and private notes." actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setPicking(true)}>Add affiliate</Button>} />
      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Stage" value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }} placeholder="All stages" options={STAGES.map((s) => ({ value: s.value, label: s.label }))} />
          <Input label="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name or email" />
        </div>
      </Card>
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Contact className="h-6 w-6" />} title={stage || deferred ? 'No matches' : 'No affiliates in your CRM yet'} description={stage || deferred ? 'Try a different stage or search.' : 'Add an affiliate you work with to record the stage, tags and notes.'} action={!stage && !deferred ? <Button onClick={() => setPicking(true)}>Add affiliate</Button> : undefined} />
      ) : (
        <>
          <ul className="space-y-3">
            {rows.map((r) => {
              const s = stageOf(r.stage);
              return (
                <li key={r.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-navy-800">{r.affiliate.creatorProfile?.displayName ?? r.affiliate.user.fullName}</p>
                        <p className="truncate text-xs text-slate">{r.affiliate.user.email} · {r.lastContactAt ? `last contacted ${formatDate(r.lastContactAt)}` : 'not contacted yet'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={s.tone}>{s.label}</Badge>
                        <Button size="sm" variant="secondary" onClick={() => setTarget({ affiliateId: r.affiliateId, name: r.affiliate.user.fullName, record: r })}>Edit</Button>
                      </div>
                    </div>
                    {r.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{r.tags.map((x) => <Badge key={x}>{x}</Badge>)}</div>}
                    {r.notes && <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-slate">{r.notes}</p>}
                  </Card>
                </li>
              );
            })}
          </ul>
          {meta && meta.pages > 1 && (
            <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-slate">Page {meta.page} of {meta.pages} · {meta.total} records</span>
              <Button variant="secondary" size="sm" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </nav>
          )}
        </>
      )}
      <Modal open={picking} onClose={() => setPicking(false)} title="Add an affiliate" description="Choose from affiliates approved on your campaigns.">
        {picking && <PickAffiliate onPick={(t) => { setPicking(false); setTarget(t); }} />}
      </Modal>
      <Modal open={!!target} onClose={() => setTarget(null)} title={target?.record ? 'Edit CRM record' : 'Add to CRM'} description={target?.name}>
        {target && <CrmForm key={target.affiliateId} t={target} onClose={() => setTarget(null)} />}
      </Modal>
    </>
  );
}
