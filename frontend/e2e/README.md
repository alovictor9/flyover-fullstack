# E2E checks (Python + Playwright)

- `acceptance_real_backend.py` — drives the full MVP loop through the UI against a running backend (frontend on :3000, API on :4000, admin seeded with ADMIN_EMAIL/ADMIN_PASSWORD from the script).
- `contract_real_backend.py` — API-only check (no browser) that the real backend returns the fields the Phase 11–12 screens use. Run: `API=http://localhost:4000/api/v1 ADMIN_PASSWORD=... python3 contract_real_backend.py`. Lines marked ASSUMPTION are things the frontend takes for granted that the backend docs do not promise.
- `smoke_mock_all_pages.py` — visits every page for every role (desktop + mobile) on a mock-mode build served on :3001 and fails on any runtime error.

`pip install playwright && playwright install chromium`, then edit the `executable_path` in each script (or remove it) and run with `python3 <script>`.
