import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-mist px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brick-500">404</p>
      <h1 className="mt-2 text-2xl font-bold text-navy-700">This page took a different route</h1>
      <p className="mt-2 max-w-sm text-sm text-slate">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="mt-6 rounded-xl bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
        Go home
      </Link>
    </main>
  );
}
