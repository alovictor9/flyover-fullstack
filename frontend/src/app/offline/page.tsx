import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Offline' };

export default function Offline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-mist px-6 text-center">
      <WifiOff className="mb-4 h-10 w-10 text-navy-300" aria-hidden />
      <h1 className="text-xl font-bold text-navy-700">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-slate">
        Flyover needs a connection to show live campaigns, wallet balances and conversions. Reconnect and try again.
      </p>
      <a href="/" className="mt-6 rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white">
        Retry
      </a>
    </main>
  );
}
