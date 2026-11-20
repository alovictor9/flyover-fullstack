import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Logo } from '@/components/ui/misc';

export const metadata = { title: 'Help & support' };

const FAQ: { group: string; items: { q: string; a: string }[] }[] = [
  {
    group: 'Affiliates',
    items: [
      { q: 'How do I start earning?', a: 'Open the Marketplace, join an open campaign (or apply to one that needs approval) and share the unique link you get under My links. When a business verifies a sale or lead from your link, a commission is created for you.' },
      { q: 'Why is my commission “pending”?', a: 'Each campaign has a validation period (for example 14 days) to allow for refunds. After it ends, the commission moves to your available balance.' },
      { q: 'When can I withdraw?', a: 'Once your available balance reaches the minimum (currently ₦5,000). Withdrawals are reviewed and paid by the Flyover finance team, and you will see the bank payment reference when it is paid.' },
      { q: 'A conversion was rejected. What can I do?', a: 'Businesses must give a reason when they reject a conversion. If you think it was wrong, email support with the order reference and campaign name.' },
    ],
  },
  {
    group: 'Businesses',
    items: [
      { q: 'Why do I need to be verified?', a: 'Verification protects affiliates and customers. Only verified businesses can add products and publish campaigns.' },
      { q: 'How do campaigns go live?', a: 'Create a campaign and submit it for review. The Flyover team checks it and approves it, after which it appears in the marketplace.' },
      { q: 'How do I record a sale?', a: 'Go to Conversions → Record conversion and enter the affiliate’s referral code, your order reference and the sale value. Then approve it once you have confirmed the order. Flyover calculates the commission from your campaign terms.' },
      { q: 'What does “open”, “application” and “invite only” mean?', a: 'Open: any affiliate can join instantly. Application: affiliates apply and you approve them. Invite only: only affiliates you invite (invitations are coming soon).' },
    ],
  },
  {
    group: 'Account & security',
    items: [
      { q: 'I forgot my password', a: 'Self-service password reset is coming soon. Until then, email support from the address on your account.' },
      { q: 'Can I install Flyover on my phone?', a: 'Yes. On Android/Chrome use “Install app” from the browser menu. On iPhone, tap Share → Add to Home Screen.' },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-dvh bg-mist">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/login" className="text-sm font-semibold text-navy-700 hover:underline">
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-navy-700">Help & support</h1>
        <p className="mt-2 text-slate">Answers to common questions about using Flyover.</p>
        <div className="mt-8 space-y-10">
          {FAQ.map((g) => (
            <section key={g.group}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brick-500">{g.group}</h2>
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                {g.items.map((i) => (
                  <details key={i.q} className="group px-5 py-4">
                    <summary className="cursor-pointer list-none font-semibold text-navy-800 marker:hidden">
                      <span className="flex items-center justify-between gap-4">
                        {i.q}
                        <span className="text-slate transition-transform group-open:rotate-45" aria-hidden>
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-slate">{i.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
          <section className="rounded-2xl bg-navy-700 p-6 text-white">
            <h2 className="text-lg font-semibold">Still need help?</h2>
            <p className="mt-1 text-sm text-navy-100">Email us and include your account email and any order or campaign references.</p>
            <a href="mailto:support@flyover.ng" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy-700">
              <Mail className="h-4 w-4" /> support@flyover.ng
            </a>
          </section>
          <section id="terms" className="text-sm text-slate">
            <h2 className="font-semibold text-navy-800">Terms of service</h2>
            <p className="mt-1">The full terms will be published before public launch.</p>
          </section>
          <section id="privacy" className="text-sm text-slate">
            <h2 className="font-semibold text-navy-800">Privacy policy</h2>
            <p className="mt-1">Flyover stores only what it needs to run campaigns and pay commissions. Click records store a hashed IP, never the raw address. The full policy will be published before public launch.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
