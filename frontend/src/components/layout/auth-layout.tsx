import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/misc';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-navy-700 p-12 lg:flex lg:flex-col">
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brick-500/25 blur-3xl" aria-hidden />
        <Link href="/">
          <Logo inverted />
        </Link>
        <div className="relative mt-auto">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brick-200">The Affiliate Growth Network</p>
          <p className="mt-4 text-3xl font-bold leading-snug text-white">Verified businesses. Tracked referrals. Commission you can audit.</p>
        </div>
      </aside>
      <main className="flex flex-col bg-white px-5 py-8 sm:px-10">
        <Link href="/" className="lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto my-auto w-full max-w-md py-10">
          <h1 className="text-2xl font-bold tracking-tight text-navy-700">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-slate">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
