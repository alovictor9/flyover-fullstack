'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { AuthLayout } from '@/components/layout/auth-layout';
import { RedirectIfAuthed } from '@/components/layout/guards';
import { Input, FormError } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { useAuth, roleHome } from '@/lib/auth';
import { ApiError, errorMessage } from '@/lib/api-client';
import { USE_MOCKS } from '@/lib/config';

const schema = z.object({ email: z.string().email('Enter a valid email address'), password: z.string().min(1, 'Enter your password') });

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const expired = params.get('expired') === '1';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = schema.safeParse(fd);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])));
      return;
    }
    setErrors({});
    setFormError(null);
    setLoading(true);
    try {
      const me = await login(parsed.data.email, parsed.data.password);
      const next = params.get('next');
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : roleHome[me.role]);
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.code === 'INVALID_CREDENTIALS'
          ? 'That email and password combination is not right. If your account was suspended, contact support.'
          : errorMessage(err),
      );
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your campaigns, links and earnings."
      footer={
        <>
          New to Flyover?{' '}
          <Link href="/register" className="font-semibold text-navy-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {expired && (
        <Callout tone="warning" className="mb-5">
          Your session expired. Please sign in again.
        </Callout>
      )}
      {USE_MOCKS && (
        <Callout tone="info" title="Demo mode" className="mb-5">
          Use <b>affiliate@demo.ng</b>, <b>business@demo.ng</b> or <b>admin@demo.ng</b> with password <b>password1234</b>.
        </Callout>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <Input label="Email address" name="email" type="email" autoComplete="email" required error={errors.email} />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required error={errors.password} />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-navy-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" block size="lg" loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <RedirectIfAuthed>
      <Suspense>
        <LoginForm />
      </Suspense>
    </RedirectIfAuthed>
  );
}
