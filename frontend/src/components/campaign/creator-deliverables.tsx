'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Plus } from 'lucide-react';
import { creatorWorkApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { Campaign, CreatorDeliverable, DeliverableStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge, Callout, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import { Input, Textarea, FormError } from '@/components/ui/form';

export const deliverableStatus: Record<DeliverableStatus, { label: string; tone: 'brand' | 'warning' | 'success' | 'danger' }> = {
  SUBMITTED: { label: 'Submitted', tone: 'brand' },
  IN_REVIEW: { label: 'In review', tone: 'warning' },
  REVISION_REQUESTED: { label: 'Changes requested', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

const URL_RE = /^https?:\/\/\S+\.\S+/;

function DeliverableForm({ campaignId, existing, onClose }: { campaignId: string; existing?: CreatorDeliverable; onClose: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useApiMutation(
    (b: { title: string; assetUrl: string; description?: string; contentType?: string }) =>
      existing ? creatorWorkApi.resubmit(campaignId, existing.id, b) : creatorWorkApi.submit(campaignId, b),
    { success: existing ? 'Resubmitted for review' : 'Deliverable submitted', successDescription: 'The business has been notified.', invalidate: [['deliverables', campaignId], ['creator-payments']], onSuccess: onClose },
  );
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        const err: Record<string, string> = {};
        if (f.title!.trim().length < 2) err.title = 'Give it a title (at least 2 characters).';
        if (!URL_RE.test(f.assetUrl ?? '')) err.assetUrl = 'Paste the full link, starting with https://';
        setErrors(err);
        if (Object.keys(err).length) return;
        m.mutate(
          { title: f.title!.trim(), assetUrl: f.assetUrl!, description: f.description?.trim() || undefined, contentType: f.contentType?.trim() || undefined },
          { onError: (er) => er instanceof ApiError && setErrors(er.fieldErrors) },
        );
      }}
    >
      {existing?.reviewNotes && <Callout tone="warning" title="What the business asked for">{existing.reviewNotes}</Callout>}
      <Input label="Title" name="title" defaultValue={existing?.title ?? ''} error={errors.title} />
      <Input label="Link to your content" name="assetUrl" type="url" defaultValue={existing?.assetUrl ?? ''} error={errors.assetUrl} hint="A public or shareable link, such as a post, video or drive folder." />
      <Input label="Content type (optional)" name="contentType" defaultValue={existing?.contentType ?? ''} hint="For example: Instagram reel, blog post, YouTube video." />
      <Textarea label="Notes for the business (optional)" name="description" defaultValue={existing?.description ?? ''} />
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={m.isPending}>{existing ? 'Resubmit' : 'Submit for review'}</Button>
      </div>
    </form>
  );
}

/** Shown to an approved affiliate on fixed-fee and hybrid campaigns. */
export function CreatorDeliverables({ c }: { c: Campaign }) {
  const [editing, setEditing] = useState<CreatorDeliverable | 'new' | null>(null);
  const q = useQuery({ queryKey: ['deliverables', c.id], queryFn: () => creatorWorkApi.deliverables(c.id) });
  const required = c.requiredDeliverables ?? 1;
  const rows = q.data ?? [];
  const approved = rows.filter((d) => d.status === 'APPROVED').length;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-navy-800">Your deliverables</h3>
          <p className="text-xs text-slate">{approved} of {required} approved. Your fee is released for payment once all {required} are approved.</p>
        </div>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Submit deliverable</Button>
      </div>
      {q.isLoading ? (
        <LoadingBlock rows={1} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate">Nothing submitted yet. Share a link to your content when it is ready for review.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((d) => (
            <li key={d.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-800">{d.title} <span className="text-xs font-normal text-slate">v{d.version}</span></p>
                  <a href={d.assetUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:underline">View content <ExternalLink className="h-3 w-3" /></a>
                  <span className="text-xs text-slate"> · submitted {formatDate(d.submittedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={deliverableStatus[d.status].tone}>{deliverableStatus[d.status].label}</Badge>
                  {d.status === 'REVISION_REQUESTED' && <Button size="sm" variant="secondary" onClick={() => setEditing(d)}>Revise</Button>}
                </div>
              </div>
              {d.reviewNotes && d.status !== 'SUBMITTED' && <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-slate">Business note: {d.reviewNotes}</p>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? 'Revise deliverable' : 'Submit a deliverable'} description={c.name}>
        {editing && <DeliverableForm key={editing === 'new' ? 'new' : editing.id} campaignId={c.id} existing={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
