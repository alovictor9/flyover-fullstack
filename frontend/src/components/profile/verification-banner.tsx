'use client';
import { ButtonLink } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { formatDate } from '@/lib/format';
import type { BusinessProfile } from '@/lib/types';

/** Status + next-step messaging for business verification. Shown on dashboard and gated pages. */
export function VerificationBanner({ profile, compact }: { profile: BusinessProfile; compact?: boolean }) {
  const { status, submittedAt, verificationNotes } = profile;
  if (status === 'APPROVED') {
    if (compact) return null;
    return (
      <Callout tone="success" title="Your business is verified">
        You can add products and publish campaigns.
      </Callout>
    );
  }
  if (status === 'PENDING' && submittedAt)
    return (
      <Callout tone="warning" title="Verification in review">
        Submitted {formatDate(submittedAt)}. You can complete your profile while you wait. Products and campaigns unlock once you&apos;re approved.
      </Callout>
    );
  if (status === 'PENDING')
    return (
      <Callout
        tone="brand"
        title="Verify your business to start publishing"
        action={
          <ButtonLink href="/business/verification" size="sm">
            Start verification
          </ButtonLink>
        }
      >
        Flyover verifies every business before its campaigns go live, so affiliates can trust who they promote.
      </Callout>
    );
  if (status === 'REJECTED')
    return (
      <Callout
        tone="danger"
        title="Verification was not approved"
        action={
          <ButtonLink href="/business/verification" size="sm" variant="secondary">
            Update & resubmit
          </ButtonLink>
        }
      >
        {verificationNotes ? <>Reason: {verificationNotes}</> : 'Review your details and resubmit.'}
      </Callout>
    );
  return (
    <Callout tone="danger" title="Business suspended">
      Your campaigns are paused. Contact support@flyover.ng to resolve this.
    </Callout>
  );
}

/** Wraps pages that require an approved business (products, campaign creation). */
export function RequireApprovedBusiness({ profile, children, what }: { profile: BusinessProfile; children: React.ReactNode; what: string }) {
  if (profile.status === 'APPROVED') return <>{children}</>;
  return (
    <div className="space-y-4">
      <VerificationBanner profile={profile} />
      <p className="text-sm text-slate">You&apos;ll be able to {what} once Flyover approves your business.</p>
    </div>
  );
}
