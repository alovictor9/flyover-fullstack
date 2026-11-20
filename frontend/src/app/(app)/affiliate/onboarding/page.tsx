'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PartyPopper } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { Card } from '@/components/ui/layout';
import { Steps } from '@/components/ui/misc';
import { Button, ButtonLink } from '@/components/ui/button';
import { AffiliateProfileForm } from '@/components/profile/affiliate-profile-form';

const STEPS = ['Channels', 'Interests', 'About you', 'Done'];

export default function AffiliateOnboarding() {
  const me = useMe();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const p = me.affiliate!;
  const next = () => setStep((s) => s + 1);
  const skip = (
    <Button variant="ghost" onClick={() => router.push('/affiliate')}>
      Skip for now
    </Button>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-brick-500">Welcome, {me.fullName.split(' ')[0]}</p>
      <h1 className="mt-1 text-2xl font-bold text-navy-700">Set up your affiliate profile</h1>
      <p className="mt-1 text-sm text-slate">A complete profile helps businesses approve your applications faster.</p>
      <div className="my-6">
        <Steps steps={STEPS} current={step} />
      </div>
      <Card>
        {step === 0 && <AffiliateProfileForm key="c" profile={p} sections={['channels']} submitLabel="Continue" onSaved={next} secondaryAction={skip} />}
        {step === 1 && <AffiliateProfileForm key="i" profile={p} sections={['interests']} submitLabel="Continue" onSaved={next} secondaryAction={skip} />}
        {step === 2 && <AffiliateProfileForm key="a" profile={p} sections={['about', 'socials']} submitLabel="Finish" onSaved={next} secondaryAction={skip} />}
        {step === 3 && (
          <div className="py-6 text-center">
            <PartyPopper className="mx-auto h-10 w-10 text-brick-500" aria-hidden />
            <h2 className="mt-3 text-xl font-bold text-navy-700">You&apos;re ready to start earning</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate">Browse live campaigns, join the ones that fit your audience and share your unique link.</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <ButtonLink href="/marketplace">Browse campaigns</ButtonLink>
              <ButtonLink href="/affiliate" variant="secondary">
                Go to dashboard
              </ButtonLink>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
