'use client';
import Link from 'next/link';
import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Input } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/ui/feedback';

/**
 * Password recovery UI. The backend does not yet expose a reset endpoint or send email
 * (see docs/BACKEND_GAPS.md). The form is complete so it can be wired to
 * POST /auth/password/forgot and POST /auth/password/reset when they land.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  return (
    <AuthLayout
      title={sent ? 'Check your email' : 'Reset your password'}
      subtitle={sent ? undefined : "Enter your account email and we'll send you a reset link."}
      footer={
        <Link href="/login" className="font-semibold text-navy-700 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-line bg-mist p-4">
            <MailCheck className="h-6 w-6 shrink-0 text-navy-700" />
            <p className="text-sm text-slate">If an account exists for that email, a reset link will arrive shortly.</p>
          </div>
          <ComingSoon title="Email delivery is not switched on yet" endpoint="POST /auth/password/forgot">
            Password reset emails will start working once the backend adds this endpoint. For now, contact support to reset your password.
          </ComingSoon>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <Input label="Email address" name="email" type="email" autoComplete="email" required />
          <Button type="submit" block size="lg">
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
