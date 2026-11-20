'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Building2, Sparkles } from 'lucide-react';
import { AuthLayout } from '@/components/layout/auth-layout';
import { RedirectIfAuthed } from '@/components/layout/guards';
import { Input, FormError, ChoiceCards } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { ApiError, errorMessage } from '@/lib/api-client';

// Mirrors backend validation in POST /auth/register.
const schema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(120),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^\+?[0-9\s-]{7,20}$/.test(v), 'Enter a valid phone number'),
    password: z.string().min(10, 'Use at least 10 characters').max(128),
    confirm: z.string(),
    terms: z.literal('on', { message: 'You need to accept the terms to continue' }),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 10) s++;
  if (pw.length >= 14) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<'AFFILIATE' | 'BUSINESS'>(params.get('role') === 'BUSINESS' ? 'BUSINESS' : 'AFFILIATE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pw, setPw] = useState('');
  const st = strength(pw);

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
      const { fullName, email, phone, password } = parsed.data;
      await register({ fullName, email, phone: phone || undefined, password, role });
      router.replace(role === 'BUSINESS' ? '/business/onboarding' : '/affiliate/onboarding');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') setErrors({ email: 'An account with this email already exists. Try signing in.' });
      else if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else setFormError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your Flyover account"
      subtitle="Choose how you'll use Flyover. You can't switch account type later."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-navy-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <ChoiceCards
          value={role}
          onChange={setRole}
          options={[
            { value: 'AFFILIATE', title: 'Affiliate / Creator', description: 'Promote campaigns and earn commission.', icon: <Sparkles className="h-5 w-5" /> },
            { value: 'BUSINESS', title: 'Business', description: 'Grow sales through affiliates.', icon: <Building2 className="h-5 w-5" /> },
          ]}
        />
        <FormError message={formError} />
        <Input
          label={role === 'BUSINESS' ? 'Your full name (account owner)' : 'Full name'}
          name="fullName"
          autoComplete="name"
          required
          error={errors.fullName}
        />
        <Input label="Email address" name="email" type="email" autoComplete="email" required error={errors.email} />
        <Input label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="+234 800 000 0000" hint="Optional" error={errors.phone} />
        <div className="space-y-2">
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            error={errors.password}
            hint="At least 10 characters."
          />
          {pw && (
            <div className="flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full ${i < st ? (st <= 1 ? 'bg-brick-500' : st === 2 ? 'bg-warning-600' : 'bg-success-600') : 'bg-line'}`} />
                ))}
              </div>
              <span className="text-xs text-slate">{['Too weak', 'Weak', 'Okay', 'Good', 'Strong'][st]}</span>
            </div>
          )}
        </div>
        <Input label="Confirm password" name="confirm" type="password" autoComplete="new-password" required error={errors.confirm} />
        <div>
          <label className="flex items-start gap-2.5 text-sm text-slate">
            <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 rounded border-line accent-navy-700" />
            <span>
              I agree to Flyover&apos;s{' '}
              <Link href="/help#terms" className="font-medium text-navy-700 underline">
                terms
              </Link>{' '}
              and{' '}
              <Link href="/help#privacy" className="font-medium text-navy-700 underline">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {errors.terms && <p className="mt-1 text-xs font-medium text-brick-600">{errors.terms}</p>}
        </div>
        <Button type="submit" block size="lg" loading={loading}>
          Create {role === 'BUSINESS' ? 'business' : 'affiliate'} account
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <RedirectIfAuthed>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </RedirectIfAuthed>
  );
}
