'use client';
import { BadgeCheck, FileSearch, Send, Megaphone } from 'lucide-react';
import { clsx } from 'clsx';
import { useMe } from '@/lib/auth';
import { Card, CardHeader, DescriptionList, PageHeader } from '@/components/ui/layout';
import { StatusBadge } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { VerificationForm } from '@/components/profile/business-forms';
import { VerificationBanner } from '@/components/profile/verification-banner';
import { businessStatus } from '@/lib/status';
import { formatDate } from '@/lib/format';

export default function VerificationPage() {
  const me = useMe();
  const p = me.business!;
  const submitted = !!p.submittedAt;
  // index of the current step: 0 submit, 1 in review, 3 publish (verified done)
  const stage = p.status === 'APPROVED' ? 3 : submitted && p.status === 'PENDING' ? 1 : 0;
  const timeline = [
    { icon: Send, label: 'Submit details' },
    { icon: FileSearch, label: 'Flyover review' },
    { icon: BadgeCheck, label: 'Verified' },
    { icon: Megaphone, label: 'Publish campaigns' },
  ];

  return (
    <>
      <PageHeader title="Business verification" description="Every business on Flyover is verified before its campaigns can go live." />
      <div className="space-y-6">
        <VerificationBanner profile={p} />
        <Card>
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {timeline.map((t, i) => (
              <li key={t.label} className="flex items-center gap-3">
                <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', i < stage ? 'bg-success-600 text-white' : i === stage ? 'bg-navy-700 text-white' : 'bg-mist text-slate')}>
                  <t.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className={clsx('text-sm font-medium', i <= stage ? 'text-navy-800' : 'text-slate')}>{t.label}</span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            {p.status === 'APPROVED' ? (
              <div className="py-4 text-center">
                <BadgeCheck className="mx-auto h-10 w-10 text-success-600" aria-hidden />
                <h2 className="mt-2 text-lg font-bold text-navy-700">You&apos;re verified</h2>
                <p className="mt-1 text-sm text-slate">Add your products and launch your first campaign.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <ButtonLink href="/business/campaigns/new">Create campaign</ButtonLink>
                  <ButtonLink href="/business/products" variant="secondary">
                    Add products
                  </ButtonLink>
                </div>
              </div>
            ) : p.status === 'SUSPENDED' ? (
              <p className="text-sm text-slate">Verification changes are disabled while your business is suspended.</p>
            ) : (
              <>
                <CardHeader title={submitted && p.status === 'PENDING' ? 'Update your submission' : 'Verification details'} description="Make sure your business profile is complete before submitting." />
                <VerificationForm profile={p} />
              </>
            )}
          </Card>
          <Card className="lg:self-start">
            <CardHeader title="Current record" />
            <DescriptionList
              items={[
                { label: 'Status', value: <StatusBadge map={businessStatus} value={p.status} /> },
                { label: 'Business name', value: p.name },
                { label: 'Registration no.', value: p.registrationNumber ?? '—' },
                { label: 'Submitted', value: formatDate(p.submittedAt, true) },
                { label: 'Reviewed', value: formatDate(p.reviewedAt, true) },
              ]}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
