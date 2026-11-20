/* In-browser mock of the Flyover backend (NEXT_PUBLIC_USE_MOCKS=true).
 * It mirrors the real routes, envelopes, status rules and error codes in backend src/routes.ts
 * closely enough to build and demo every screen. State persists in localStorage.
 * It never pretends a real bank payout happened: admin "PAID" only records a reference, like the API. */
import type * as T from '../types';
import { seed, type DB } from './seed';
import { registerPhase1112 } from './phase11-12';

const KEY = 'flyover.mockdb.v2';
let db: DB;
function load(): DB {
  if (db) return db;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
    db = raw ? JSON.parse(raw) : seed();
  } catch {
    db = seed();
  }
  return db;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}
export function resetMockDb() {
  db = seed();
  save();
}

class HttpErr extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_ERROR') {
    super(message);
  }
}
const id = () => 'c' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4);
const now = () => new Date().toISOString();
const n = (v: T.Money | null | undefined) => Number(v ?? 0);
const money = (v: number) => v.toFixed(2);
const ok = (data: unknown, status = 200, meta?: unknown) => ({ status, json: { success: true, data, ...(meta ? { meta } : {}) } });

function walletOf(affiliateId: string) {
  const b = { pending: 0, available: 0, withdrawn: 0, reversed: 0 };
  for (const r of db.walletEntries.filter((e) => e.affiliateId === affiliateId)) {
    const v = n(r.amount);
    switch (r.type) {
      case 'PENDING_CREDIT': b.pending += v; break;
      case 'PENDING_DEBIT': b.pending -= v; break;
      case 'AVAILABLE_CREDIT': b.available += v; break;
      case 'AVAILABLE_DEBIT': b.available -= v; break;
      case 'WITHDRAWAL_RELEASED': b.available += v; break;
      case 'WITHDRAWN': b.withdrawn += v; break;
      case 'REVERSAL': b.reversed += v; break;
    }
  }
  return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Number(v.toFixed(2))])) as unknown as T.WalletBalances;
}
function notify(userId: string, type: T.NotificationType, title: string, message: string) {
  db.notifications.unshift({ id: id(), userId, type, title, message, readAt: null, createdAt: now() });
}
function audit(actorId: string, action: string, entityType: string, entityId: string) {
  db.auditLogs.unshift({ id: id(), actorId, action, entityType, entityId, createdAt: now() });
}
const userPublic = (u: DB['users'][number]) => ({ id: u.id, fullName: u.fullName, email: u.email });

type Ctx = { method: string; path: string; query: URLSearchParams; body: Record<string, any>; userId: string | null; params: Record<string, string> };
type Handler = (c: Ctx) => { status: number; json: unknown };
const routes: { method: string; pattern: RegExp; keys: string[]; auth?: T.Role[] | 'any'; h: Handler }[] = [];
function route(method: string, path: string, auth: T.Role[] | 'any' | undefined, h: Handler) {
  const keys: string[] = [];
  const pattern = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
  routes.push({ method, pattern, keys, auth, h });
}
const me = (c: Ctx) => db.users.find((u) => u.id === c.userId)!;
const aff = (c: Ctx) => {
  const p = db.affiliates.find((a) => a.userId === c.userId);
  if (!p) throw new HttpErr(404, 'Affiliate profile not found');
  return p;
};
const biz = (c: Ctx) => {
  const p = db.businesses.find((b) => b.userId === c.userId);
  if (!p) throw new HttpErr(404, 'Business profile not found');
  return p;
};
function need(cond: unknown, field: string, msg: string) {
  if (!cond) throw Object.assign(new HttpErr(400, 'Invalid request data', 'VALIDATION_ERROR'), { details: { fieldErrors: { [field]: [msg] } } });
}
const withCampaignRels = (c: T.Campaign) => ({
  ...c,
  product: db.products.find((p) => p.id === c.productId) ?? null,
  business: (() => {
    const b = db.businesses.find((x) => x.id === c.businessId)!;
    return { name: b.name, country: b.country, description: b.description };
  })(),
});

// ---------- auth ----------
route('POST', '/auth/register', undefined, (c) => {
  const b = c.body;
  need(b.fullName?.length >= 2, 'fullName', 'Too short');
  need(/.+@.+\..+/.test(b.email ?? ''), 'email', 'Invalid email');
  need(b.password?.length >= 10, 'password', 'Too short');
  need(['AFFILIATE', 'BUSINESS'].includes(b.role), 'role', 'Invalid role');
  const email = String(b.email).toLowerCase();
  if (db.users.some((u) => u.email === email)) throw new HttpErr(409, 'A record with this value already exists', 'CONFLICT');
  const u = { id: id(), fullName: b.fullName, email, phone: b.phone ?? null, password: b.password, role: b.role, isActive: true, createdAt: now() };
  db.users.push(u);
  if (b.role === 'AFFILIATE')
    db.affiliates.push({ id: id(), userId: u.id, bio: null, website: null, socialLinks: null, promotionalChannels: [], interests: [], audienceSize: null, country: 'Nigeria', createdAt: now(), updatedAt: now() });
  else
    db.businesses.push({ id: id(), userId: u.id, name: b.fullName, description: null, website: null, country: 'Nigeria', registrationNumber: null, verificationNotes: null, status: 'PENDING', submittedAt: null, reviewedAt: null, reviewedById: null, createdAt: now(), updatedAt: now() });
  return ok({ user: { id: u.id, fullName: u.fullName, email: u.email, role: u.role, createdAt: u.createdAt } }, 201);
});
route('POST', '/auth/login', undefined, (c) => {
  const u = db.users.find((x) => x.email === String(c.body.email ?? '').toLowerCase());
  if (!u || !u.isActive || u.password !== c.body.password) throw new HttpErr(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  return ok({ user: { id: u.id, fullName: u.fullName, email: u.email, role: u.role }, accessToken: `mock.${u.id}`, refreshToken: `refresh.${u.id}.${id()}${id()}`, tokenType: 'Bearer' });
});
route('POST', '/auth/refresh', undefined, (c) => {
  const uid = String(c.body.refreshToken ?? '').split('.')[1];
  const u = db.users.find((x) => x.id === uid && x.isActive);
  if (!u) throw new HttpErr(401, 'Refresh token invalid or expired');
  return ok({ accessToken: `mock.${u.id}`, refreshToken: `refresh.${u.id}.${id()}${id()}`, tokenType: 'Bearer' });
});
route('POST', '/auth/logout', 'any', () => ok({ message: 'Logged out' }));
route('GET', '/auth/me', 'any', (c) => {
  const u = me(c);
  return ok({
    id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role, isActive: u.isActive, createdAt: u.createdAt,
    affiliate: db.affiliates.find((a) => a.userId === u.id) ?? null,
    business: db.businesses.find((b) => b.userId === u.id) ?? null,
  });
});

// ---------- profiles ----------
route('PATCH', '/affiliates/me', ['AFFILIATE'], (c) => {
  const p = aff(c);
  if (c.body.website) need(/^https?:\/\//.test(c.body.website), 'website', 'Invalid url');
  Object.assign(p, c.body, { updatedAt: now() });
  save();
  return ok(p);
});
route('PATCH', '/businesses/me', ['BUSINESS'], (c) => {
  const p = biz(c);
  if (c.body.website) need(/^https?:\/\//.test(c.body.website), 'website', 'Invalid url');
  Object.assign(p, c.body, { updatedAt: now() });
  save();
  return ok(p);
});
route('POST', '/businesses/verification', ['BUSINESS'], (c) => {
  const p = biz(c);
  need(c.body.registrationNumber?.length >= 2, 'registrationNumber', 'Required');
  if (p.status === 'APPROVED') throw new HttpErr(409, 'Business already approved');
  Object.assign(p, { registrationNumber: c.body.registrationNumber, verificationNotes: c.body.verificationNotes ?? null, status: 'PENDING', submittedAt: now(), reviewedAt: null });
  save();
  return ok(p);
});

// ---------- products ----------
route('POST', '/products', ['BUSINESS'], (c) => {
  const bp = biz(c);
  need(c.body.name?.length >= 2, 'name', 'Too short');
  if (bp.status !== 'APPROVED') throw new HttpErr(403, 'Business must be approved');
  const p: T.Product = { id: id(), businessId: bp.id, name: c.body.name, description: c.body.description ?? null, price: c.body.price != null ? money(c.body.price) : null, currency: c.body.currency ?? 'NGN', category: c.body.category ?? null, imageUrl: c.body.imageUrl ?? null, destinationUrl: c.body.destinationUrl ?? null, isActive: true, createdAt: now(), updatedAt: now() };
  db.products.unshift(p);
  save();
  return ok(p, 201);
});
route('GET', '/products', ['BUSINESS'], (c) => ok(db.products.filter((p) => p.businessId === biz(c).id)));

// ---------- campaigns ----------
route('POST', '/campaigns', ['BUSINESS'], (c) => {
  const b = c.body;
  need(b.name?.length >= 3, 'name', 'Too short');
  need(b.description?.length >= 10, 'description', 'Too short');
  need(b.compensationModel === 'FIXED_FEE' || n(b.commissionValue) > 0, 'commissionValue', 'Must be positive');
  if (b.compensationModel === 'FIXED_FEE' || b.compensationModel === 'HYBRID') need(n(b.fixedFeeAmount) > 0, 'fixedFeeAmount', 'Must be positive');
  if (b.access === 'PRIVATE') need(b.programId, 'programId', 'Choose a programme');
  if (b.commissionType === 'PERCENTAGE' && b.commissionValue > 100) throw new HttpErr(400, 'Percentage commission cannot exceed 100');
  const bp = biz(c);
  if (bp.status !== 'APPROVED') throw new HttpErr(403, 'Business must be approved');
  if (b.productId && !db.products.some((p) => p.id === b.productId && p.businessId === bp.id)) throw new HttpErr(404, 'Product not found for this business');
  const camp: T.Campaign = {
    id: id(), businessId: bp.id, productId: b.productId ?? null, name: b.name, description: b.description, instructions: b.instructions ?? null, category: b.category ?? null,
    country: b.country ?? 'Nigeria', action: b.action ?? 'CPS', compensationModel: b.compensationModel ?? 'PERFORMANCE', commissionType: b.commissionType ?? null, commissionValue: b.commissionValue != null ? money(b.commissionValue) : null, fixedFeeAmount: b.fixedFeeAmount != null ? money(b.fixedFeeAmount) : null, requiredDeliverables: b.requiredDeliverables, programId: b.programId ?? null, currency: b.currency ?? 'NGN',
    access: b.access ?? 'OPEN', attributionModel: b.attributionModel ?? 'LAST_CLICK', attributionDays: b.attributionDays ?? 30, validationDays: b.validationDays ?? 14,
    startsAt: b.startsAt ?? null, endsAt: b.endsAt ?? null, destinationUrl: b.destinationUrl ?? null, status: 'DRAFT', rejectionReason: null, approvedAt: null, createdAt: now(), updatedAt: now(),
  };
  db.campaigns.unshift(camp);
  save();
  return ok(camp, 201);
});
route('GET', '/campaigns/mine', ['BUSINESS'], (c) => {
  const bp = biz(c);
  return ok(
    db.campaigns
      .filter((x) => x.businessId === bp.id)
      .map((x) => ({ ...x, product: db.products.find((p) => p.id === x.productId) ?? null, _count: { applications: db.applications.filter((a) => a.campaignId === x.id).length, referrals: db.referrals.filter((r) => r.campaignId === x.id).length } })),
  );
});
route('PATCH', '/campaigns/:id', ['BUSINESS'], (c) => {
  const camp = db.campaigns.find((x) => x.id === c.params.id && x.businessId === biz(c).id);
  if (!camp) throw new HttpErr(404, 'Campaign not found');
  if (camp.status !== 'DRAFT' && camp.status !== 'REJECTED') throw new HttpErr(409, 'Only draft or rejected campaigns can be edited');
  const allowed = ['name', 'description', 'instructions', 'commissionValue', 'access', 'destinationUrl'];
  for (const k of allowed) if (k in c.body) (camp as any)[k] = k === 'commissionValue' ? money(c.body[k]) : c.body[k];
  camp.status = 'DRAFT';
  camp.updatedAt = now();
  save();
  return ok(camp);
});
route('POST', '/campaigns/:id/submit', ['BUSINESS'], (c) => {
  const camp = db.campaigns.find((x) => x.id === c.params.id && x.businessId === biz(c).id);
  if (!camp) throw new HttpErr(404, 'Campaign not found');
  if (camp.status !== 'DRAFT' && camp.status !== 'REJECTED') throw new HttpErr(409, 'Campaign cannot be submitted from current status');
  camp.status = 'PENDING';
  camp.rejectionReason = null;
  save();
  return ok(camp);
});
route('GET', '/marketplace/campaigns', 'any', (c) => {
  const q = c.query;
  const page = Math.max(1, Number(q.get('page') ?? 1));
  const limit = Math.min(50, Math.max(1, Number(q.get('limit') ?? 20)));
  const s = q.get('search')?.toLowerCase();
  const list = db.campaigns.filter(
    (x) =>
      x.status === 'APPROVED' &&
      x.access !== 'PRIVATE' &&
      (!q.get('category') || (x.category ?? '').toLowerCase().includes(q.get('category')!.toLowerCase())) &&
      (!q.get('country') || x.country === q.get('country')) &&
      (!q.get('action') || x.action === q.get('action')) &&
      (!s || x.name.toLowerCase().includes(s) || x.description.toLowerCase().includes(s)),
  );
  return ok(list.slice((page - 1) * limit, page * limit).map(withCampaignRels), 200, { page, limit, total: list.length, pages: Math.ceil(list.length / limit) });
});
route('GET', '/campaigns/:id', 'any', (c) => {
  const camp = db.campaigns.find((x) => x.id === c.params.id && x.status === 'APPROVED');
  if (!camp) throw new HttpErr(404, 'Campaign not found');
  return ok(withCampaignRels(camp));
});
route('POST', '/campaigns/:id/apply', ['AFFILIATE'], (c) => {
  const camp = db.campaigns.find((x) => x.id === c.params.id && x.status === 'APPROVED');
  if (!camp) throw new HttpErr(404, 'Campaign not found');
  if (camp.access === 'INVITATION') throw new HttpErr(403, 'Campaign is invitation-only');
  if (camp.access === 'PRIVATE') throw new HttpErr(403, 'This campaign is private. Join through the business’s programme page.');
  const ap = aff(c);
  let app = db.applications.find((a) => a.campaignId === camp.id && a.affiliateId === ap.id);
  if (!app) {
    app = { id: id(), campaignId: camp.id, affiliateId: ap.id, status: 'PENDING', message: null, reviewedAt: null, createdAt: now() };
    db.applications.push(app);
  }
  if (camp.access === 'OPEN') {
    app.status = 'APPROVED';
    let ref = db.referrals.find((r) => r.campaignId === camp.id && r.affiliateId === ap.id);
    if (!ref) db.referrals.push((ref = { id: id(), code: id().slice(0, 14), campaignId: camp.id, affiliateId: ap.id, createdAt: now() }));
    save();
    return ok({ application: app, referral: ref }, 201);
  }
  app.status = 'PENDING';
  app.message = c.body.message ?? null;
  save();
  return ok(app, 201);
});
route('GET', '/businesses/campaigns/:id/applications', ['BUSINESS'], (c) => {
  if (!db.campaigns.some((x) => x.id === c.params.id && x.businessId === biz(c).id)) throw new HttpErr(404, 'Campaign not found');
  return ok(
    db.applications
      .filter((a) => a.campaignId === c.params.id)
      .map((a) => {
        const p = db.affiliates.find((x) => x.id === a.affiliateId)!;
        return { ...a, affiliate: { ...p, user: { ...userPublic(db.users.find((u) => u.id === p.userId)!) } } };
      }),
  );
});
route('PATCH', '/businesses/applications/:id', ['BUSINESS'], (c) => {
  const a = db.applications.find((x) => x.id === c.params.id);
  const camp = a && db.campaigns.find((x) => x.id === a.campaignId);
  if (!a || !camp || camp.businessId !== biz(c).id) throw new HttpErr(404, 'Application not found');
  a.status = c.body.status;
  a.reviewedAt = now();
  if (a.status === 'APPROVED' && !db.referrals.some((r) => r.campaignId === a.campaignId && r.affiliateId === a.affiliateId))
    db.referrals.push({ id: id(), code: id().slice(0, 14), campaignId: a.campaignId, affiliateId: a.affiliateId, createdAt: now() });
  save();
  return ok(a);
});

// ---------- referrals / conversions ----------
route('GET', '/affiliates/referrals', ['AFFILIATE'], (c) => {
  const ap = aff(c);
  return ok(
    db.referrals
      .filter((r) => r.affiliateId === ap.id)
      .map((r) => {
        const camp = db.campaigns.find((x) => x.id === r.campaignId)!;
        return { ...r, campaign: { id: camp.id, name: camp.name, destinationUrl: camp.destinationUrl, status: camp.status }, _count: { clicks: db.clicks.filter((k) => k.referralId === r.id).length, conversions: db.conversions.filter((v) => v.referralId === r.id).length } };
      }),
  );
});
route('POST', '/businesses/conversions', ['BUSINESS'], (c) => {
  const b = c.body;
  need(b.referralCode?.length >= 5, 'referralCode', 'Too short');
  need(b.externalReference?.length >= 2, 'externalReference', 'Too short');
  need(n(b.amount) > 0, 'amount', 'Must be positive');
  const bp = biz(c);
  const r = db.referrals.find((x) => x.code === b.referralCode);
  const camp = r && db.campaigns.find((x) => x.id === r.campaignId);
  if (!r || !camp || camp.businessId !== bp.id || camp.status !== 'APPROVED') throw new HttpErr(404, 'Eligible referral not found');
  if (db.conversions.some((v) => v.campaignId === camp.id && v.externalReference === b.externalReference)) throw new HttpErr(409, 'A record with this value already exists', 'CONFLICT');
  const conv: T.Conversion = { id: id(), campaignId: camp.id, affiliateId: r.affiliateId, referralId: r.id, attributionSource: 'REFERRAL', externalReference: b.externalReference, customerReference: b.customerReference ?? null, amount: money(b.amount), currency: b.currency ?? 'NGN', status: 'PENDING', submittedById: c.userId!, reviewedById: null, rejectionReason: null, evidenceUrl: b.evidenceUrl ?? null, convertedAt: b.convertedAt ?? now(), reviewedAt: null, createdAt: now(), updatedAt: now() };
  db.conversions.unshift(conv);
  const ap = db.affiliates.find((x) => x.id === r.affiliateId)!;
  notify(ap.userId, 'CONVERSION', 'New conversion submitted', 'A business submitted a conversion for review.');
  save();
  return ok(conv, 201);
});
route('GET', '/businesses/conversions', ['BUSINESS'], (c) => {
  const bp = biz(c);
  const st = c.query.get('status');
  return ok(
    db.conversions
      .filter((v) => db.campaigns.find((x) => x.id === v.campaignId)?.businessId === bp.id && (!st || v.status === st))
      .map((v) => {
        const p = db.affiliates.find((x) => x.id === v.affiliateId)!;
        const u = db.users.find((x) => x.id === p.userId)!;
        return { ...v, campaign: db.campaigns.find((x) => x.id === v.campaignId), affiliate: { ...p, user: { fullName: u.fullName, email: u.email } }, commission: db.commissions.find((k) => k.conversionId === v.id) ?? null };
      }),
  );
});
route('PATCH', '/businesses/conversions/:id/review', ['BUSINESS'], (c) => {
  const v = db.conversions.find((x) => x.id === c.params.id);
  const camp = v && db.campaigns.find((x) => x.id === v.campaignId);
  if (!v || !camp || camp.businessId !== biz(c).id) throw new HttpErr(404, 'Conversion not found');
  if (v.status !== 'PENDING') throw new HttpErr(409, 'Only pending conversions can be reviewed');
  if (c.body.decision === 'REJECTED' && !c.body.rejectionReason) throw new HttpErr(400, 'Rejection reason required');
  Object.assign(v, { status: c.body.decision, rejectionReason: c.body.rejectionReason ?? null, reviewedAt: now(), reviewedById: c.userId, updatedAt: now() });
  if (c.body.decision === 'APPROVED') {
    const amt = camp.commissionType === 'PERCENTAGE' ? (n(v.amount) * n(camp.commissionValue)) / 100 : n(camp.commissionValue);
    const k: T.Commission = { id: id(), conversionId: v.id, campaignId: camp.id, affiliateId: v.affiliateId, grossAmount: v.amount, commissionAmount: money(amt), currency: v.currency, status: 'PENDING', availableAt: new Date(Date.now() + camp.validationDays * 864e5).toISOString(), createdAt: now(), updatedAt: now() };
    db.commissions.push(k);
    db.walletEntries.unshift({ id: id(), affiliateId: v.affiliateId, type: 'PENDING_CREDIT', amount: k.commissionAmount, currency: v.currency, referenceType: 'COMMISSION', referenceId: k.id, description: `Pending commission for conversion ${v.id}`, createdAt: now() });
  }
  const ap = db.affiliates.find((x) => x.id === v.affiliateId)!;
  notify(ap.userId, 'CONVERSION', `Conversion ${c.body.decision.toLowerCase()}`, `Your conversion was ${c.body.decision.toLowerCase()}.`);
  save();
  return ok(v);
});

// ---------- admin ----------
route('GET', '/admin/businesses', ['ADMIN'], (c) => {
  const st = c.query.get('status');
  return ok(db.businesses.filter((b) => !st || b.status === st).map((b) => ({ ...b, user: (({ fullName, email }) => ({ fullName, email }))(db.users.find((u) => u.id === b.userId)!) })));
});
route('PATCH', '/admin/businesses/:id/review', ['ADMIN'], (c) => {
  const p = db.businesses.find((b) => b.id === c.params.id);
  if (!p) throw new HttpErr(404, 'Business not found');
  Object.assign(p, { status: c.body.decision, verificationNotes: c.body.notes ?? p.verificationNotes, reviewedAt: now(), reviewedById: c.userId });
  audit(c.userId!, `BUSINESS_${c.body.decision}`, 'BusinessProfile', p.id);
  notify(p.userId, 'BUSINESS_VERIFICATION', `Business ${c.body.decision.toLowerCase()}`, c.body.notes ?? `Business ${c.body.decision.toLowerCase()}`);
  save();
  return ok(p);
});
route('GET', '/admin/campaigns', ['ADMIN'], (c) => {
  const st = c.query.get('status');
  return ok(db.campaigns.filter((x) => !st || x.status === st).map((x) => ({ ...x, business: { name: db.businesses.find((b) => b.id === x.businessId)!.name }, product: db.products.find((p) => p.id === x.productId) ?? null })));
});
route('PATCH', '/admin/campaigns/:id/review', ['ADMIN'], (c) => {
  const camp = db.campaigns.find((x) => x.id === c.params.id);
  if (!camp) throw new HttpErr(404, 'Campaign not found');
  Object.assign(camp, { status: c.body.decision, rejectionReason: c.body.reason ?? null, approvedAt: c.body.decision === 'APPROVED' ? now() : null });
  audit(c.userId!, `CAMPAIGN_${c.body.decision}`, 'Campaign', camp.id);
  notify(db.businesses.find((b) => b.id === camp.businessId)!.userId, 'CAMPAIGN', `Campaign ${c.body.decision.toLowerCase()}`, c.body.reason ?? `Campaign ${c.body.decision.toLowerCase()}`);
  save();
  return ok(camp);
});
route('GET', '/admin/users', ['ADMIN'], () => ok(db.users.map(({ password: _p, phone: _ph, ...u }) => u)));
route('PATCH', '/admin/users/:id/status', ['ADMIN'], (c) => {
  const u = db.users.find((x) => x.id === c.params.id);
  if (!u) throw new HttpErr(404, 'Record not found');
  u.isActive = !!c.body.isActive;
  audit(c.userId!, u.isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED', 'User', u.id);
  save();
  return ok({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, isActive: u.isActive });
});
route('POST', '/admin/commissions/:id/release', ['ADMIN'], (c) => {
  const k = db.commissions.find((x) => x.id === c.params.id);
  if (!k) throw new HttpErr(404, 'Commission not found');
  if (k.status !== 'PENDING') throw new HttpErr(409, 'Commission is not pending');
  if (new Date(k.availableAt) > new Date()) throw new HttpErr(409, 'Validation period has not ended');
  k.status = 'AVAILABLE';
  db.walletEntries.unshift(
    { id: id(), affiliateId: k.affiliateId, type: 'PENDING_DEBIT', amount: k.commissionAmount, currency: k.currency, referenceType: 'COMMISSION_RELEASE', referenceId: k.id, description: 'Pending commission released', createdAt: now() },
    { id: id(), affiliateId: k.affiliateId, type: 'AVAILABLE_CREDIT', amount: k.commissionAmount, currency: k.currency, referenceType: 'COMMISSION_RELEASE', referenceId: k.id, description: 'Commission available for withdrawal', createdAt: now() },
  );
  audit(c.userId!, 'COMMISSION_RELEASED', 'Commission', k.id);
  save();
  return ok(k);
});

// ---------- wallet ----------
route('GET', '/wallet', ['AFFILIATE'], (c) => {
  const ap = aff(c);
  return ok({ balances: walletOf(ap.id), transactions: db.walletEntries.filter((e) => e.affiliateId === ap.id).slice(0, 100) });
});
route('POST', '/withdrawals', ['AFFILIATE'], (c) => {
  const b = c.body;
  need(n(b.amount) > 0, 'amount', 'Must be positive');
  need(b.bankName?.length >= 2, 'bankName', 'Too short');
  need(b.accountName?.length >= 2, 'accountName', 'Too short');
  need(String(b.accountNumber ?? '').length >= 8, 'accountNumber', 'Too short');
  const ap = aff(c);
  if (b.amount < 5000) throw new HttpErr(400, 'Minimum withdrawal is NGN 5000');
  if (b.amount > walletOf(ap.id).available) throw new HttpErr(400, 'Insufficient available balance');
  const w: T.Withdrawal = { id: id(), affiliateId: ap.id, amount: money(b.amount), currency: 'NGN', status: 'PENDING', bankName: b.bankName, accountName: b.accountName, accountNumber: b.accountNumber, adminNote: null, paymentReference: null, reviewedById: null, processedAt: null, createdAt: now(), updatedAt: now() };
  db.withdrawals.unshift(w);
  db.walletEntries.unshift({ id: id(), affiliateId: ap.id, type: 'AVAILABLE_DEBIT', amount: w.amount, currency: 'NGN', referenceType: 'WITHDRAWAL', referenceId: w.id, description: 'Withdrawal request deducted from available balance', createdAt: now() });
  save();
  return ok(w, 201);
});
route('GET', '/withdrawals', ['AFFILIATE'], (c) => ok(db.withdrawals.filter((w) => w.affiliateId === aff(c).id)));
route('GET', '/admin/withdrawals', ['ADMIN'], (c) => {
  const st = c.query.get('status');
  return ok(
    db.withdrawals
      .filter((w) => !st || w.status === st)
      .map((w) => {
        const p = db.affiliates.find((x) => x.id === w.affiliateId)!;
        const u = db.users.find((x) => x.id === p.userId)!;
        return { ...w, affiliate: { ...p, user: { fullName: u.fullName, email: u.email } } };
      })
      .reverse(),
  );
});
route('PATCH', '/admin/withdrawals/:id/review', ['ADMIN'], (c) => {
  const w = db.withdrawals.find((x) => x.id === c.params.id);
  if (!w) throw new HttpErr(404, 'Withdrawal not found');
  if (['PAID', 'REJECTED', 'FAILED'].includes(w.status)) throw new HttpErr(409, 'Withdrawal is already in a terminal status');
  const d = c.body.decision as T.WithdrawalStatus;
  Object.assign(w, { status: d, adminNote: c.body.adminNote ?? null, paymentReference: c.body.paymentReference ?? null, reviewedById: c.userId, processedAt: d === 'PAID' ? now() : w.processedAt, updatedAt: now() });
  if (d === 'PAID') db.walletEntries.unshift({ id: id(), affiliateId: w.affiliateId, type: 'WITHDRAWN', amount: w.amount, currency: 'NGN', referenceType: 'WITHDRAWAL', referenceId: w.id, description: 'Withdrawal marked paid by administrator', createdAt: now() });
  if (d === 'REJECTED' || d === 'FAILED') db.walletEntries.unshift({ id: id(), affiliateId: w.affiliateId, type: 'WITHDRAWAL_RELEASED', amount: w.amount, currency: 'NGN', referenceType: 'WITHDRAWAL', referenceId: w.id, description: 'Withdrawal amount returned to available balance', createdAt: now() });
  audit(c.userId!, `WITHDRAWAL_${d}`, 'Withdrawal', w.id);
  save();
  return ok(w);
});

// ---------- notifications & analytics ----------
route('GET', '/notifications', 'any', (c) => ok(db.notifications.filter((x) => x.userId === c.userId).slice(0, 100)));
route('PATCH', '/notifications/:id/read', 'any', (c) => {
  const x = db.notifications.find((k) => k.id === c.params.id && k.userId === c.userId && !k.readAt);
  if (x) x.readAt = now();
  save();
  return ok({ updated: !!x });
});
route('GET', '/analytics/affiliate', ['AFFILIATE'], (c) => {
  const ap = aff(c);
  const refs = db.referrals.filter((r) => r.affiliateId === ap.id).map((r) => r.id);
  const convs = db.conversions.filter((v) => v.affiliateId === ap.id);
  const by: Record<string, number> = {};
  convs.forEach((v) => (by[v.status] = (by[v.status] ?? 0) + 1));
  return ok({
    totalClicks: db.clicks.filter((k) => refs.includes(k.referralId)).length,
    referralLinks: refs.length,
    conversionsByStatus: Object.entries(by).map(([status, count]) => ({ status, _count: { _all: count } })),
    totalCommission: db.commissions.filter((k) => k.affiliateId === ap.id).reduce((s, k) => s + n(k.commissionAmount), 0),
    wallet: walletOf(ap.id),
  });
});
route('GET', '/analytics/business', ['BUSINESS'], (c) => {
  const bp = biz(c);
  const camps = db.campaigns.filter((x) => x.businessId === bp.id).map((x) => x.id);
  const refs = db.referrals.filter((r) => camps.includes(r.campaignId)).map((r) => r.id);
  const convs = db.conversions.filter((v) => camps.includes(v.campaignId));
  return ok({ campaigns: camps.length, clicks: db.clicks.filter((k) => refs.includes(k.referralId)).length, conversions: convs.length, approvedConversionValue: convs.filter((v) => v.status === 'APPROVED').reduce((s, v) => s + n(v.amount), 0) });
});

registerPhase1112({ route, ok, HttpErr, need, db: () => load(), id, now, aff, biz });

export async function mockTransport(method: string, path: string, body: unknown, headers: Record<string, string>) {
  load();
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 200)); // realistic latency for loading states
  const [p, qs] = path.split('?');
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.pattern.exec(p!);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1]!)]));
    const token = headers.Authorization?.replace('Bearer ', '');
    const userId = token?.startsWith('mock.') ? token.slice(5) : null;
    const user = db.users.find((u) => u.id === userId);
    try {
      if (r.auth) {
        if (!user) throw new HttpErr(401, 'Authentication required', 'UNAUTHORIZED');
        if (!user.isActive) throw new HttpErr(403, 'Account suspended', 'FORBIDDEN');
        if (r.auth !== 'any' && !r.auth.includes(user.role)) throw new HttpErr(403, 'You do not have permission to perform this action', 'FORBIDDEN');
      }
      const res = r.h({ method, path: p!, query: new URLSearchParams(qs ?? ''), body: (body as Record<string, unknown>) ?? {}, userId, params });
      save();
      return JSON.parse(JSON.stringify(res));
    } catch (e) {
      if (e instanceof HttpErr) return { status: e.status, json: { success: false, error: { code: e.code, message: e.message, details: (e as any).details } } };
      throw e;
    }
  }
  return { status: 404, json: { success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } } };
}
