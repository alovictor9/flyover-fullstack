'use client';
import { useState } from 'react';
import { z } from 'zod';
import { FileUp } from 'lucide-react';
import { Input, Textarea, Select, FormError } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/ui/feedback';
import { profileApi } from '@/lib/endpoints';
import { useApiMutation } from '@/lib/hooks';
import { ApiError } from '@/lib/api-client';
import { COUNTRIES } from '@/lib/status';
import type { BusinessProfile } from '@/lib/types';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your business name'),
  description: z.string().max(2000, 'Keep it under 2,000 characters'),
  website: z.string().trim().url('Enter a full URL starting with https://').or(z.literal('')),
  country: z.string(),
});

export function BusinessProfileForm({ profile, submitLabel = 'Save business profile', onSaved }: { profile: BusinessProfile; submitLabel?: string; onSaved?: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useApiMutation(profileApi.updateBusiness, { success: 'Business profile saved', invalidate: [['me']], onSuccess: () => onSaved?.() });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = profileSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
        if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])));
        setErrors({});
        m.mutate(parsed.data, { onError: (err) => err instanceof ApiError && setErrors(err.fieldErrors) });
      }}
    >
      <Input label="Business name" name="name" required defaultValue={profile.name} error={errors.name} hint="Shown to affiliates on every campaign." />
      <Textarea label="About the business" name="description" defaultValue={profile.description ?? ''} placeholder="What you sell, who your customers are, where you deliver." maxLength={2000} error={errors.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Website" name="website" type="url" placeholder="https://" defaultValue={profile.website ?? ''} error={errors.website} />
        <Select label="Country" name="country" defaultValue={profile.country} options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
      </div>
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end">
        <Button type="submit" loading={m.isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

const verifySchema = z.object({
  registrationNumber: z.string().trim().min(2, 'Enter your CAC registration (RC/BN) number'),
  verificationNotes: z.string().max(2000),
});

export function VerificationForm({ profile, onSubmitted }: { profile: BusinessProfile; onSubmitted?: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useApiMutation(profileApi.submitVerification, {
    success: 'Verification submitted',
    successDescription: 'The Flyover team will review your details. You will be notified of the outcome.',
    invalidate: [['me']],
    onSuccess: () => onSubmitted?.(),
  });
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = verifySchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
        if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])));
        setErrors({});
        m.mutate(
          { registrationNumber: parsed.data.registrationNumber, verificationNotes: parsed.data.verificationNotes || undefined },
          { onError: (err) => err instanceof ApiError && setErrors(err.fieldErrors) },
        );
      }}
    >
      <Input
        label="CAC registration number"
        name="registrationNumber"
        required
        defaultValue={profile.registrationNumber ?? ''}
        placeholder="RC-1234567 or BN-1234567"
        error={errors.registrationNumber}
        hint="We check this against the Corporate Affairs Commission register."
      />
      <Textarea
        label="Anything we should know?"
        name="verificationNotes"
        defaultValue={profile.status === 'REJECTED' ? '' : profile.verificationNotes ?? ''}
        placeholder="Business address, years operating, links to your store or social pages…"
        maxLength={2000}
        error={errors.verificationNotes}
      />
      <ComingSoon title="Document upload" endpoint="POST /businesses/verification/documents">
        <span className="inline-flex items-center gap-1.5">
          <FileUp className="h-4 w-4" /> You&apos;ll be able to upload your CAC certificate and ID here. For now, the team may contact you for documents.
        </span>
      </ComingSoon>
      <FormError message={m.error && !(m.error instanceof ApiError && Object.keys(m.error.fieldErrors).length) ? (m.error as Error).message : null} />
      <div className="flex justify-end">
        <Button type="submit" loading={m.isPending}>
          {profile.status === 'REJECTED' ? 'Resubmit for verification' : 'Submit for verification'}
        </Button>
      </div>
    </form>
  );
}
