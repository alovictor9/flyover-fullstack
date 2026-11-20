'use client';
import { useState } from 'react';
import { z } from 'zod';
import { Input, Textarea, Select, ChipSelect, FormError } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { profileApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { CATEGORIES, CHANNELS, COUNTRIES } from '@/lib/status';
import type { AffiliateProfile, AffiliateProfileInput, Me } from '@/lib/types';

export function affiliateCompleteness(me: Me) {
  const p = me.affiliate;
  const checks = [
    { label: 'Add a short bio', done: !!p?.bio },
    { label: 'Choose your promotional channels', done: (p?.promotionalChannels.length ?? 0) > 0 },
    { label: 'Pick the categories you promote', done: (p?.interests.length ?? 0) > 0 },
    { label: 'Tell businesses your audience size', done: p?.audienceSize != null },
    { label: 'Link a social account or website', done: !!p?.website || Object.values(p?.socialLinks ?? {}).some(Boolean) },
    { label: 'Add a phone number', done: !!me.phone },
  ];
  return { percent: (checks.filter((c) => c.done).length / checks.length) * 100, checks };
}

const SOCIALS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'x', label: 'X (Twitter)' },
  { key: 'youtube', label: 'YouTube' },
];

const url = z.string().trim().url('Enter a full URL starting with https://').or(z.literal(''));
const schema = z.object({
  bio: z.string().max(1000, 'Keep your bio under 1,000 characters'),
  website: url,
  audienceSize: z.string().refine((v) => v === '' || /^\d+$/.test(v), 'Enter a whole number'),
  country: z.string(),
  instagram: url,
  tiktok: url,
  x: url,
  youtube: url,
});

/** Used by onboarding (sections=…) and the full profile page. */
export function AffiliateProfileForm({
  profile,
  sections = ['about', 'channels', 'interests', 'socials'],
  submitLabel = 'Save profile',
  onSaved,
  secondaryAction,
}: {
  profile: AffiliateProfile;
  sections?: ('about' | 'channels' | 'interests' | 'socials')[];
  submitLabel?: string;
  onSaved?: (p: AffiliateProfile) => void;
  secondaryAction?: React.ReactNode;
}) {
  const [channels, setChannels] = useState<string[]>(profile.promotionalChannels);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useApiMutation(profileApi.updateAffiliate, { success: 'Profile saved', invalidate: [['me']], onSuccess: (p) => onSaved?.(p) });
  const show = (s: (typeof sections)[number]) => sections.includes(s);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = schema.partial().safeParse(fd);
    if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])));
    setErrors({});
    const d = parsed.data;
    const body: AffiliateProfileInput = {};
    if (show('about')) {
      body.bio = d.bio ?? '';
      body.website = d.website ?? '';
      body.country = d.country;
      if (d.audienceSize) body.audienceSize = Number(d.audienceSize);
    }
    if (show('channels')) body.promotionalChannels = channels;
    if (show('interests')) body.interests = interests;
    if (show('socials')) {
      const links: Record<string, string> = { ...(profile.socialLinks ?? {}) };
      for (const s of SOCIALS) {
        const v = (d as Record<string, string | undefined>)[s.key];
        if (v) links[s.key] = v;
        else delete links[s.key];
      }
      body.socialLinks = links;
    }
    m.mutate(body, {
      onError: (err) => err instanceof ApiError && setErrors(err.fieldErrors),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {show('about') && (
        <div className="space-y-4">
          <Textarea label="Bio" name="bio" defaultValue={profile.bio ?? ''} placeholder="What do you create, and who is your audience?" maxLength={1000} error={errors.bio} hint="Businesses see this when reviewing your applications." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Audience size" name="audienceSize" inputMode="numeric" defaultValue={profile.audienceSize ?? ''} placeholder="e.g. 25000" error={errors.audienceSize} hint="Total followers/subscribers across channels." />
            <Select label="Country" name="country" defaultValue={profile.country} options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
          </div>
          <Input label="Website or blog" name="website" type="url" defaultValue={profile.website ?? ''} placeholder="https://" error={errors.website} />
        </div>
      )}
      {show('channels') && (
        <ChipSelect label="Where do you promote?" hint="Select all that apply." options={CHANNELS} value={channels} onChange={setChannels} />
      )}
      {show('interests') && (
        <ChipSelect label="What categories do you promote?" hint="We use these to recommend campaigns." options={CATEGORIES} value={interests} onChange={setInterests} />
      )}
      {show('socials') && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-navy-700">Social accounts</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIALS.map((s) => (
              <Input key={s.key} label={s.label} name={s.key} type="url" placeholder="https://" defaultValue={profile.socialLinks?.[s.key] ?? ''} error={errors[s.key]} />
            ))}
          </div>
        </div>
      )}
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {secondaryAction}
        <Button type="submit" loading={m.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
