'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { creatorApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { CATEGORIES, COUNTRIES } from '@/lib/status';
import type { CreatorProfile, CreatorStatus } from '@/lib/types';
import { Card, CardHeader, PageHeader } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { Callout, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Input, Select, Textarea, ChipSelect, FormError } from '@/components/ui/form';

const URL_RE = /^https?:\/\/\S+\.\S+/;
const LANGS = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French'];

function CreatorForm({ profile }: { profile: CreatorProfile | null }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [niches, setNiches] = useState<string[]>(profile?.niches ?? []);
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);
  const m = useApiMutation(creatorApi.save, { success: 'Creator profile saved', invalidate: [['creator-me']] });
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        const err: Record<string, string> = {};
        if (f.displayName!.trim().length < 2) err.displayName = 'At least 2 characters.';
        for (const k of ['portfolioUrl', 'mediaKitUrl'] as const) if (f[k] && !URL_RE.test(f[k]!)) err[k] = 'Enter a full URL, starting with https://';
        const aud = f.audienceSize ? Number(f.audienceSize) : undefined;
        if (aud !== undefined && (!Number.isInteger(aud) || aud < 0)) err.audienceSize = 'Enter a whole number.';
        const eng = f.engagementRate ? Number(f.engagementRate) : undefined;
        if (eng !== undefined && (Number.isNaN(eng) || eng < 0 || eng > 100)) err.engagementRate = 'Enter a number from 0 to 100.';
        setErrors(err);
        if (Object.keys(err).length) return;
        m.mutate(
          {
            displayName: f.displayName!.trim(),
            bio: f.bio?.trim() || undefined,
            niches,
            country: f.country!,
            city: f.city?.trim() || undefined,
            languages,
            portfolioUrl: f.portfolioUrl || undefined,
            mediaKitUrl: f.mediaKitUrl || undefined,
            audienceSize: aud,
            engagementRate: eng,
            status: f.status as CreatorStatus,
          },
          { onError: (er) => er instanceof ApiError && setErrors(er.fieldErrors) },
        );
      }}
    >
      <Input label="Display name" name="displayName" defaultValue={profile?.displayName ?? ''} error={errors.displayName} hint="The name businesses see when they browse creators." />
      <Textarea label="About you" name="bio" defaultValue={profile?.bio ?? ''} hint="What you make and who your audience is." />
      <ChipSelect label="Your niches" hint="Pick the topics you create content about." options={CATEGORIES} value={niches} onChange={setNiches} />
      <ChipSelect label="Languages" options={LANGS} value={languages} onChange={setLanguages} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Country" name="country" defaultValue={profile?.country ?? 'Nigeria'} options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
        <Input label="City (optional)" name="city" defaultValue={profile?.city ?? ''} />
        <Input label="Audience size (optional)" name="audienceSize" inputMode="numeric" defaultValue={profile?.audienceSize ?? ''} error={errors.audienceSize} />
        <Input label="Engagement rate (optional)" name="engagementRate" inputMode="decimal" suffix="%" defaultValue={profile?.engagementRate ? String(Number(profile.engagementRate)) : ''} error={errors.engagementRate} />
        <Input label="Portfolio link (optional)" name="portfolioUrl" type="url" defaultValue={profile?.portfolioUrl ?? ''} error={errors.portfolioUrl} />
        <Input label="Media kit link (optional)" name="mediaKitUrl" type="url" defaultValue={profile?.mediaKitUrl ?? ''} error={errors.mediaKitUrl} />
      </div>
      <Select
        label="Visibility"
        name="status"
        defaultValue={profile?.status ?? 'ACTIVE'}
        options={[{ value: 'ACTIVE', label: 'Visible to businesses' }, { value: 'PAUSED', label: 'Hidden (paused)' }]}
        hint="Hidden profiles don’t appear in creator search."
      />
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end">
        <Button type="submit" loading={m.isPending}>Save creator profile</Button>
      </div>
    </form>
  );
}

export default function CreatorProfilePage() {
  const q = useQuery({ queryKey: ['creator-me'], queryFn: creatorApi.me });
  return (
    <>
      <PageHeader title="Creator profile" description="Let businesses find you for fixed-fee and hybrid campaigns." />
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-4">
          {!q.data && <Callout tone="neutral" title="You don’t have a creator profile yet">Fill this in and save to appear in creator search. Your affiliate profile stays as it is.</Callout>}
          <Card>
            <CardHeader title="Your public details" />
            <CreatorForm key={q.data?.updatedAt ?? 'new'} profile={q.data ?? null} />
          </Card>
        </div>
      )}
    </>
  );
}
