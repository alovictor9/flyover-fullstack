"""Visit every page for every role in mock mode; fail on runtime errors or error boundaries."""
import os
from playwright.sync_api import sync_playwright

FE = "http://localhost:3001"
OUT = "/home/claude/e2e/smoke"; os.makedirs(OUT, exist_ok=True)
PAGES = {
    "affiliate@demo.ng": ["/affiliate", "/affiliate/profile", "/affiliate/links", "/affiliate/conversions", "/affiliate/wallet", "/affiliate/analytics", "/marketplace", "/marketplace/k1", "/marketplace/k2", "/marketplace/k4", "/marketplace/k7", "/marketplace/k8", "/affiliate/coupons", "/affiliate/creator", "/affiliate/creator-payments", "/notifications", "/settings"],
    "business@demo.ng": ["/business", "/business/profile", "/business/verification", "/business/products", "/business/campaigns", "/business/campaigns/new", "/business/campaigns/k2", "/business/campaigns/k6", "/business/conversions", "/business/analytics", "/business/campaigns/k1", "/business/campaigns/k7", "/business/campaigns/k8", "/business/creators", "/business/programmes", "/business/programmes/pg1", "/business/integrations", "/business/integrations/ig1", "/business/integrations/guide", "/business/crm", "/business/team", "/marketplace", "/notifications"],
    "chidi@demo.ng": ["/business", "/business/verification", "/business/products", "/business/campaigns"],
    "admin@demo.ng": ["/admin", "/admin/businesses", "/admin/campaigns", "/admin/withdrawals", "/admin/commissions", "/admin/users", "/admin/audit", "/marketplace/k1"],
}
PUBLIC = ["/", "/programme/smarttech-partners", "/login", "/register", "/forgot-password", "/verify-email", "/help", "/offline", "/nope-404"]
bad = []
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for vp, tag in [({"width": 1366, "height": 860}, "d"), ({"width": 390, "height": 844}, "m")]:
        c = br.new_context(viewport=vp)
        pg = c.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "favicon" not in m.text and errs.append(m.text))
        for path in PUBLIC:
            pg.goto(FE + path); pg.wait_for_timeout(600)
        for email, pages in PAGES.items():
            c.clear_cookies(); pg.evaluate("localStorage.removeItem('flyover.session')")
            pg.goto(FE + "/login"); pg.get_by_label("Email address").fill(email); pg.locator("input[name=password]").fill("password1234")
            pg.get_by_role("button", name="Sign in").click(); pg.wait_for_timeout(1500)
            for path in pages:
                errs.clear()
                pg.goto(FE + path); pg.wait_for_timeout(1300)
                body = pg.inner_text("body")
                if errs or "Application error" in body or "Something went wrong" in body:
                    bad.append((tag, email, path, errs[:2]))
                if tag == "d" and path in ("/business/campaigns/k2", "/affiliate/conversions", "/admin/users", "/business/verification", "/marketplace/k4"):
                    pg.screenshot(path=f"{OUT}/{email.split('@')[0]}{path.replace('/', '_')}.png", full_page=True)
        c.close()
    br.close()
print("FAILURES:", bad if bad else "none")
