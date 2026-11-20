'use client';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ExternalLink, MapPin, Sparkles } from 'lucide-react';
import { creatorApi } from '@/lib/endpoints';
import { formatNumber, formatPercent } from '@/lib/format';
import { CATEGORIES, COUNTRIES } from '@/lib/status';
import { Card, PageHeader } from '@/components/ui/layout';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/form';
import { Avatar } from '@/components/ui/misc';

const LIMIT = 12;

export default function FindCreatorsPage() {
  const [f, setF] = useState({ niche: '', country: '', city: '', minAudience: '', page: 1 });
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, page: 1, ...patch }));
  const q = useQuery({
    queryKey: ['creators', f],
    queryFn: () => creatorApi.discover({ niche: f.niche || undefined, country: f.country || undefined, city: f.city || undefined, minAudience: f.minAudience ? Number(f.minAudience) : undefined, page: f.page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const items = q.data?.data ?? [];
  const meta = q.data?.meta;
  return (
    <>
      <PageHeader title="Find creators" description="Search creators by niche, location and audience size to work with on fixed-fee or hybrid campaigns." />
      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Niche" value={f.niche} onChange={(e) => set({ niche: e.target.value })} placeholder="Any niche" options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Select label="Country" value={f.country} onChange={(e) => set({ country: e.target.value })} placeholder="Any country" options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
          <Input label="City" value={f.city} onChange={(e) => set({ city: e.target.value })} />
          <Input label="Minimum audience" inputMode="numeric" value={f.minAudience} onChange={(e) => set({ minAudience: e.target.value.replace(/\D/g, '') })} />
        </div>
      </Card>
      {q.isLoading ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No creators match" description="Try removing a filter to widen your search." />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <li key={c.id}>
                <Card className="h-full">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.displayName} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy-800">{c.displayName}</p>
                      <p className="flex items-center gap-1 text-xs text-slate"><MapPin className="h-3 w-3" aria-hidden />{[c.city, c.country].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                  {c.bio && <p className="mt-3 line-clamp-3 text-sm text-slate">{c.bio}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">{c.niches.slice(0, 4).map((n) => <Badge key={n}>{n}</Badge>)}</div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-slate">Audience</dt><dd className="font-medium text-navy-800">{c.audienceSize != null ? formatNumber(c.audienceSize) : '—'}</dd></div>
                    <div><dt className="text-xs text-slate">Engagement</dt><dd className="font-medium text-navy-800">{c.engagementRate != null ? formatPercent(Number(c.engagementRate)) : '—'}</dd></div>
                  </dl>
                  {(c.portfolioUrl || c.mediaKitUrl) && (
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      {c.portfolioUrl && <a href={c.portfolioUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium text-navy-600 hover:underline">Portfolio <ExternalLink className="h-3.5 w-3.5" /></a>}
                      {c.mediaKitUrl && <a href={c.mediaKitUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium text-navy-600 hover:underline">Media kit <ExternalLink className="h-3.5 w-3.5" /></a>}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
          {meta && meta.pages > 1 && (
            <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
              <Button variant="secondary" size="sm" disabled={f.page <= 1} onClick={() => setF((p) => ({ ...p, page: p.page - 1 }))}>Previous</Button>
              <span className="text-sm text-slate">Page {meta.page} of {meta.pages} · {meta.total} creators</span>
              <Button variant="secondary" size="sm" disabled={f.page >= meta.pages} onClick={() => setF((p) => ({ ...p, page: p.page + 1 }))}>Next</Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
