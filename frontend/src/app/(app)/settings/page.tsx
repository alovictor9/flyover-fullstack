'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, LogOut, RotateCcw, Smartphone } from 'lucide-react';
import { useAuth, useMe } from '@/lib/auth';
import { Card, CardHeader, DescriptionList, PageHeader } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { ComingSoon, Badge } from '@/components/ui/feedback';
import { formatDate } from '@/lib/format';
import { USE_MOCKS } from '@/lib/config';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function SettingsPage() {
  const me = useMe();
  const { logout } = useAuth();
  const router = useRouter();
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);
    const h = (e: Event) => (e.preventDefault(), setBip(e as BIPEvent));
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  const roleName = { AFFILIATE: 'Affiliate', BUSINESS: 'Business', ADMIN: 'Administrator' }[me.role];

  return (
    <>
      <PageHeader title="Account settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" description="Account details are set at sign-up." />
          <DescriptionList
            items={[
              { label: 'Name', value: me.fullName },
              { label: 'Email', value: me.email },
              { label: 'Phone', value: me.phone ?? '—' },
              { label: 'Account type', value: <Badge tone="brand">{roleName}</Badge> },
              { label: 'Member since', value: formatDate(me.createdAt) },
            ]}
          />
          <div className="mt-4">
            <ComingSoon title="Edit name, email and phone" endpoint="PATCH /auth/me" />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Security" />
            <ComingSoon title="Change password" endpoint="POST /auth/password/change">
              Until then, sign out of shared devices and use a strong, unique password.
            </ComingSoon>
            <Button
              variant="danger"
              className="mt-4"
              icon={<LogOut className="h-4 w-4" />}
              onClick={async () => {
                await logout();
                router.replace('/login');
              }}
            >
              Sign out
            </Button>
          </Card>
          <Card>
            <CardHeader title="Install the app" description="Add Flyover to your home screen for quick, full-screen access." />
            {installed ? (
              <p className="flex items-center gap-2 text-sm text-success-700">
                <Smartphone className="h-4 w-4" /> You&apos;re using the installed app.
              </p>
            ) : bip ? (
              <Button
                icon={<Download className="h-4 w-4" />}
                onClick={async () => {
                  await bip.prompt();
                  setBip(null);
                }}
              >
                Install Flyover
              </Button>
            ) : (
              <p className="text-sm text-slate">
                On iPhone: tap <b>Share</b> → <b>Add to Home Screen</b>. On Android/Chrome: open the browser menu → <b>Install app</b>.
              </p>
            )}
          </Card>
          {USE_MOCKS && (
            <Card>
              <CardHeader title="Demo data" description="Running on built-in mock data, not the real backend." />
              <Button
                variant="secondary"
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={async () => {
                  const m = await import('@/lib/mock/server');
                  m.resetMockDb();
                  await logout();
                  router.replace('/login');
                }}
              >
                Reset demo data
              </Button>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
