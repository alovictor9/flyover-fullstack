'use client';
import { useMe } from '@/lib/auth';
import { Card, PageHeader } from '@/components/ui/layout';
import { BusinessProfileForm } from '@/components/profile/business-forms';
import { VerificationBanner } from '@/components/profile/verification-banner';

export default function BusinessProfilePage() {
  const me = useMe();
  return (
    <>
      <PageHeader title="Business profile" description="Affiliates see your business name and description on every campaign you publish." />
      <div className="space-y-6">
        <VerificationBanner profile={me.business!} compact />
        <Card>
          <BusinessProfileForm profile={me.business!} />
        </Card>
      </div>
    </>
  );
}
