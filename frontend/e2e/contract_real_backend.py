"""Contract test: checks that the real backend returns what the Phase 11-12 screens depend on.

API only, no browser needed. Run it against a backend that is up and seeded (admin account present):
    API=http://localhost:4000/api/v1 ADMIN_EMAIL=admin@flyover.local ADMIN_PASSWORD='...' python3 contract_real_backend.py
Lines marked ASSUMPTION are things the frontend takes for granted that the backend docs do not promise."""
import json, os, sys, time, urllib.request, urllib.error

API = os.environ.get("API", "http://localhost:4000/api/v1").rstrip("/")
ADMIN = {"email": os.environ.get("ADMIN_EMAIL", "admin@flyover.local"), "pw": os.environ.get("ADMIN_PASSWORD", "AdminPassword123!")}
RUN = str(int(time.time()))[-7:]
PW = "Contract-Pass-2026!"
S, results = {}, []

def call(method, path, body=None, token=None, headers=None):
    h = {"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {}), **(headers or {})}
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try: return e.code, json.loads(raw)
        except Exception: return e.code, {"raw": raw.decode(errors="replace")[:200]}

def ok(method, path, body=None, token=None, want=(200, 201)):
    st, js = call(method, path, body, token)
    if st not in want: raise AssertionError(f"{method} {path} -> {st}: {json.dumps(js)[:240]}")
    return js

def has(obj, *keys):
    miss = [k for k in keys if k not in obj]
    assert not miss, f"missing fields {miss} in {sorted(obj)[:14]}"

def check(name, fn, assumption=False):
    label = ("ASSUMPTION: " if assumption else "") + name
    try:
        fn(); results.append((True, label)); print("✓", label, flush=True)
    except Exception as e:
        results.append((False, label)); print("✗", label, "->", e, flush=True)

def login(who):
    return ok("POST", "/auth/login", {"email": who["email"], "password": who["pw"]})["data"]["accessToken"]

def reg(role, tag):
    who = {"name": f"{tag} {RUN}", "email": f"{tag.lower().replace(' ','')}{RUN}@contract.test", "pw": PW}
    ok("POST", "/auth/register", {"fullName": who["name"], "email": who["email"], "password": PW, "role": role})
    who["token"] = login(who); return who

def campaign_body(name, **kw):
    return {"name": name, "description": "Contract test campaign for the Flyover frontend.", "action": "CPS", "access": "OPEN",
            "attributionModel": "LAST_CLICK", "attributionDays": 30, "validationDays": 14, "currency": "NGN",
            "destinationUrl": "https://example.com/shop", **kw}

def publish(token, body):
    cid = ok("POST", "/campaigns", body, token)["data"]["id"]
    ok("POST", f"/campaigns/{cid}/submit", None, token)
    ok("PATCH", f"/admin/campaigns/{cid}/review", {"decision": "APPROVED"}, S["admin"])
    return cid

# ---------------- setup ----------------
print(f"Contract test against {API} (run {RUN})\n")
try:
    S["admin"] = login(ADMIN)
    biz = reg("BUSINESS", "Contract Biz"); S["biz"] = biz["token"]
    ok("PATCH", "/businesses/me", {"name": f"Contract Gadgets {RUN}", "description": "Gadgets for the contract test.", "website": "https://example.com", "country": "Nigeria"}, S["biz"])
    ok("POST", "/businesses/verification", {"registrationNumber": f"RC-{RUN}"}, S["biz"])
    pending = ok("GET", "/admin/businesses?status=PENDING", None, S["admin"])["data"]
    bid = next(b["id"] for b in pending if b["name"] == f"Contract Gadgets {RUN}")
    ok("PATCH", f"/admin/businesses/{bid}/review", {"decision": "APPROVED", "notes": "contract test"}, S["admin"])
    aff = reg("AFFILIATE", "Contract Aff"); S["aff"] = aff["token"]; S["aff_user"] = aff
    S["perf"] = publish(S["biz"], campaign_body(f"Perf {RUN}", commissionType="PERCENTAGE", commissionValue=10))
    S["fixed"] = publish(S["biz"], campaign_body(f"Fixed fee {RUN}", compensationModel="FIXED_FEE", fixedFeeAmount=50000, requiredDeliverables=1))
    for k in ("perf", "fixed"): ok("POST", f"/campaigns/{S[k]}/apply", {}, S["aff"])
    S["aff_id"] = ok("GET", f"/businesses/campaigns/{S['perf']}/applications", None, S["biz"])["data"][0]["affiliateId"]
except Exception as e:
    print("Setup failed, cannot continue:", e); sys.exit(2)
print("Setup done: approved business, 2 approved campaigns, 1 affiliate who joined both.\n")

# ---------------- coupons ----------------
def coupons():
    c = ok("POST", f"/campaigns/{S['perf']}/coupons", {"affiliateId": S["aff_id"], "code": f"CT{RUN}", "discountType": "PERCENTAGE", "discountValue": 10, "maxRedemptions": 5}, S["biz"])["data"]
    S["coupon"] = c["id"]
    row = ok("GET", f"/campaigns/{S['perf']}/coupons", None, S["biz"])["data"][0]
    has(row, "code", "discountType", "discountValue", "isActive", "maxRedemptions", "expiresAt"); has(row["affiliate"]["user"], "fullName", "email")
    mine = ok("GET", "/affiliates/coupons", None, S["aff"])["data"][0]
    has(mine, "code", "discountType", "isActive"); has(mine["campaign"], "name", "currency", "status"); has(mine["campaign"]["business"], "name")
    ok("PATCH", f"/coupons/{S['coupon']}", {"isActive": False}, S["biz"])
check("Coupons: issue, list (business), list (affiliate) and pause return the fields the screens use", coupons)
check("Coupons: fixed-fee campaigns reject coupons (409)", lambda: ok("POST", f"/campaigns/{S['fixed']}/coupons", {"affiliateId": S["aff_id"], "code": f"FX{RUN}", "discountType": "PERCENTAGE", "discountValue": 5}, S["biz"], want=(409,)))

# ---------------- notification preferences ----------------
def prefs():
    p = ok("GET", "/notifications/preferences", None, S["aff"])["data"]; has(p, "inAppEnabled", "emailEnabled", "mutedTypes")
    q = ok("PATCH", "/notifications/preferences", {"mutedTypes": ["CAMPAIGN"], "emailEnabled": True}, S["aff"])["data"]
    assert q["mutedTypes"] == ["CAMPAIGN"] and q["emailEnabled"] is True, q
check("Notification preferences: read and update", prefs)

# ---------------- creators ----------------
def creators():
    body = {"displayName": f"Creator {RUN}", "bio": "Contract creator", "niches": ["Electronics"], "country": "Nigeria", "city": "Lagos", "languages": ["English"], "audienceSize": 12000, "engagementRate": 4.5, "status": "ACTIVE"}
    ok("PUT", "/creators/me", body, S["aff"])
    me = ok("GET", "/creators/me", None, S["aff"])["data"]; has(me, "displayName", "niches", "country", "status", "updatedAt")
    js = ok("GET", "/creators?niche=Electronics&limit=5", None, S["biz"]); row = js["data"][0]
    has(row, "displayName", "niches", "audienceSize", "engagementRate", "affiliate"); has(row["affiliate"]["user"], "fullName"); has(js["meta"], "page", "pages", "total")
check("Creators: save profile, read it back, business discovery with pagination", creators)

# ---------------- deliverables and creator payments ----------------
def link_exists():
    refs = ok("GET", "/affiliates/referrals", None, S["aff"])["data"]
    assert any(r["campaignId"] == S["fixed"] for r in refs), "no referral link for the fixed-fee campaign"
check("Fixed-fee campaign gives the joined affiliate a referral link (the deliverables section needs it)", link_exists, assumption=True)

def deliverables():
    d = ok("POST", f"/creator-campaigns/{S['fixed']}/deliverables", {"title": "Unboxing video", "assetUrl": "https://example.com/video", "contentType": "YouTube video"}, S["aff"])["data"]
    S["dv"] = d["id"]; has(d, "status", "version", "submittedAt")
    mine = ok("GET", f"/creator-campaigns/{S['fixed']}/deliverables", None, S["aff"])["data"]; assert mine and mine[0]["status"] == "SUBMITTED"
    row = ok("GET", f"/businesses/campaigns/{S['fixed']}/deliverables", None, S["biz"])["data"][0]; has(row["affiliate"]["user"], "fullName", "email")
    ok("PATCH", f"/businesses/deliverables/{S['dv']}/review", {"decision": "REVISION_REQUESTED", "reviewNotes": "Please add a closing call to action."}, S["biz"])
    r = ok("PATCH", f"/creator-campaigns/{S['fixed']}/deliverables/{S['dv']}", {"assetUrl": "https://example.com/video-v2"}, S["aff"])["data"]
    assert r["status"] == "SUBMITTED" and r["version"] == 2, r
    ok("PATCH", f"/businesses/deliverables/{S['dv']}/review", {"decision": "IN_REVIEW"}, S["biz"])
    ok("PATCH", f"/businesses/deliverables/{S['dv']}/review", {"decision": "APPROVED"}, S["biz"])
check("Deliverables: submit, request changes, resubmit (version 2), approve", deliverables)

def payments():
    row = ok("GET", f"/businesses/campaigns/{S['fixed']}/creator-payments", None, S["biz"])["data"][0]
    has(row, "amount", "currency", "status"); has(row["affiliate"]["user"], "fullName"); assert row["status"] == "APPROVED", f"expected APPROVED after approval, got {row['status']}"
    S["pay"] = row["id"]
    mine = ok("GET", "/affiliates/creator-payments", None, S["aff"])["data"][0]; has(mine["campaign"], "name"); has(mine["campaign"]["business"], "name")
    ok("PATCH", f"/businesses/creator-payments/{S['pay']}", {"decision": "PROCESSING"}, S["biz"])
    ok("PATCH", f"/businesses/creator-payments/{S['pay']}", {"decision": "PAID", "paymentReference": f"TRX-{RUN}", "paymentProvider": "Bank transfer"}, S["biz"])
check("Creator payments: becomes payable after approval, then processing, then paid with a reference", payments)

# ---------------- programmes ----------------
def programmes():
    slug = f"contract-{RUN}"; S["slug"] = slug
    p = ok("POST", "/businesses/programs", {"name": f"Contract Programme {RUN}", "slug": slug, "description": "d", "requiresApproval": True, "landingPageTitle": "Join us", "brandColor": "#0F766E",
        "customFields": [{"key": "channel_1", "label": "Main channel", "required": True, "type": "TEXT"}]}, S["biz"])["data"]
    S["program"] = p["id"]; has(p, "status", "requiresApproval", "customFields")
    ok("PATCH", f"/businesses/programs/{p['id']}", {"status": "ACTIVE"}, S["biz"])
    lst = ok("GET", "/businesses/programs", None, S["biz"])["data"]; has(lst[0], "slug", "status"); has(lst[0]["_count"], "memberships", "campaigns")
    pub = ok("GET", f"/programs/{slug}", None)["data"]; has(pub, "name", "requiresApproval", "customFields", "brandColor"); has(pub["business"], "name", "country")
    who = {"fullName": f"Programme Aff {RUN}", "email": f"progaff{RUN}@contract.test", "password": PW, "answers": {"channel_1": "TikTok"}}
    r = ok("POST", f"/programs/{slug}/register", who, None)["data"]; assert r["membershipStatus"] == "PENDING", r
    S["prog_aff"] = {"email": who["email"], "pw": PW}
    mem = ok("GET", f"/businesses/programs/{p['id']}/members", None, S["biz"])["data"][0]; has(mem, "status", "answers"); has(mem["affiliate"]["user"], "fullName", "email")
    ok("PATCH", f"/businesses/program-memberships/{mem['id']}", {"decision": "APPROVED"}, S["biz"])
check("Programmes: create, go live, public page, register through it, review the member", programmes)

def private_campaign():
    S["private"] = publish(S["biz"], campaign_body(f"Private {RUN}", access="PRIVATE", programId=S["program"], commissionType="PERCENTAGE", commissionValue=7))
    tok = login(S["prog_aff"]); S["prog_tok"] = tok
    lst = ok("GET", f"/programs/{S['slug']}/campaigns", None, tok)["data"]; assert any(c["id"] == S["private"] for c in lst), "approved member does not see the private campaign"
    st, _ = call("GET", f"/programs/{S['slug']}/campaigns", None, S["aff"]); assert st == 403, f"non-member got {st}, expected 403"
check("Private campaigns: visible to approved programme members only", private_campaign)
check("Marketplace detail page can open a private campaign for an approved member (the programme page links there)",
      lambda: has(ok("GET", f"/campaigns/{S['private']}", None, S["prog_tok"])["data"], "name", "access"), assumption=True)

# ---------------- integrations ----------------
def integrations():
    created = ok("POST", "/businesses/integrations", {"name": f"Payments {RUN}", "kind": "PAYMENT", "provider": "GENERIC_HMAC", "webhookSecret": "a" * 32, "allowedDomains": []}, S["biz"])["data"]
    S["ig"] = created["id"]; has(created, "webhookUrl", "publicKey", "trackingEndpoint")
    lst = ok("GET", "/businesses/integrations", None, S["biz"])["data"]; has(lst[0], "kind", "provider", "status", "publicKey"); has(lst[0]["_count"], "webhookEvents", "apiKeys")
    key = ok("POST", f"/businesses/integrations/{S['ig']}/api-keys", {"name": "Server", "scopes": ["conversions:write"]}, S["biz"])["data"]; has(key, "key", "keyPrefix")
    keys = ok("GET", f"/businesses/integrations/{S['ig']}/api-keys", None, S["biz"])["data"]; has(keys[0], "name", "keyPrefix", "lastUsedAt", "revokedAt")
    ok("DELETE", f"/businesses/integrations/{S['ig']}/api-keys/{key['id']}", None, S["biz"])
    assert isinstance(ok("GET", f"/businesses/integrations/{S['ig']}/events", None, S["biz"])["data"], list)
    ok("PATCH", f"/businesses/integrations/{S['ig']}/credentials", {"webhookSecret": "b" * 32}, S["biz"])
    ok("PATCH", f"/businesses/integrations/{S['ig']}/status", {"status": "PAUSED"}, S["biz"]); ok("PATCH", f"/businesses/integrations/{S['ig']}/status", {"status": "ACTIVE"}, S["biz"])
    S["webhookUrl"] = created["webhookUrl"]
check("Integrations: connect, list, API keys (create, list, revoke), events, rotate secret, pause and resume", integrations)
check("Integration webhook URL equals the one the detail page builds from the API address",
      lambda: (lambda want: (_ for _ in ()).throw(AssertionError(f"backend says {S['webhookUrl']}, frontend builds {want}")) if S["webhookUrl"] != want else None)(API.rsplit("/api/v", 1)[0] + "/webhooks/" + S["ig"]), assumption=True)

# ---------------- team ----------------
def team():
    mate = reg("BUSINESS", "Team Mate")
    ok("POST", "/businesses/members", {"email": mate["email"], "role": "MANAGER"}, S["biz"])
    rows = ok("GET", "/businesses/members", None, S["biz"])["data"]
    assert any(r["isOwner"] for r in rows) and len(rows) >= 2, rows
    m = next(r for r in rows if not r["isOwner"]); has(m, "id", "role", "isActive"); has(m["user"], "fullName", "email")
    ok("PATCH", f"/businesses/members/{m['id']}", {"role": "ANALYST"}, S["biz"]); ok("PATCH", f"/businesses/members/{m['id']}", {"isActive": False}, S["biz"])
check("Team: add a member, owner row present, change role, remove access", team)

# ---------------- CRM ----------------
def crm():
    ok("PUT", f"/businesses/crm/affiliates/{S['aff_id']}", {"stage": "NEGOTIATING", "tags": ["contract"], "notes": "Test note"}, S["biz"])
    js = ok("GET", "/businesses/crm/affiliates?stage=NEGOTIATING&limit=5", None, S["biz"]); row = js["data"][0]
    has(row, "stage", "tags", "notes", "lastContactAt"); has(row["affiliate"]["user"], "fullName", "email"); has(js["meta"], "page", "pages", "total")
check("CRM: save a record and list it with filters and pagination", crm)

# ---------------- conversions and analytics ----------------
def conversion_source():
    code = next(r["code"] for r in ok("GET", "/affiliates/referrals", None, S["aff"])["data"] if r["campaignId"] == S["perf"])
    ok("POST", "/businesses/conversions", {"referralCode": code, "externalReference": f"ORD-{RUN}", "amount": 100000, "currency": "NGN"}, S["biz"])
    row = ok("GET", "/businesses/conversions", None, S["biz"])["data"][0]; has(row, "attributionSource", "status", "externalReference")
check("Conversions: each record carries attributionSource (shown in the Source column)", conversion_source)

def analytics():
    c = ok("GET", "/analytics/business/campaigns", None, S["biz"])["data"][0]
    has(c, "name", "status", "referrals", "conversions", "approvedConversions", "couponAttributedConversions", "automaticallyVerifiedConversions", "conversionValue", "commissionCost")
    a = ok("GET", "/analytics/business/affiliates", None, S["biz"])["data"][0]
    has(a, "affiliateId", "campaignCount", "conversions", "approvedConversionValue", "approvedConversionValueByCurrency"); has(a["affiliate"], "fullName")
    st, _ = call("GET", "/analytics/business/campaigns?from=2026-02-01T00:00:00Z&to=2026-01-01T00:00:00Z", None, S["biz"]); assert st == 400, f"reversed range gave {st}, expected 400"
check("Advanced analytics: fields used by the tables, and a reversed date range is rejected", analytics)

passed = sum(1 for ok_, _ in results if ok_)
print(f"\n{passed} passed, {len(results) - passed} failed of {len(results)} checks")
sys.exit(0 if passed == len(results) else 1)
