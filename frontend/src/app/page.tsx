import Link from 'next/link';
import { ArrowRight, BadgeCheck, Link2, ShieldCheck, Wallet, Megaphone, Store } from 'lucide-react';
import { Logo } from '@/components/ui/misc';

const loop = [
  { icon: Megaphone, title: 'Businesses publish', text: 'Verified businesses create campaigns with clear commission terms. Every campaign is reviewed before it goes live.' },
  { icon: Store, title: 'Affiliates join', text: 'Creators and affiliates browse the marketplace, join open campaigns or apply to restricted ones.' },
  { icon: Link2, title: 'Links get shared', text: 'Each affiliate gets a unique tracked link. Every click is recorded against the right campaign.' },
  { icon: BadgeCheck, title: 'Sales get verified', text: 'Businesses verify each conversion. Nothing is paid on unverified activity.' },
  { icon: Wallet, title: 'Commission is earned', text: 'Approved conversions create auditable commission records that flow into the affiliate wallet.' },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-mist">
            Sign in
          </Link>
          <Link href="/register" className="rounded-xl bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
            Get started
          </Link>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-navy-700">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brick-500/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brick-200">The Affiliate Growth Network</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Grow sales through people who already have the audience.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-navy-100">
            Flyover connects verified businesses with affiliates and creators. Businesses only pay for verified results. Affiliates get transparent,
            auditable earnings.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register?role=BUSINESS" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brick-500 px-6 py-3.5 font-semibold text-white hover:bg-brick-600">
              I&apos;m a business <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/register?role=AFFILIATE" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-navy-700 hover:bg-navy-50">
              I&apos;m an affiliate or creator <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-navy-700">How Flyover works</h2>
        <p className="mt-1 text-slate">One trusted loop, from campaign to commission.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {loop.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-line bg-mist p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-white">{i + 1}</span>
                <s.icon className="h-5 w-5 text-brick-500" aria-hidden />
              </div>
              <h3 className="mt-3 font-semibold text-navy-800">{s.title}</h3>
              <p className="mt-1 text-sm text-slate">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-line bg-white p-5">
          <ShieldCheck className="h-6 w-6 shrink-0 text-navy-700" aria-hidden />
          <p className="text-sm text-slate">
            <span className="font-semibold text-navy-800">Built for trust.</span> Businesses are verified before publishing, campaigns are reviewed before
            they go live, and every commission is backed by an immutable ledger entry.
          </p>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Flyover</span>
          <Link href="/help" className="hover:text-navy-700">
            Help & support
          </Link>
        </div>
      </footer>
    </div>
  );
}
