'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search, Store, SlidersHorizontal, X, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { campaignApi, referralApi } from '@/lib/endpoints';
import { CATEGORIES, COUNTRIES, campaignAction, accessMode } from '@/lib/status';
import type { CampaignAction, CampaignAccess } from '@/lib/types';
import { PageHeader } from '@/components/ui/layout';
import { Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton, Badge } from '@/components/ui/feedback';
import { AccessBadge, CommissionHeadline } from '@/components/campaign/campaign-bits';

const LIMIT = 12;

function Marketplace() {
  const { user } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(sp.get('search') ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const filters = {
    search: sp.get('search') ?? '',
    category: sp.get('category') ?? '',
    country: sp.get('country') ?? '',
    action: (sp.get('action') ?? '') as CampaignAction | '',
    access: (sp.get('access') ?? '') as CampaignAccess | '',
    commission: (sp.get('commission') ?? '') as 'PERCENTAGE' | 'FIXED' | '',
    page: Number(sp.get('page') ?? 1),
  };
  const update = (patch: Partial<Record<keyof typeof filters, string | number>>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) v ? p.set(k, String(v)) : p.delete(k);
    if (!('page' in patch)) p.delete('page');
    router.replace(`/marketplace?${p.toString()}`, { scroll: false });
  };
  // Debounce search box into the URL.
  useEffect(() => {
    const t = setTimeout(() => search !== filters.search && update({ search }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const q = useQuery({
    queryKey: ['marketplace', filters.search, filters.category, filters.country, filters.action, filters.page],
    queryFn: () => campaignApi.marketplace({ search: filters.search || undefined, category: filters.category || undefined, country: filters.country || undefined, action: filters.action || undefined, page: filters.page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const refs = useQuery({ queryKey: ['referrals'], queryFn: referralApi.mine, enabled: user?.role === 'AFFILIATE' });
  const joined = new Set((refs.data ?? []).map((r) => r.campaignId));

  // Access mode and commission structure are filtered client-side on the current page (API doesn't support them yet).
  const items = (q.data?.data ?? []).filter((c) => (!filters.access || c.access === filters.access) && (!filters.commission || c.commissionType === filters.commission));
  const meta = q.data?.meta;
  const activeCount = ['category', 'country', 'action', 'access', 'commission'].filter((k) => filters[k as keyof typeof filters]).length;

  const filterControls = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Select aria-label="Category" value={filters.category} onChange={(e) => update({ category: e.target.value })} placeholder="All categories" options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
      <Select aria-label="Country" value={filters.country} onChange={(e) => update({ country: e.target.value })} placeholder="All countries" options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
      <Select aria-label="Campaign type" value={filters.action} onChange={(e) => update({ action: e.target.value })} placeholder="All payout types" options={(['CPS', 'CPL', 'CPR', 'CPA'] as const).map((a) => ({ value: a, label: campaignAction[a].label }))} />
      <Select aria-label="Commission structure" value={filters.commission} onChange={(e) => update({ commission: e.target.value })} placeholder="Any commission" options={[{ value: 'PERCENTAGE', label: 'Percentage of sale' }, { value: 'FIXED', label: 'Fixed amount' }]} />
      <Select aria-label="Access" value={filters.access} onChange={(e) => update({ access: e.target.value })} placeholder="Any access" options={(['OPEN', 'APPROVAL', 'INVITATION'] as const).map((a) => ({ value: a, label: accessMode[a].label }))} />
    </div>
  );

  return (
    <>
      <PageHeader title="Marketplace" description="Approved campaigns from verified businesses. Join, share your link, earn on verified results." />
      <div className="mb-5 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns, products or brands"
              aria-label="Search campaigns"
              className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-4 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200"
            />
          </div>
          <Button variant="secondary" className="h-11 lg:hidden" onClick={() => setShowFilters((s) => !s)} icon={<SlidersHorizontal className="h-4 w-4" />} aria-expanded={showFilters}>
            Filters{activeCount ? ` (${activeCount})` : ''}
          </Button>
        </div>
        <div className={showFilters ? 'block' : 'hidden lg:block'}>{filterControls}</div>
        {activeCount > 0 && (
          <button onClick={() => update({ category: '', country: '', action: '', access: '', commission: '' })} className="inline-flex items-center gap-1 text-sm font-medium text-brick-500 hover:underline">
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Store className="h-6 w-6" />}
          title={filters.search || activeCount ? 'No campaigns match' : 'No live campaigns yet'}
          description={filters.search || activeCount ? 'Try a different search or remove a filter.' : 'New campaigns appear here as soon as Flyover approves them.'}
          action={(filters.search || activeCount > 0) && <Button variant="secondary" onClick={() => (setSearch(''), router.replace('/marketplace'))}>Reset search</Button>}
        />
      ) : (
        <>
          <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${q.isFetching ? 'opacity-70' : ''}`}>
            {items.map((c) => (
              <li key={c.id}>
                <Link href={`/marketplace/${c.id}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate">
                      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{c.business?.name}</span>
                    </span>
                    {joined.has(c.id) ? (
                      <Badge tone="success">
                        <CheckCircle2 className="h-3 w-3" /> Joined
                      </Badge>
                    ) : (
                      <AccessBadge access={c.access} />
                    )}
                  </div>
                  <h3 className="mt-2 line-clamp-2 font-semibold text-navy-800 group-hover:text-navy-600">{c.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate">{c.description}</p>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                    <CommissionHeadline c={c} />
                    {c.category && <Badge>{c.category}</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {meta && meta.pages > 1 && (
            <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
              <Button variant="secondary" size="sm" disabled={filters.page <= 1} onClick={() => update({ page: filters.page - 1 })}>
                Previous
              </Button>
              <span className="text-sm text-slate">
                Page {meta.page} of {meta.pages} · {meta.total} campaigns
              </span>
              <Button variant="secondary" size="sm" disabled={filters.page >= meta.pages} onClick={() => update({ page: filters.page + 1 })}>
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense>
      <Marketplace />
    </Suspense>
  );
}
