'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { programApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { payoutLabel } from '@/lib/format';
import type { ProgramAnswers, ProgramField, PublicProgram } from '@/lib/types';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button, ButtonLink } from '@/components/ui/button';
import { Callout, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Input, FormError } from '@/components/ui/form';

const URL_RE = /^https?:\/\/\S+\.\S+/;

function readAnswers(form: Record<string, string>, fields: ProgramField[]): { answers: ProgramAnswers; errors: Record<string, string> } {
  const answers: ProgramAnswers = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = (form[`q_${f.key}`] ?? '').trim();
    if (!raw) {
      if (f.required) errors[`q_${f.key}`] = 'This is required.';
      continue;
    }
    if (f.type === 'NUMBER') {
      if (Number.isNaN(Number(raw))) errors[`q_${f.key}`] = 'Enter a number.';
      else answers[f.key] = Number(raw);
    } else if (f.type === 'URL' && !URL_RE.test(raw)) errors[`q_${f.key}`] = 'Enter a full link, starting with https://';
    else answers[f.key] = raw;
  }
  return { answers, errors };
}

function Questions({ fields, errors }: { fields: ProgramField[]; errors: Record<string, string> }) {
  return (
    <>
      {fields.map((f) => (
        <Input key={f.key} label={f.label} name={`q_${f.key}`} required={f.required} type={f.type === 'URL' ? 'url' : 'text'} inputMode={f.type === 'NUMBER' ? 'decimal' : undefined} error={errors[`q_${f.key}`]} />
      ))}
    </>
  );
}

function RegisterForm({ p }: { p: PublicProgram }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fields = p.customFields ?? [];
  const m = useApiMutation((b: Parameters<typeof programApi.register>[1]) => programApi.register(p.slug, b), {});
  if (m.isSuccess)
    return (
      <Callout tone="success" title={m.data.membershipStatus === 'APPROVED' ? 'You’re in!' : 'Application received'}>
        {m.data.membershipStatus === 'APPROVED' ? `Welcome to ${p.name}.` : `${p.business.name} will review your application and let you know.`} Sign in to continue.
        <div className="mt-3"><ButtonLink href="/login" size="sm">Sign in</ButtonLink></div>
      </Callout>
    );
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        const { answers, errors: qe } = readAnswers(f, fields);
        const err: Record<string, string> = { ...qe };
        if (f.fullName!.trim().length < 2) err.fullName = 'Enter your full name.';
        if (!/^\S+@\S+\.\S+$/.test(f.email ?? '')) err.email = 'Enter a valid email address.';
        if ((f.password ?? '').length < 10) err.password = 'At least 10 characters.';
        setErrors(err);
        if (Object.keys(err).length) return;
        m.mutate({ fullName: f.fullName!.trim(), email: f.email!.trim(), phone: f.phone?.trim() || undefined, password: f.password!, answers }, { onError: (er) => er instanceof ApiError && setErrors(er.fieldErrors) });
      }}
    >
      <Input label="Full name" name="fullName" autoComplete="name" required error={errors.fullName} />
      <Input label="Email address" name="email" type="email" autoComplete="email" required error={errors.email} />
      <Input label="Phone number (optional)" name="phone" type="tel" autoComplete="tel" />
      <Input label="Password" name="password" type="password" autoComplete="new-password" required error={errors.password} hint="At least 10 characters." />
      <Questions fields={fields} errors={errors} />
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <Button type="submit" block size="lg" loading={m.isPending}>{p.requiresApproval ? 'Apply to join' : 'Join now'}</Button>
      <p className="text-center text-sm text-slate">Already have an account? <Link href="/login" className="font-medium text-navy-700 underline">Sign in</Link></p>
    </form>
  );
}

function MemberView({ p }: { p: PublicProgram }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fields = p.customFields ?? [];
  const apply = useApiMutation((answers: ProgramAnswers) => programApi.apply(p.slug, answers), { success: 'Application sent', invalidate: [['programme-campaigns', p.slug]] });
  const camps = useQuery({ queryKey: ['programme-campaigns', p.slug], queryFn: () => programApi.campaigns(p.slug), retry: false });
  const notMember = camps.error instanceof ApiError && camps.error.status === 403;
  if (camps.isLoading) return <LoadingBlock rows={2} />;
  if (camps.data)
    return camps.data.length === 0 ? (
      <Callout tone="success" title="You’re a member">No private campaigns are open right now. Check back soon.</Callout>
    ) : (
      <div className="space-y-3">
        <Callout tone="success" title="You’re a member">These campaigns are open to you.</Callout>
        <ul className="space-y-2">
          {camps.data.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
              <div className="min-w-0"><p className="truncate font-medium text-navy-800">{c.name}</p><p className="text-xs text-slate">{payoutLabel(c)}</p></div>
              <ButtonLink href={`/marketplace/${c.id}`} size="sm" variant="secondary">Open</ButtonLink>
            </li>
          ))}
        </ul>
      </div>
    );
  if (apply.isSuccess)
    return <Callout tone="success" title={apply.data.status === 'APPROVED' ? 'You’re in!' : 'Application received'}>{apply.data.status === 'APPROVED' ? 'Refresh to see the campaigns open to you.' : `${p.business.name} will review it and let you know.`}</Callout>;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const { answers, errors: qe } = readAnswers(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>, fields);
        setErrors(qe);
        if (Object.keys(qe).length) return;
        apply.mutate(answers);
      }}
    >
      {!notMember && camps.isError && <ErrorState error={camps.error} onRetry={() => camps.refetch()} />}
      <Questions fields={fields} errors={errors} />
      <FormError message={apply.error ? (apply.error as Error).message : null} />
      <Button type="submit" block size="lg" loading={apply.isPending}>{p.requiresApproval ? 'Apply to join' : 'Join now'}</Button>
    </form>
  );
}

export default function ProgrammePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['programme', slug], queryFn: () => programApi.publicPage(slug), retry: false });
  if (q.isLoading) return <div className="mx-auto max-w-md p-8"><LoadingBlock rows={3} /></div>;
  if (q.error instanceof ApiError && q.error.status === 404)
    return <div className="mx-auto max-w-md p-8"><EmptyState title="Programme not found" description="This programme page isn’t live. Check the link with the business that shared it." action={<ButtonLink href="/">Go to Flyover</ButtonLink>} /></div>;
  if (q.isError || !q.data) return <div className="mx-auto max-w-md p-8"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  const p = q.data;
  const role = (user as { role?: string } | null | undefined)?.role;
  return (
    <AuthLayout title={p.landingPageTitle ?? `Join ${p.name}`} subtitle={<>{p.landingPageDescription ?? p.description ?? `Become an affiliate partner of ${p.business.name}.`}</>}>
      {p.brandColor && <div className="mb-5 h-1.5 w-16 rounded-full" style={{ backgroundColor: p.brandColor }} aria-hidden />}
      <p className="mb-5 text-sm text-slate">A programme by <b>{p.business.name}</b>{p.business.country ? `, ${p.business.country}` : ''}.</p>
      {!user ? <RegisterForm p={p} /> : role === 'AFFILIATE' ? <MemberView p={p} /> : <Callout tone="neutral">You’re signed in with a {role === 'BUSINESS' ? 'business' : 'non-affiliate'} account. Sign in with an affiliate account to join this programme.</Callout>}
    </AuthLayout>
  );
}
