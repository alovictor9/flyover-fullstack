"""End-to-end acceptance run of the Flyover frontend against the real backend.
signup -> business verification -> campaign approval -> affiliate join -> referral click ->
manual conversion approval -> commission ledger -> withdrawal request/admin handling."""
import json, os, re, sys, time, urllib.request
from playwright.sync_api import sync_playwright, expect

FE = "http://localhost:3000"
API = "http://localhost:4000/api/v1"
OUT = "/home/claude/e2e/shots"
os.makedirs(OUT, exist_ok=True)
RUN = str(int(time.time()))[-6:]
BIZ = {"name": "Kemi Adeyemi", "email": f"kemi{RUN}@smarttech.ng", "pw": "SmartTech-Pass-2026"}
AFF = {"name": "Ada Okafor", "email": f"ada{RUN}@creator.ng", "pw": "Creator-Pass-2026!"}
ADMIN = {"email": "admin@flyover.local", "pw": "AdminPassword123!"}
CAMPAIGN = f"SmartTech Earbuds Pro {RUN}"
log = []

def step(msg):
    print("✓", msg, flush=True); log.append(msg)

def shot(page, name, full=True):
    page.wait_for_timeout(500)
    page.screenshot(path=f"{OUT}/{name}.png", full_page=full)

def api(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["data"]

def login(page, who):
    page.goto(f"{FE}/login")
    page.get_by_label("Email address").fill(who["email"])
    page.get_by_label(re.compile(r"^Password")).fill(who["pw"])
    page.get_by_role("button", name="Sign in").click()

def register(page, who, role):
    page.goto(f"{FE}/register?role={role}")
    page.get_by_label(re.compile("full name", re.I)).fill(who["name"])
    page.get_by_label("Email address").fill(who["email"])
    page.get_by_label(re.compile(r"^Password")).fill(who["pw"])
    page.get_by_label("Confirm password").fill(who["pw"])
    page.locator("input[name=terms]").check()
    page.get_by_role("button", name=re.compile("Create .* account")).click()

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    desk = dict(viewport={"width": 1366, "height": 860}, device_scale_factor=1)
    mob = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    errors = []
    def ctx(opts):
        c = browser.new_context(**opts)
        c.on("weberror", lambda e: errors.append(str(e.error)))
        return c

    # ---------- Landing + business registration ----------
    b = ctx(desk).new_page()
    b.goto(FE); shot(b, "01-landing", full=False)
    register(b, BIZ, "BUSINESS")
    b.wait_for_url("**/business/onboarding")
    step("Business registered and signed in")
    b.get_by_label("Business name").fill("SmartTech Gadgets")
    b.get_by_label("About the business").fill("Authentic phones, laptops and accessories delivered across Nigeria.")
    b.get_by_label("Website").fill("https://smarttech.example")
    b.get_by_role("button", name="Continue").click()
    b.get_by_label("CAC registration number").wait_for()
    b.get_by_label("CAC registration number").fill("RC-1458820")
    b.get_by_label("Anything we should know?").fill("Operating since 2019 from Ikeja, Lagos.")
    shot(b, "02-business-verification-form")
    b.get_by_role("button", name="Submit for verification").click()
    b.get_by_text("We're reviewing your business").wait_for()
    step("Business submitted verification")
    b.goto(f"{FE}/business"); b.get_by_text("Verification in review").wait_for(); shot(b, "03-business-dashboard-pending", full=False)

    # ---------- Admin approves business ----------
    a = ctx(desk).new_page()
    login(a, ADMIN); a.wait_for_url("**/admin")
    a.goto(f"{FE}/admin/businesses")
    a.get_by_role("cell", name=re.compile("SmartTech Gadgets")).first.click()
    a.get_by_role("dialog").get_by_role("button", name="Approve business").click()
    shot(a, "04-admin-approve-business", full=False)
    a.get_by_role("dialog", name=re.compile("Approve")).get_by_role("button", name="Approve", exact=True).click()
    a.get_by_text("Business approved").wait_for()
    step("Admin approved business")

    # ---------- Business creates product + campaign ----------
    b.goto(f"{FE}/business/products"); b.reload()
    b.get_by_role("button", name="Add product").first.click()
    d = b.get_by_role("dialog")
    d.get_by_label("Product or service name").fill("Wireless Earbuds Pro")
    d.get_by_label("Price").fill("60000")
    d.get_by_label("Category").select_option("Electronics")
    d.get_by_label("Product page URL").fill("https://smarttech.example/earbuds")
    d.get_by_role("button", name="Add product").click()
    b.get_by_text("Product added").wait_for()
    step("Business created product")
    b.goto(f"{FE}/business/campaigns/new")
    b.get_by_label("Campaign name").fill(CAMPAIGN)
    b.get_by_label("Campaign brief").fill("Earn 10% on every verified sale of our noise-cancelling Wireless Earbuds Pro. Free delivery in Lagos.")
    b.get_by_label("Product").select_option(label="Wireless Earbuds Pro")
    b.get_by_label("Category").select_option("Electronics")
    shot(b, "05-campaign-builder-brief")
    b.get_by_role("button", name="Continue").click()
    b.get_by_label("Commission rate").fill("10")
    shot(b, "06-campaign-builder-commission")
    b.get_by_role("button", name="Continue").click()
    b.get_by_label("Validation period").fill("0")
    b.get_by_label("Instructions for affiliates").fill("Show the earbuds in use. Mention free Lagos delivery.")
    b.get_by_role("button", name="Continue").click()
    shot(b, "07-campaign-builder-review")
    b.get_by_role("button", name="Submit for review").click()
    b.wait_for_url("**/business/campaigns/c*")
    b.get_by_text("In review").first.wait_for()
    step("Business created and submitted campaign")

    # ---------- Admin approves campaign ----------
    a.goto(f"{FE}/admin/campaigns")
    a.get_by_role("cell", name=re.compile(CAMPAIGN)).first.click()
    shot(a, "08-admin-campaign-review", full=False)
    a.get_by_role("dialog").get_by_role("button", name="Approve & publish").click()
    a.get_by_role("dialog", name=re.compile("Approve")).get_by_role("button", name="Approve", exact=True).click()
    a.get_by_text("Campaign approved and live").wait_for()
    step("Admin approved campaign")

    # ---------- Affiliate registers, joins ----------
    f = ctx(desk).new_page()
    register(f, AFF, "AFFILIATE"); f.wait_for_url("**/affiliate/onboarding")
    f.get_by_role("button", name="Instagram").click(); f.get_by_role("button", name="TikTok").click()
    shot(f, "09-affiliate-onboarding", full=False)
    f.get_by_role("button", name="Continue").click()
    f.get_by_role("button", name="Electronics").click()
    f.get_by_role("button", name="Continue").click()
    f.get_by_label("Bio").fill("Lagos tech creator. Weekly gadget reviews.")
    f.get_by_label("Audience size").fill("40000")
    f.get_by_role("button", name="Finish").click()
    f.get_by_text("You're ready to start earning").wait_for()
    step("Affiliate registered and completed onboarding")
    f.goto(f"{FE}/marketplace"); f.get_by_text(CAMPAIGN).first.wait_for()
    shot(f, "10-marketplace", full=False)
    f.get_by_text(CAMPAIGN).first.click()
    f.get_by_role("button", name="Join campaign & get my link").click()
    f.get_by_text("You're promoting this campaign").wait_for()
    shot(f, "11-campaign-joined-link")
    link = f.locator("code").first.inner_text()
    code = link.rstrip("/").split("/r/")[1].split("?")[0]
    step(f"Affiliate joined; referral link {link}")

    # ---------- Referral clicks (real redirect endpoint) ----------
    for src in ["instagram", "instagram", "whatsapp"]:
        req = urllib.request.Request(f"{API}/r/{code}?source={src}")
        opener = urllib.request.build_opener(type("NoRedirect", (urllib.request.HTTPRedirectHandler,), {"redirect_request": lambda *a, **k: None}))
        try: opener.open(req)
        except urllib.error.HTTPError as e: assert e.code == 302, e.code
    step("3 referral clicks recorded via GET /r/:code (302 redirect)")
    f.goto(f"{FE}/affiliate/links"); f.get_by_text("Total clicks").wait_for(); shot(f, "12-affiliate-links", full=False)

    # ---------- Business records + approves conversion ----------
    b.goto(f"{FE}/business/conversions")
    b.get_by_role("button", name="Record conversion").first.click()
    d = b.get_by_role("dialog")
    d.get_by_label("Referral code").fill(code)
    d.get_by_label("Order / transaction reference").fill(f"ORD-{RUN}")
    d.get_by_label("Sale value").fill("60000")
    shot(b, "13-record-conversion", full=False)
    d.get_by_role("button", name="Record conversion").click()
    b.get_by_text("Conversion recorded").wait_for()
    b.get_by_role("cell", name=re.compile(f"ORD-{RUN}")).first.click()
    b.get_by_role("dialog").get_by_role("button", name="Approve conversion").click()
    b.get_by_role("dialog", name=re.compile("Approve this")).get_by_role("button", name="Approve", exact=True).click()
    b.get_by_text("Conversion approved").wait_for()
    b.get_by_role("tab", name=re.compile("Approved")).click()
    b.get_by_role("cell", name=re.compile(f"ORD-{RUN}")).first.click()
    b.get_by_text("₦6,000.00").first.wait_for()
    shot(b, "14-conversion-approved-commission", full=False)
    step("Business recorded and approved conversion; commission ₦6,000.00 (10% of ₦60,000) shown")

    # commission id (admin has no list endpoint yet) — read via business API
    btok = api("POST", "/auth/login", {"email": BIZ["email"], "password": BIZ["pw"]})["accessToken"]
    conv = [c for c in api("GET", "/businesses/conversions", token=btok) if c["externalReference"] == f"ORD-{RUN}"][0]
    cid = conv["commission"]["id"]; assert conv["commission"]["commissionAmount"] in ("6000", "6000.00", 6000), conv["commission"]

    f.goto(f"{FE}/affiliate/wallet"); f.get_by_text("Pending").first.wait_for(); shot(f, "15-wallet-pending", full=False)

    # ---------- Admin releases commission ----------
    a.goto(f"{FE}/admin/commissions")
    a.get_by_placeholder("Commission ID").fill(cid)
    a.get_by_role("button", name="Release").click()
    a.get_by_role("dialog").get_by_role("button", name="Release").click()
    a.get_by_text("Commission released").wait_for()
    step("Admin released matured commission")

    # ---------- Affiliate withdraws ----------
    f.goto(f"{FE}/affiliate/wallet")
    f.get_by_role("button", name="Withdraw").click()
    d = f.get_by_role("dialog")
    d.get_by_label("Amount").fill("7000")
    d.get_by_label("Bank").select_option("GTBank")
    d.get_by_label("Account number").fill("0123456789")
    d.get_by_label("Account name").fill("Ada Okafor")
    d.get_by_role("button", name="Review withdrawal").click()
    d.get_by_text("You can withdraw up to").wait_for()
    shot(f, "16-withdraw-validation", full=False)
    step("Withdrawal over available balance blocked in UI")
    d.get_by_label("Amount").fill("5000")
    d.get_by_role("button", name="Review withdrawal").click()
    d.get_by_role("button", name="Confirm withdrawal").click()
    f.get_by_role("status").get_by_text("Withdrawal requested").wait_for()
    step("Affiliate requested ₦5,000 withdrawal")

    # ---------- Admin pays withdrawal ----------
    a.goto(f"{FE}/admin/withdrawals")
    a.get_by_role("cell", name=re.compile(re.escape(AFF["email"]))).first.click()
    shot(a, "17-admin-withdrawal", full=False)
    a.get_by_role("dialog").get_by_role("button", name="Approve").click()
    a.get_by_role("dialog").get_by_role("button", name="Approve").click()
    a.get_by_text("Withdrawal approved").wait_for()
    a.get_by_role("tab", name=re.compile("Approved")).click()
    a.get_by_role("cell", name=re.compile(re.escape(AFF["email"]))).first.click()
    a.get_by_role("dialog").get_by_role("button", name="Mark as paid").click()
    a.get_by_label("Bank payment reference").fill(f"GTB-TRF-{RUN}")
    a.get_by_label("Admin note").fill("Paid manually via GTBank")
    a.get_by_role("dialog").get_by_role("button", name="Mark as paid").click()
    a.get_by_text("Withdrawal paid").wait_for()
    step("Admin approved and marked withdrawal paid with bank reference")

    f.goto(f"{FE}/affiliate/wallet"); f.get_by_text("Withdrawn").first.wait_for(); f.wait_for_timeout(800); shot(f, "18-wallet-final")
    f.get_by_role("tab", name=re.compile("Withdrawals")).click(); f.get_by_text(f"GTB-TRF-{RUN}").first.wait_for(); shot(f, "19-wallet-withdrawals", full=False)
    ftok = api("POST", "/auth/login", {"email": AFF["email"], "password": AFF["pw"]})["accessToken"]
    bal = api("GET", "/wallet", token=ftok)["balances"]
    assert bal == {"pending": 0, "available": 1000, "withdrawn": 5000, "reversed": 0}, bal
    step(f"Ledger-derived balances correct: {bal}")
    f.goto(f"{FE}/notifications"); f.get_by_text("Conversion approved").first.wait_for(); shot(f, "20-notifications", full=False)
    f.goto(f"{FE}/affiliate"); f.wait_for_timeout(800); shot(f, "21-affiliate-dashboard", full=False)
    b.goto(f"{FE}/business/analytics"); b.get_by_text("Commission expenditure").wait_for(); shot(b, "22-business-analytics", full=False)
    a.goto(f"{FE}/admin"); a.get_by_role("heading", name="Work queues").wait_for(); shot(a, "23-admin-overview", full=False)

    # ---------- Role boundaries ----------
    f.goto(f"{FE}/admin/withdrawals"); f.wait_for_url("**/affiliate"); step("Affiliate redirected away from admin pages")

    # ---------- Mobile ----------
    m = ctx(mob).new_page()
    login(m, AFF); m.wait_for_url("**/affiliate")
    m.wait_for_timeout(800); shot(m, "24-mobile-dashboard", full=False)
    m.goto(f"{FE}/affiliate/wallet"); m.get_by_text("Available").first.wait_for(); shot(m, "25-mobile-wallet", full=False)
    m.goto(f"{FE}/marketplace"); m.get_by_text(CAMPAIGN).first.wait_for(); shot(m, "26-mobile-marketplace", full=False)
    m.get_by_role("button", name="More").click(); shot(m, "27-mobile-more-menu", full=False)
    step("Mobile layout verified (bottom nav, wallet, marketplace)")

    print("\nPAGE ERRORS:", errors or "none")
    browser.close()
print("\nALL STEPS PASSED:", len(log))
