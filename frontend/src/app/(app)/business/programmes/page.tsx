'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Network, Plus, Trash2 } from 'lucide-react';
import { programApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { programStatus, fieldKey } from '@/lib/program-status';
import type { AffiliateProgram, ProgramField, ProgramFieldType, ProgramStatus } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/layout';
import { Button, ButtonLink } from '@/components/ui/button';
import { Badge, Callout, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/overlay';
import { Input, Select, Textarea, FormError } from '@/components/ui/form';
import { CopyButton } from '@/components/ui/misc';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

function CreateProgram({ onClose }: { onClose: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [fields, setFields] = useState<{ label: string; type: ProgramFieldType; required: boolean }[]>([]);
  const m = useApiMutation(programApi.create, {
    success: 'Programme created',
    successDescription: 'It starts as a draft. Make it live when you are ready to accept affiliates.',
    invalidate: [['programs']],
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
        if (name.trim().length < 3) err.name = 'At least 3 characters.';
        if (slug.length < 3 || !SLUG_RE.test(slug)) err.slug = 'Use 3 or more lowercase letters, numbers and single dashes.';
        if (f.brandColor && !/^#[0-9a-fA-F]{6}$/.test(f.brandColor)) err.brandColor = 'Use a colour like #1F3A5F.';
        if (fields.some((x) => !x.label.trim())) err.fields = 'Give every question a label, or remove it.';
        setErrors(err);
        if (Object.keys(err).length) return;
        const customFields: ProgramField[] = fields.map((x, i) => ({ key: fieldKey(x.label, i), label: x.label.trim(), type: x.type, required: x.required }));
        m.mutate(
          {
            name: name.trim(),
            slug,
            description: f.description?.trim() || undefined,
            requiresApproval: f.requiresApproval === 'yes',
            landingPageTitle: f.landingPageTitle?.trim() || undefined,
            landingPageDescription: f.landingPageDescription?.trim() || undefined,
            brandColor: f.brandColor || undefined,
            customFields,
          },
          { onError: (er) => er instanceof ApiError && setErrors(er.fieldErrors) },
        );
      }}
    >
      <Input label="Programme name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} error={errors.name} />
      <Input label="Page address" value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true); }} error={errors.slug} hint={`Your page will be at /programme/${slug || 'your-address'}`} />
      <Textarea label="Description (optional)" name="description" />
      <Select label="New affiliates" name="requiresApproval" defaultValue="yes" options={[{ value: 'yes', label: 'I approve each one' }, { value: 'no', label: 'Approve automatically' }]} />
      <Input label="Page headline (optional)" name="landingPageTitle" />
      <Textarea label="Page intro (optional)" name="landingPageDescription" />
      <Input label="Brand colour (optional)" name="brandColor" placeholder="#1F3A5F" error={errors.brandColor} />
      <div className="space-y-2">
        <p className="text-sm font-medium text-navy-800">Questions for new affiliates (optional)</p>
        {fields.map((x, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem] flex-1">
              <Input label="Question" value={x.label} onChange={(e) => setFields((p) => p.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} />
            </div>
            <Select label="Answer type" value={x.type} onChange={(e) => setFields((p) => p.map((y, j) => (j === i ? { ...y, type: e.target.value as ProgramFieldType } : y)))} options={[{ value: 'TEXT', label: 'Text' }, { value: 'URL', label: 'Link' }, { value: 'NUMBER', label: 'Number' }]} />
            <label className="flex items-center gap-1.5 pb-2.5 text-sm text-slate">
              <input type="checkbox" checked={x.required} onChange={(e) => setFields((p) => p.map((y, j) => (j === i ? { ...y, required: e.target.checked } : y)))} className="h-4 w-4 accent-navy-700" /> Required
            </label>
            <Button variant="ghost" size="sm" aria-label="Remove question" icon={<Trash2 className="h-4 w-4" />} onClick={() => setFields((p) => p.filter((_, j) => j !== i))} />
          </div>
        ))}
        {errors.fields && <p className="text-xs font-medium text-brick-600">{errors.fields}</p>}
        {fields.length < 20 && <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setFields((p) => [...p, { label: '', type: 'TEXT', required: false }])}>Add a question</Button>}
      </div>
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={m.isPending}>Create programme</Button>
      </div>
    </form>
  );
}

function ProgramCard({ p, origin }: { p: AffiliateProgram; origin: string }) {
  const s = programStatus[p.status];
  const set = useApiMutation((status: ProgramStatus) => programApi.update(p.id, { status }), { success: 'Programme updated', invalidate: [['programs']] });
  const actions: { to: ProgramStatus; label: string }[] =
    p.status === 'DRAFT' ? [{ to: 'ACTIVE', label: 'Make live' }]
    : p.status === 'ACTIVE' ? [{ to: 'PAUSED', label: 'Pause' }, { to: 'ARCHIVED', label: 'Archive' }]
    : p.status === 'PAUSED' ? [{ to: 'ACTIVE', label: 'Resume' }, { to: 'ARCHIVED', label: 'Archive' }]
    : [];
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-navy-800">{p.name}</h2>
          <p className="text-xs text-slate">{p._count?.memberships ?? 0} members · {p._count?.campaigns ?? 0} campaigns · {p.requiresApproval ? 'approval required' : 'auto-approved'}</p>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      {p.status === 'ACTIVE' && origin && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs text-slate">{origin}/programme/{p.slug}</span>
          <CopyButton value={`${origin}/programme/${p.slug}`} label="Copy link" />
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href={`/business/programmes/${p.id}`} variant="secondary" size="sm">Members</ButtonLink>
        {actions.map((a) => <Button key={a.to} size="sm" variant="secondary" loading={set.isPending && set.variables === a.to} onClick={() => set.mutate(a.to)}>{a.label}</Button>)}
      </div>
      {set.error && <p className="mt-2 text-xs font-medium text-brick-600">{(set.error as Error).message}</p>}
    </Card>
  );
}

export default function ProgrammesPage() {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const q = useQuery({ queryKey: ['programs'], queryFn: programApi.list });
  return (
    <>
      <PageHeader
        title="Affiliate programmes"
        description="Run a private programme with its own sign-up page. Affiliates you approve can see your private campaigns."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>New programme</Button>}
      />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon={<Network className="h-6 w-6" />} title="No programmes yet" description="Create a programme to get a sign-up page you can share with your own audience and partners." action={<Button onClick={() => setOpen(true)}>Create a programme</Button>} />
      ) : (
        <>
          <Callout tone="neutral" className="mb-4">To run a private campaign, choose &ldquo;Private programme&rdquo; as the access option when you create it.</Callout>
          <div className="grid gap-4 md:grid-cols-2">{q.data!.map((p) => <ProgramCard key={p.id} p={p} origin={origin} />)}</div>
        </>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New affiliate programme" description="You can add campaigns to it once it is live.">
        {open && <CreateProgram onClose={() => setOpen(false)} />}
      </Modal>
    </>
  );
}
