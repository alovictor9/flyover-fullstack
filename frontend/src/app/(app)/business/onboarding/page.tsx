'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hourglass } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { Card } from '@/components/ui/layout';
import { Steps } from '@/components/ui/misc';
import { Button, ButtonLink } from '@/components/ui/button';
import { BusinessProfileForm, VerificationForm } from '@/components/profile/business-forms';

const STEPS = ['Business details', 'Verification', 'Review'];

export default function BusinessOnboarding() {
  const me = useMe();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const p = me.business!;
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-brick-500">Welcome to Flyover</p>
      <h1 className="mt-1 text-2xl font-bold text-navy-700">Set up your business</h1>
      <p className="mt-1 text-sm text-slate">Two quick steps. Once Flyover verifies you, you can publish campaigns to thousands of affiliates.</p>
      <div className="my-6">
        <Steps steps={STEPS} current={step} />
      </div>
      <Card>
        {step === 0 && <BusinessProfileForm profile={p} submitLabel="Continue" onSaved={() => setStep(1)} />}
        {step === 1 && (
          <>
            <VerificationForm profile={p} onSubmitted={() => setStep(2)} />
            <div className="mt-3 flex justify-start">
              <Button variant="ghost" onClick={() => router.push('/business')}>
                I&apos;ll do this later
              </Button>
            </div>
          </>
        )}
        {step === 2 && (
          <div className="py-6 text-center">
            <Hourglass className="mx-auto h-10 w-10 text-warning-600" aria-hidden />
            <h2 className="mt-3 text-xl font-bold text-navy-700">We&apos;re reviewing your business</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate">
              You&apos;ll get a notification as soon as a decision is made. Meanwhile, explore the marketplace to see how other businesses run campaigns.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <ButtonLink href="/business">Go to dashboard</ButtonLink>
              <ButtonLink href="/marketplace" variant="secondary">
                See the marketplace
              </ButtonLink>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
