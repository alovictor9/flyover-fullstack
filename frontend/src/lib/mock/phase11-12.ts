/* Mock routes for Phase 11 and 12 (coupons, creators, deliverables, programmes, integrations, team, CRM, analytics).
 * Kept in its own store so the original mock data model stays untouched. State persists in localStorage. */
import type * as T from '../types';
import type { DB } from './seed';

type Ctx = { method: string; path: string; query: URLSearchParams; body: Record<string, any>; userId: string | null; params: Record<string, string> };
type Res = { status: number; json: unknown };
export interface MockDeps {
  route: (method: string, path: string, auth: T.Role[] | 'any' | undefined, h: (c: Ctx) => Res) => void;
  ok: (data: unknown, status?: number, meta?: unknown) => Res;
  HttpErr: new (status: number, message: string, code?: string) => Error;
  need: (cond: unknown, field: string, msg: string) => void;
  db: () => DB;
  id: () => string;
  now: () => string;
  aff: (c: Ctx) => T.AffiliateProfile;
  biz: (c: Ctx) => T.BusinessProfile;
}

const KEY = 'flyover.mockdb.p1112.v1';
const ago = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
const ahead = (d: number) => new Date(Date.now() + d * 864e5).toISOString();

interface Store {
  prefs: any[]; coupons: any[]; creators: any[]; deliverables: any[]; creatorPayments: any[]; programs: any[]; memberships: any[];
  integrations: any[]; apiKeys: any[]; events: any[]; members: any[]; crm: any[];
}

function seed2(): Store {
  return {
    prefs: [],
    coupons: [{ id: 'cp1', campaignId: 'k1', affiliateId: 'a1', code: 'ADA10', discountType: 'PERCENTAGE', discountValue: '10.00', maxRedemptions: 100, startsAt: null, expiresAt: ahead(60), isActive: true, createdAt: ago(5) }],
    creators: [
      { id: 'cr_a1', affiliateId: 'a1', displayName: 'Ada Okafor', bio: 'Tech and lifestyle creator. Weekly YouTube reviews and Instagram reels.', niches: ['Electronics', 'Lifestyle'], country: 'Nigeria', city: 'Lagos', languages: ['English', 'Yoruba'], portfolioUrl: 'https://ada.example.com', mediaKitUrl: null, socialProfiles: null, audienceSize: 40000, engagementRate: '4.20', status: 'ACTIVE', updatedAt: ago(4) },
      { id: 'cr_a3', affiliateId: 'a3', displayName: 'Zainab Musa', bio: 'TikTok beauty and fashion creator.', niches: ['Beauty', 'Fashion'], country: 'Nigeria', city: 'Abuja', languages: ['English', 'Hausa'], portfolioUrl: null, mediaKitUrl: 'https://zainab.example.com/media-kit', socialProfiles: null, audienceSize: 85000, engagementRate: '6.10', status: 'ACTIVE', updatedAt: ago(2) },
    ],
    deliverables: [{ id: 'dv1', campaignId: 'k7', affiliateId: 'a1', title: 'Smartwatch unboxing: first cut', description: 'Rough cut, final colour grade to follow.', assetUrl: 'https://example.com/ada-unboxing', contentType: 'YouTube video', status: 'SUBMITTED', version: 1, reviewNotes: null, submittedAt: ago(1), reviewedAt: null }],
    creatorPayments: [{ id: 'cpay1', campaignId: 'k7', affiliateId: 'a1', amount: '50000.00', currency: 'NGN', status: 'PENDING', paymentReference: null, paymentProvider: null, adminNote: null, paidAt: null, createdAt: ago(1) }],
    programs: [{ id: 'pg1', businessId: 'b1', name: 'SmartTech Partners', slug: 'smarttech-partners', description: 'Our partner programme for creators and resellers.', status: 'ACTIVE', requiresApproval: true, landingPageTitle: 'Partner with SmartTech Gadgets', landingPageDescription: 'Earn more promoting Nigeria’s favourite gadget store.', brandColor: '#0F766E', customFields: [{ key: 'main_channel_1', label: 'Main channel', required: true, type: 'TEXT' }, { key: 'audience_2', label: 'Audience size', required: false, type: 'NUMBER' }], createdAt: ago(14) }],
    memberships: [
      { id: 'pm1', programId: 'pg1', affiliateId: 'a2', status: 'PENDING', source: 'PUBLIC_PAGE', answers: { main_channel_1: 'Finance newsletter', audience_2: 12000 }, appliedAt: ago(2), reviewedAt: null },
      { id: 'pm2', programId: 'pg1', affiliateId: 'a3', status: 'APPROVED', source: 'PUBLIC_PAGE', answers: { main_channel_1: 'TikTok', audience_2: 85000 }, appliedAt: ago(9), reviewedAt: ago(8) },
    ],
    integrations: [{ id: 'ig1', businessId: 'b1', name: 'Main store payments', kind: 'PAYMENT', provider: 'GENERIC_HMAC', status: 'ACTIVE', publicKey: 'fpk_demo_3b7c91', campaignId: 'k1', allowedDomains: [], lastEventAt: ago(1), createdAt: ago(10) }],
    apiKeys: [{ id: 'ak1', integrationId: 'ig1', name: 'Production server', keyPrefix: 'fk_live_9d2a', scopes: ['conversions:write'], expiresAt: null, lastUsedAt: ago(1), revokedAt: null, createdAt: ago(9) }],
    events: [
      { id: 'ev1', integrationId: 'ig1', externalEventId: 'evt_10311', eventType: 'payment.succeeded', authMethod: 'WEBHOOK_HMAC', signatureVerified: true, status: 'PROCESSED', attempts: 1, lastError: null, processedAt: ago(1), createdAt: ago(1) },
      { id: 'ev2', integrationId: 'ig1', externalEventId: 'evt_10312', eventType: 'payment.succeeded', authMethod: 'WEBHOOK_HMAC', signatureVerified: true, status: 'FAILED', attempts: 2, lastError: 'No matching referral found for this order.', processedAt: null, createdAt: ago(0.5) },
      { id: 'ev3', integrationId: 'ig1', externalEventId: 'evt_10313', eventType: 'customer.created', authMethod: 'WEBHOOK_HMAC', signatureVerified: true, status: 'IGNORED', attempts: 1, lastError: null, processedAt: ago(0.4), createdAt: ago(0.4) },
    ],
    members: [
      { id: 'tm1', businessId: 'b1', userId: 'u_biz2', role: 'MANAGER', isActive: true, createdAt: ago(8) },
      { id: 'tm2', businessId: 'b1', userId: 'u_biz3', role: 'ANALYST', isActive: true, createdAt: ago(6) },
    ],
    crm: [
      { id: 'crm1', businessId: 'b1', affiliateId: 'a1', stage: 'PARTNER', tags: ['tech', 'instagram'], notes: 'Top performer. Prefers early access to new products.', lastContactAt: ago(3), updatedAt: ago(3) },
      { id: 'crm2', businessId: 'b1', affiliateId: 'a2', stage: 'CONTACTED', tags: ['newsletter'], notes: null, lastContactAt: ago(7), updatedAt: ago(7) },
    ],
  };
}

export function registerPhase1112(d: MockDeps) {
  let s: Store | undefined;
  const store = (): Store => {
    if (s) return s;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
      s = raw ? (JSON.parse(raw) as Store) : seed2();
    } catch {
      s = seed2();
    }
    return s;
  };
  const save2 = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  };
  const route: MockDeps['route'] = (m, p, a, h) => d.route(m, p, a, (c) => { const r = h(c); save2(); return r; });
  const { ok, HttpErr, need, id, now } = d;
  const userOfAff = (affiliateId: string) => {
    const a = d.db().affiliates.find((x) => x.id === affiliateId);
    return d.db().users.find((u) => u.id === a?.userId);
  };
  const upub = (affiliateId: string) => { const u = userOfAff(affiliateId); return { id: u?.id ?? '', fullName: u?.fullName ?? 'Affiliate', email: u?.email ?? '' }; };
  const ownCampaign = (c: Ctx, campaignId: string) => {
    const camp = d.db().campaigns.find((x) => x.id === campaignId && x.businessId === d.biz(c).id);
    if (!camp) throw new HttpErr(404, 'Campaign not found');
    return camp;
  };
  const approvedFor = (campaignId: string, affiliateId: string) => d.db().applications.some((a) => a.campaignId === campaignId && a.affiliateId === affiliateId && a.status === 'APPROVED');
  const notifyUser = (userId: string | undefined, type: T.NotificationType, title: string, message: string) => {
    if (userId) d.db().notifications.unshift({ id: id(), userId, type, title, message, readAt: null, createdAt: now() });
  };
  const bizUserId = (businessId: string) => d.db().businesses.find((b) => b.id === businessId)?.userId;
  const page = (c: Ctx) => ({ page: Math.max(1, Number(c.query.get('page') ?? 1)), limit: Math.min(100, Math.max(1, Number(c.query.get('limit') ?? 20))) });

  // ---------- notification preferences ----------
  const prefsOf = (userId: string) => {
    let p = store().prefs.find((x) => x.userId === userId);
    if (!p) store().prefs.push((p = { id: id(), userId, inAppEnabled: true, emailEnabled: false, mutedTypes: [] }));
    return p;
  };
  route('GET', '/notifications/preferences', 'any', (c) => ok(prefsOf(c.userId!)));
  route('PATCH', '/notifications/preferences', 'any', (c) => {
    const p = prefsOf(c.userId!);
    for (const k of ['inAppEnabled', 'emailEnabled', 'mutedTypes']) if (k in c.body) p[k] = c.body[k];
    return ok(p);
  });

  // ---------- coupons ----------
  route('GET', '/affiliates/coupons', ['AFFILIATE'], (c) => {
    const ap = d.aff(c);
    return ok(store().coupons.filter((x) => x.affiliateId === ap.id).map((x) => {
      const camp = d.db().campaigns.find((k) => k.id === x.campaignId)!;
      const b = d.db().businesses.find((k) => k.id === camp.businessId);
      return { ...x, campaign: { id: camp.id, name: camp.name, currency: camp.currency, status: camp.status, business: { name: b?.name ?? '' } } };
    }));
  });
  route('GET', '/campaigns/:id/coupons', ['BUSINESS'], (c) => {
    ownCampaign(c, c.params.id!);
    return ok(store().coupons.filter((x) => x.campaignId === c.params.id).map((x) => ({ ...x, affiliate: { id: x.affiliateId, user: upub(x.affiliateId) } })));
  });
  route('POST', '/campaigns/:id/coupons', ['BUSINESS'], (c) => {
    const camp = ownCampaign(c, c.params.id!);
    const b = c.body;
    need(/^[a-zA-Z0-9_-]{3,40}$/.test(b.code ?? ''), 'code', 'Invalid code');
    need(['PERCENTAGE', 'FIXED_AMOUNT'].includes(b.discountType), 'discountType', 'Invalid type');
    need(Number(b.discountValue) > 0, 'discountValue', 'Must be positive');
    if (b.discountType === 'PERCENTAGE') need(Number(b.discountValue) <= 100, 'discountValue', 'Cannot exceed 100');
    if (camp.status !== 'APPROVED') throw new HttpErr(409, 'Coupons can only be issued on approved campaigns');
    if (camp.compensationModel === 'FIXED_FEE') throw new HttpErr(409, 'Fixed-fee campaigns do not support coupons');
    if (!approvedFor(camp.id, b.affiliateId)) throw new HttpErr(403, 'Affiliate is not approved for this campaign');
    const code = String(b.code).toUpperCase();
    if (store().coupons.some((x) => x.code === code)) throw new HttpErr(409, 'A record with this value already exists', 'CONFLICT');
    const row = { id: id(), campaignId: camp.id, affiliateId: b.affiliateId, code, discountType: b.discountType, discountValue: Number(b.discountValue).toFixed(2), maxRedemptions: b.maxRedemptions ?? null, startsAt: b.startsAt ?? null, expiresAt: b.expiresAt ?? null, isActive: true, createdAt: now() };
    store().coupons.push(row);
    notifyUser(userOfAff(b.affiliateId)?.id, 'GENERAL', 'New coupon', `You received coupon ${code} for ${camp.name}.`);
    return ok(row, 201);
  });
  route('PATCH', '/coupons/:id', ['BUSINESS'], (c) => {
    const row = store().coupons.find((x) => x.id === c.params.id);
    if (!row) throw new HttpErr(404, 'Coupon not found');
    ownCampaign(c, row.campaignId);
    for (const k of ['isActive', 'maxRedemptions', 'startsAt', 'expiresAt']) if (k in c.body) row[k] = c.body[k];
    return ok(row);
  });

  // ---------- creators ----------
  route('GET', '/creators/me', ['AFFILIATE'], (c) => ok(store().creators.find((x) => x.affiliateId === d.aff(c).id) ?? null));
  route('PUT', '/creators/me', ['AFFILIATE'], (c) => {
    const ap = d.aff(c);
    const b = c.body;
    need(String(b.displayName ?? '').trim().length >= 2, 'displayName', 'Too short');
    need(Array.isArray(b.niches), 'niches', 'Invalid');
    let row = store().creators.find((x) => x.affiliateId === ap.id);
    if (!row) store().creators.push((row = { id: id(), affiliateId: ap.id, socialProfiles: null }));
    Object.assign(row, { displayName: b.displayName, bio: b.bio ?? null, niches: b.niches, country: b.country ?? 'Nigeria', city: b.city ?? null, languages: b.languages ?? [], portfolioUrl: b.portfolioUrl ?? null, mediaKitUrl: b.mediaKitUrl ?? null, audienceSize: b.audienceSize ?? null, engagementRate: b.engagementRate != null ? Number(b.engagementRate).toFixed(2) : null, status: b.status ?? 'ACTIVE', updatedAt: now() });
    return ok(row);
  });
  route('GET', '/creators', ['BUSINESS', 'ADMIN'], (c) => {
    const q = c.query;
    const minA = q.get('minAudience') ? Number(q.get('minAudience')) : null;
    const list = store().creators.filter((x) => x.status === 'ACTIVE'
      && (!q.get('niche') || x.niches.includes(q.get('niche')))
      && (!q.get('country') || x.country === q.get('country'))
      && (!q.get('city') || (x.city ?? '').toLowerCase().includes(q.get('city')!.toLowerCase()))
      && (minA === null || (x.audienceSize ?? 0) >= minA));
    const { page: p, limit } = page(c);
    return ok(list.slice((p - 1) * limit, p * limit).map((x) => ({ ...x, affiliate: { id: x.affiliateId, user: upub(x.affiliateId) } })), 200, { page: p, limit, total: list.length, pages: Math.ceil(list.length / limit) });
  });

  // ---------- creator deliverables and payments ----------
  const paymentFor = (campaignId: string, affiliateId: string) => store().creatorPayments.find((x) => x.campaignId === campaignId && x.affiliateId === affiliateId);
  route('GET', '/creator-campaigns/:id/deliverables', ['AFFILIATE'], (c) => ok(store().deliverables.filter((x) => x.campaignId === c.params.id && x.affiliateId === d.aff(c).id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))));
  route('POST', '/creator-campaigns/:id/deliverables', ['AFFILIATE'], (c) => {
    const ap = d.aff(c);
    const camp = d.db().campaigns.find((x) => x.id === c.params.id && x.status === 'APPROVED');
    if (!camp || camp.compensationModel === 'PERFORMANCE' || !camp.compensationModel) throw new HttpErr(404, 'Creator campaign not found');
    if (!approvedFor(camp.id, ap.id)) throw new HttpErr(403, 'Join this campaign before submitting deliverables');
    need(String(c.body.title ?? '').trim().length >= 2, 'title', 'Too short');
    need(/^https?:\/\/\S+\.\S+/.test(c.body.assetUrl ?? ''), 'assetUrl', 'Invalid URL');
    const row = { id: id(), campaignId: camp.id, affiliateId: ap.id, title: c.body.title, description: c.body.description ?? null, assetUrl: c.body.assetUrl, contentType: c.body.contentType ?? null, status: 'SUBMITTED', version: 1, reviewNotes: null, submittedAt: now(), reviewedAt: null };
    store().deliverables.push(row);
    if (!paymentFor(camp.id, ap.id)) store().creatorPayments.push({ id: id(), campaignId: camp.id, affiliateId: ap.id, amount: camp.fixedFeeAmount ?? '0.00', currency: camp.currency, status: 'PENDING', paymentReference: null, paymentProvider: null, adminNote: null, paidAt: null, createdAt: now() });
    notifyUser(bizUserId(camp.businessId), 'CAMPAIGN', 'New deliverable', `${upub(ap.id).fullName} submitted "${row.title}" for ${camp.name}.`);
    return ok(row, 201);
  });
  route('PATCH', '/creator-campaigns/:id/deliverables/:did', ['AFFILIATE'], (c) => {
    const row = store().deliverables.find((x) => x.id === c.params.did && x.campaignId === c.params.id && x.affiliateId === d.aff(c).id);
    if (!row) throw new HttpErr(404, 'Deliverable not found');
    if (row.status !== 'REVISION_REQUESTED') throw new HttpErr(409, 'Only deliverables with requested changes can be resubmitted');
    for (const k of ['title', 'description', 'assetUrl', 'contentType']) if (k in c.body) row[k] = c.body[k];
    Object.assign(row, { status: 'SUBMITTED', version: row.version + 1, submittedAt: now(), reviewedAt: null });
    return ok(row);
  });
  route('GET', '/affiliates/creator-payments', ['AFFILIATE'], (c) => ok(store().creatorPayments.filter((x) => x.affiliateId === d.aff(c).id).map((x) => {
    const camp = d.db().campaigns.find((k) => k.id === x.campaignId)!;
    return { ...x, campaign: { id: camp.id, name: camp.name, business: { name: d.db().businesses.find((b) => b.id === camp.businessId)?.name ?? '' } } };
  })));
  route('GET', '/businesses/campaigns/:id/deliverables', ['BUSINESS'], (c) => {
    ownCampaign(c, c.params.id!);
    return ok(store().deliverables.filter((x) => x.campaignId === c.params.id).map((x) => ({ ...x, affiliate: { id: x.affiliateId, user: upub(x.affiliateId) } })));
  });
  route('PATCH', '/businesses/deliverables/:id/review', ['BUSINESS'], (c) => {
    const row = store().deliverables.find((x) => x.id === c.params.id);
    if (!row) throw new HttpErr(404, 'Deliverable not found');
    const camp = ownCampaign(c, row.campaignId);
    const allowed: Record<string, string[]> = { SUBMITTED: ['IN_REVIEW', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED'], IN_REVIEW: ['APPROVED', 'REVISION_REQUESTED', 'REJECTED'], REVISION_REQUESTED: ['IN_REVIEW', 'APPROVED', 'REJECTED'] };
    if (!allowed[row.status]?.includes(c.body.decision)) throw new HttpErr(409, 'This deliverable cannot move to that status');
    Object.assign(row, { status: c.body.decision, reviewNotes: c.body.reviewNotes ?? null, reviewedAt: now() });
    if (row.status === 'APPROVED') {
      const approved = store().deliverables.filter((x) => x.campaignId === row.campaignId && x.affiliateId === row.affiliateId && x.status === 'APPROVED').length;
      const pay = paymentFor(row.campaignId, row.affiliateId);
      if (pay && pay.status === 'PENDING' && approved >= (camp.requiredDeliverables ?? 1)) pay.status = 'APPROVED';
    }
    notifyUser(userOfAff(row.affiliateId)?.id, 'CAMPAIGN', 'Deliverable update', `"${row.title}" is now ${String(row.status).toLowerCase().replace('_', ' ')}.`);
    return ok(row);
  });
  route('GET', '/businesses/campaigns/:id/creator-payments', ['BUSINESS'], (c) => {
    ownCampaign(c, c.params.id!);
    return ok(store().creatorPayments.filter((x) => x.campaignId === c.params.id).map((x) => ({ ...x, affiliate: { user: upub(x.affiliateId) } })));
  });
  route('PATCH', '/businesses/creator-payments/:id', ['BUSINESS'], (c) => {
    const row = store().creatorPayments.find((x) => x.id === c.params.id);
    if (!row) throw new HttpErr(404, 'Creator payment not found');
    ownCampaign(c, row.campaignId);
    const next: Record<string, string[]> = { APPROVED: ['PROCESSING', 'PAID', 'FAILED'], PROCESSING: ['PAID', 'FAILED'], FAILED: ['PROCESSING'] };
    if (!next[row.status]?.includes(c.body.decision)) throw new HttpErr(409, 'Payment cannot move to that status');
    if (c.body.decision === 'PAID') need(String(c.body.paymentReference ?? '').trim(), 'paymentReference', 'Required when marking as paid');
    Object.assign(row, { status: c.body.decision, paymentReference: c.body.paymentReference ?? row.paymentReference, paymentProvider: c.body.paymentProvider ?? row.paymentProvider, adminNote: c.body.adminNote ?? row.adminNote, paidAt: c.body.decision === 'PAID' ? now() : row.paidAt });
    return ok(row);
  });

  // ---------- programmes ----------
  const myPrograms = (c: Ctx) => store().programs.filter((x) => x.businessId === d.biz(c).id);
  const ownProgram = (c: Ctx, pid: string) => { const p = myPrograms(c).find((x) => x.id === pid); if (!p) throw new HttpErr(404, 'Programme not found'); return p; };
  route('GET', '/businesses/programs', ['BUSINESS'], (c) => ok(myPrograms(c).map((p) => ({ ...p, _count: { memberships: store().memberships.filter((m) => m.programId === p.id).length, campaigns: d.db().campaigns.filter((k) => k.programId === p.id).length } }))));
  route('POST', '/businesses/programs', ['BUSINESS'], (c) => {
    const b = c.body;
    need(String(b.name ?? '').trim().length >= 3, 'name', 'Too short');
    need(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug ?? '') && b.slug.length >= 3, 'slug', 'Invalid address');
    if (store().programs.some((x) => x.slug === b.slug)) throw new HttpErr(409, 'A record with this value already exists', 'CONFLICT');
    const row = { id: id(), businessId: d.biz(c).id, name: b.name, slug: b.slug, description: b.description ?? null, status: 'DRAFT', requiresApproval: b.requiresApproval ?? true, landingPageTitle: b.landingPageTitle ?? null, landingPageDescription: b.landingPageDescription ?? null, brandColor: b.brandColor ?? null, customFields: b.customFields ?? [], createdAt: now() };
    store().programs.unshift(row);
    return ok(row, 201);
  });
  route('PATCH', '/businesses/programs/:id', ['BUSINESS'], (c) => {
    const p = ownProgram(c, c.params.id!);
    for (const k of ['status', 'requiresApproval', 'name', 'description']) if (k in c.body) p[k] = c.body[k];
    return ok(p);
  });
  route('GET', '/businesses/programs/:id/members', ['BUSINESS'], (c) => {
    ownProgram(c, c.params.id!);
    return ok(store().memberships.filter((m) => m.programId === c.params.id).map((m) => ({ ...m, affiliate: { id: m.affiliateId, user: upub(m.affiliateId) } })));
  });
  route('PATCH', '/businesses/program-memberships/:id', ['BUSINESS'], (c) => {
    const m = store().memberships.find((x) => x.id === c.params.id);
    if (!m) throw new HttpErr(404, 'Membership not found');
    ownProgram(c, m.programId);
    need(['APPROVED', 'REJECTED', 'SUSPENDED'].includes(c.body.decision), 'decision', 'Invalid');
    Object.assign(m, { status: c.body.decision, reviewedAt: now() });
    return ok(m);
  });
  const publicProgram = (slug: string) => {
    const p = store().programs.find((x) => x.slug === slug && x.status === 'ACTIVE');
    if (!p) throw new HttpErr(404, 'Programme not found');
    return p;
  };
  route('GET', '/programs/:slug', undefined, (c) => {
    const p = publicProgram(c.params.slug!);
    const b = d.db().businesses.find((x) => x.id === p.businessId)!;
    const { businessId: _b, status: _s, createdAt: _c, ...pub } = p;
    return ok({ ...pub, business: { name: b.name, country: b.country, website: b.website ?? null } });
  });
  const joinProgram = (p: any, affiliateId: string, answers: Record<string, unknown>, source: string) => {
    for (const f of p.customFields ?? []) need(!f.required || (answers ?? {})[f.key] !== undefined, `answers.${f.key}`, 'Required');
    let m = store().memberships.find((x) => x.programId === p.id && x.affiliateId === affiliateId);
    if (!m) store().memberships.push((m = { id: id(), programId: p.id, affiliateId, status: 'PENDING', source, answers: answers ?? {}, appliedAt: now(), reviewedAt: null }));
    if (m.status !== 'SUSPENDED' && m.status !== 'REJECTED') m.status = p.requiresApproval ? m.status : 'APPROVED';
    return m;
  };
  route('POST', '/programs/:slug/register', undefined, (c) => {
    const p = publicProgram(c.params.slug!);
    const b = c.body;
    need(String(b.fullName ?? '').length >= 2, 'fullName', 'Too short');
    need(/.+@.+\..+/.test(b.email ?? ''), 'email', 'Invalid email');
    need(String(b.password ?? '').length >= 10, 'password', 'Too short');
    const email = String(b.email).toLowerCase();
    if (d.db().users.some((u) => u.email === email)) throw new HttpErr(409, 'A record with this value already exists', 'CONFLICT');
    const u = { id: id(), fullName: b.fullName, email, phone: b.phone ?? null, password: b.password, role: 'AFFILIATE' as T.Role, isActive: true, createdAt: now() };
    d.db().users.push(u);
    const ap = { id: id(), userId: u.id, bio: null, website: null, socialLinks: null, promotionalChannels: [], interests: [], audienceSize: null, country: 'Nigeria', createdAt: now(), updatedAt: now() } as unknown as T.AffiliateProfile;
    d.db().affiliates.push(ap);
    const m = joinProgram(p, ap.id, b.answers ?? {}, 'PROGRAM_REGISTRATION');
    return ok({ user: { id: u.id, fullName: u.fullName, email: u.email }, membershipStatus: m.status }, 201);
  });
  route('POST', '/programs/:slug/apply', ['AFFILIATE'], (c) => ok(joinProgram(publicProgram(c.params.slug!), d.aff(c).id, c.body.answers ?? {}, 'EXISTING_AFFILIATE'), 201));
  route('GET', '/programs/:slug/campaigns', ['AFFILIATE'], (c) => {
    const p = publicProgram(c.params.slug!);
    if (!store().memberships.some((m) => m.programId === p.id && m.affiliateId === d.aff(c).id && m.status === 'APPROVED')) throw new HttpErr(403, 'You are not an approved member of this programme');
    return ok(d.db().campaigns.filter((k) => k.programId === p.id && k.status === 'APPROVED'));
  });

  // ---------- integrations ----------
  const myIntegration = (c: Ctx, iid: string) => { const i = store().integrations.find((x) => x.id === iid && x.businessId === d.biz(c).id); if (!i) throw new HttpErr(404, 'Integration not found'); return i; };
  const rand = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const withCounts = (i: any) => ({ ...i, _count: { webhookEvents: store().events.filter((e) => e.integrationId === i.id).length, apiKeys: store().apiKeys.filter((k) => k.integrationId === i.id).length } });
  route('GET', '/businesses/integrations', ['BUSINESS'], (c) => ok(store().integrations.filter((i) => i.businessId === d.biz(c).id).map(withCounts)));
  route('POST', '/businesses/integrations', ['BUSINESS'], (c) => {
    const b = c.body;
    need(String(b.name ?? '').trim().length >= 2, 'name', 'Too short');
    need(['PAYMENT', 'ECOMMERCE', 'TRACKING', 'CONVERSION_REPORTING'].includes(b.kind), 'kind', 'Invalid');
    if (b.kind === 'TRACKING') need(b.campaignId, 'campaignId', 'Required for tracking');
    else need(String(b.webhookSecret ?? '').length >= 16, 'webhookSecret', 'Too short');
    const bp = d.biz(c);
    if (bp.status !== 'APPROVED') throw new HttpErr(403, 'Business must be approved');
    const row = { id: id(), businessId: bp.id, name: b.name, kind: b.kind, provider: b.provider ?? 'GENERIC_HMAC', status: 'ACTIVE', publicKey: `fpk_${rand(14)}`, campaignId: b.campaignId ?? null, allowedDomains: b.allowedDomains ?? [], lastEventAt: null, createdAt: now() };
    store().integrations.unshift(row);
    const endpoint = `https://api.mock.flyover.test/api/v1/tracking/${row.publicKey}`;
    return ok({ id: row.id, name: row.name, kind: row.kind, provider: row.provider, status: row.status, publicKey: row.publicKey, webhookUrl: `https://api.mock.flyover.test/webhooks/${row.id}`, trackingEndpoint: endpoint, ...(row.kind === 'TRACKING' ? { trackingSnippet: `<script async src="${endpoint}.js"></script>` } : {}) }, 201);
  });
  route('PATCH', '/businesses/integrations/:id/status', ['BUSINESS'], (c) => {
    const i = myIntegration(c, c.params.id!);
    need(['ACTIVE', 'PAUSED', 'REVOKED'].includes(c.body.status), 'status', 'Invalid');
    if (i.status === 'REVOKED') throw new HttpErr(409, 'A revoked integration cannot be changed');
    i.status = c.body.status;
    if (i.status === 'REVOKED') store().apiKeys.filter((k) => k.integrationId === i.id && !k.revokedAt).forEach((k) => (k.revokedAt = now()));
    return ok({ id: i.id, status: i.status });
  });
  route('PATCH', '/businesses/integrations/:id/credentials', ['BUSINESS'], (c) => {
    const i = myIntegration(c, c.params.id!);
    need(String(c.body.webhookSecret ?? '').length >= 16, 'webhookSecret', 'Too short');
    return ok({ id: i.id, credentialsUpdated: true });
  });
  route('GET', '/businesses/integrations/:id/api-keys', ['BUSINESS'], (c) => { myIntegration(c, c.params.id!); return ok(store().apiKeys.filter((k) => k.integrationId === c.params.id)); });
  route('POST', '/businesses/integrations/:id/api-keys', ['BUSINESS'], (c) => {
    const i = myIntegration(c, c.params.id!);
    if (i.status !== 'ACTIVE') throw new HttpErr(409, 'Integration must be active');
    need(String(c.body.name ?? '').trim().length >= 2, 'name', 'Too short');
    const key = `fk_live_${rand(40)}`;
    const row = { id: id(), integrationId: i.id, name: c.body.name, keyPrefix: key.slice(0, 12), scopes: c.body.scopes ?? ['conversions:write'], expiresAt: c.body.expiresAt ?? null, lastUsedAt: null, revokedAt: null, createdAt: now() };
    store().apiKeys.push(row);
    return ok({ id: row.id, name: row.name, key, keyPrefix: row.keyPrefix, scopes: row.scopes, expiresAt: row.expiresAt }, 201);
  });
  route('DELETE', '/businesses/integrations/:id/api-keys/:keyId', ['BUSINESS'], (c) => {
    myIntegration(c, c.params.id!);
    const k = store().apiKeys.find((x) => x.id === c.params.keyId && x.integrationId === c.params.id);
    if (!k) throw new HttpErr(404, 'API key not found');
    k.revokedAt = k.revokedAt ?? now();
    return ok({ id: k.id, revokedAt: k.revokedAt });
  });
  route('GET', '/businesses/integrations/:id/events', ['BUSINESS'], (c) => { myIntegration(c, c.params.id!); return ok(store().events.filter((e) => e.integrationId === c.params.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100)); });
  route('POST', '/businesses/integrations/:id/events/:eventId/retry', ['BUSINESS'], (c) => {
    const i = myIntegration(c, c.params.id!);
    const e = store().events.find((x) => x.id === c.params.eventId && x.integrationId === i.id);
    if (!e) throw new HttpErr(404, 'Event not found');
    if (e.status !== 'FAILED') throw new HttpErr(409, 'Only failed events can be retried');
    Object.assign(e, { status: 'PROCESSED', attempts: e.attempts + 1, lastError: null, processedAt: now() });
    return ok({ conversionId: id() });
  });

  // ---------- team ----------
  route('GET', '/businesses/members', ['BUSINESS'], (c) => {
    const bp = d.biz(c);
    const owner = d.db().users.find((u) => u.id === bp.userId)!;
    return ok([
      { id: null, role: 'OWNER', isActive: true, isOwner: true, user: { id: owner.id, fullName: owner.fullName, email: owner.email, isActive: true } },
      ...store().members.filter((m) => m.businessId === bp.id).map((m) => { const u = d.db().users.find((x) => x.id === m.userId)!; return { ...m, isOwner: false, user: { id: u.id, fullName: u.fullName, email: u.email, isActive: u.isActive } }; }),
    ]);
  });
  route('POST', '/businesses/members', ['BUSINESS'], (c) => {
    const bp = d.biz(c);
    need(/.+@.+\..+/.test(c.body.email ?? ''), 'email', 'Invalid email');
    need(['ADMIN', 'MANAGER', 'ANALYST'].includes(c.body.role), 'role', 'Invalid role');
    const u = d.db().users.find((x) => x.email === String(c.body.email).toLowerCase() && x.role === 'BUSINESS' && x.isActive);
    if (!u) throw new HttpErr(404, 'Active business user not found');
    if (u.id === bp.userId) throw new HttpErr(409, 'Business owner is already a member');
    let m = store().members.find((x) => x.businessId === bp.id && x.userId === u.id);
    if (!m) store().members.push((m = { id: id(), businessId: bp.id, userId: u.id, createdAt: now() }));
    Object.assign(m, { role: c.body.role, isActive: true });
    return ok(m, 201);
  });
  route('PATCH', '/businesses/members/:id', ['BUSINESS'], (c) => {
    const m = store().members.find((x) => x.id === c.params.id && x.businessId === d.biz(c).id);
    if (!m) throw new HttpErr(404, 'Business member not found');
    for (const k of ['role', 'isActive']) if (k in c.body) m[k] = c.body[k];
    return ok(m);
  });

  // ---------- affiliate CRM ----------
  const crmView = (r: any) => ({ ...r, affiliate: { id: r.affiliateId, user: upub(r.affiliateId), creatorProfile: store().creators.find((x) => x.affiliateId === r.affiliateId) ?? null } });
  route('GET', '/businesses/crm/affiliates', ['BUSINESS'], (c) => {
    const bp = d.biz(c);
    const q = c.query;
    const search = q.get('search')?.toLowerCase();
    const list = store().crm.filter((r) => r.businessId === bp.id && (!q.get('stage') || r.stage === q.get('stage')) && (!search || upub(r.affiliateId).fullName.toLowerCase().includes(search) || upub(r.affiliateId).email.toLowerCase().includes(search))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const { page: p, limit } = page(c);
    return ok(list.slice((p - 1) * limit, p * limit).map(crmView), 200, { page: p, limit, total: list.length, pages: Math.ceil(list.length / limit) });
  });
  route('PUT', '/businesses/crm/affiliates/:affiliateId', ['BUSINESS'], (c) => {
    const bp = d.biz(c);
    if (!d.db().affiliates.some((a) => a.id === c.params.affiliateId)) throw new HttpErr(404, 'Affiliate not found');
    let r = store().crm.find((x) => x.businessId === bp.id && x.affiliateId === c.params.affiliateId);
    if (!r) store().crm.push((r = { id: id(), businessId: bp.id, affiliateId: c.params.affiliateId }));
    Object.assign(r, { stage: c.body.stage ?? 'DISCOVERED', tags: c.body.tags ?? [], notes: c.body.notes ?? null, lastContactAt: c.body.lastContactAt ?? null, updatedAt: now() });
    return ok(r);
  });

  // ---------- advanced business analytics ----------
  route('GET', '/analytics/business/campaigns', ['BUSINESS'], (c) => {
    const bp = d.biz(c);
    const from = c.query.get('from');
    const to = c.query.get('to');
    if (from && to && to <= from) throw new HttpErr(400, 'to must be later than from');
    return ok(d.db().campaigns.filter((k) => k.businessId === bp.id).map((k) => {
      const convs = d.db().conversions.filter((v) => v.campaignId === k.id && (!from || v.createdAt >= from) && (!to || v.createdAt <= to));
      const approved = convs.filter((v) => v.status === 'APPROVED');
      return {
        id: k.id, name: k.name, status: k.status, compensationModel: k.compensationModel ?? 'PERFORMANCE',
        referrals: d.db().referrals.filter((r) => r.campaignId === k.id).length,
        applications: d.db().applications.filter((a) => a.campaignId === k.id).length,
        conversions: convs.length, approvedConversions: approved.length,
        couponAttributedConversions: convs.filter((v) => v.attributionSource === 'COUPON' || v.attributionSource === 'REFERRAL_AND_COUPON').length, automaticallyVerifiedConversions: convs.filter((v) => v.attributionSource === 'WEBHOOK' || v.attributionSource === 'TRACKING_API').length,
        conversionValue: approved.reduce((sum, v) => sum + Number(v.amount), 0),
        commissionCost: d.db().commissions.filter((m) => m.campaignId === k.id).reduce((sum, m) => sum + Number(m.commissionAmount), 0),
      };
    }));
  });
  route('GET', '/analytics/business/affiliates', ['BUSINESS'], (c) => {
    const bp = d.biz(c);
    const camps = d.db().campaigns.filter((k) => k.businessId === bp.id).map((k) => k.id);
    const ids = Array.from(new Set(d.db().applications.filter((a) => camps.includes(a.campaignId) && a.status === 'APPROVED').map((a) => a.affiliateId)));
    return ok(ids.map((affiliateId) => {
      const convs = d.db().conversions.filter((v) => v.affiliateId === affiliateId && camps.includes(v.campaignId));
      const value = convs.filter((v) => v.status === 'APPROVED').reduce((sum, v) => sum + Number(v.amount), 0);
      return { affiliateId, affiliate: upub(affiliateId), campaignCount: new Set(d.db().applications.filter((a) => a.affiliateId === affiliateId && camps.includes(a.campaignId) && a.status === 'APPROVED').map((a) => a.campaignId)).size, conversions: convs.length, approvedConversionValue: value, approvedConversionValueByCurrency: { NGN: value } };
    }));
  });
}
