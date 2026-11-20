import Link from 'next/link';
import { MailOpen } from 'lucide-react';
import { AuthLayout } from '@/components/layout/auth-layout';
import { ComingSoon } from '@/components/ui/feedback';

export const metadata = { title: 'Verify your email' };

/** Landing page for email verification links. Wired once the backend sends verification emails. */
export default function VerifyEmailPage() {
  return (
    <AuthLayout title="Verify your email" footer={<Link href="/login" className="font-semibold text-navy-700 hover:underline">Back to sign in</Link>}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-line bg-mist p-4">
          <MailOpen className="h-6 w-6 shrink-0 text-navy-700" />
          <p className="text-sm text-slate">We&apos;ll confirm your email address so businesses and affiliates know your account is genuine.</p>
        </div>
        <ComingSoon title="Email verification" endpoint="POST /auth/verify-email">
          Verification emails aren&apos;t sent yet. You can keep using Flyover normally in the meantime.
        </ComingSoon>
      </div>
    </AuthLayout>
  );
}
