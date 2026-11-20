'use client';
import { CheckCircle2, Circle } from 'lucide-react';
import { useMe } from '@/lib/auth';
import { Card, CardHeader, PageHeader } from '@/components/ui/layout';
import { ProgressBar } from '@/components/ui/misc';
import { AffiliateProfileForm, affiliateCompleteness } from '@/components/profile/affiliate-profile-form';

export default function AffiliateProfilePage() {
  const me = useMe();
  const { percent, checks } = affiliateCompleteness(me);
  return (
    <>
      <PageHeader title="Affiliate profile" description="This is what businesses see when you apply to their campaigns." />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <AffiliateProfileForm profile={me.affiliate!} />
        </Card>
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader title="Profile strength" />
            <ProgressBar value={percent} label="Complete" />
            <ul className="mt-4 space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-sm">
                  {c.done ? <CheckCircle2 className="h-4 w-4 text-success-600" aria-hidden /> : <Circle className="h-4 w-4 text-line" aria-hidden />}
                  <span className={c.done ? 'text-slate line-through' : 'text-navy-700'}>{c.label}</span>
                </li>
              ))}
            </ul>
            {!me.phone && <p className="mt-3 text-xs text-slate">Phone numbers are set at sign-up. Editing account details is coming soon.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
