"""Super admin platform control panel tests.

Covers: login, account info, suspend/reactivate flow (with 423 guards),
storage limit, and delete-instance API (NOT executed by default to keep DB intact).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fall back to reading frontend/.env directly
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

SUPER_USER = "superadmin"
SUPER_PASS = "super123"
CUST_USER = "admin"
CUST_PASS = "test123"


# -------- fixtures --------
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def super_token(client):
    r = client.post(f"{API}/superadmin/login",
                    json={"username": SUPER_USER, "password": SUPER_PASS})
    assert r.status_code == 200, f"super login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture
def super_headers(super_token):
    return {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}


# -------- super admin login --------
class TestSuperAdminLogin:
    def test_login_success(self, client):
        r = client.post(f"{API}/superadmin/login",
                        json={"username": SUPER_USER, "password": SUPER_PASS})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20

    def test_login_wrong_password(self, client):
        r = client.post(f"{API}/superadmin/login",
                        json={"username": SUPER_USER, "password": "WRONG"})
        assert r.status_code == 401

    def test_login_wrong_username(self, client):
        r = client.post(f"{API}/superadmin/login",
                        json={"username": "nope", "password": SUPER_PASS})
        assert r.status_code == 401


# -------- account info --------
class TestAccountInfo:
    def test_account_requires_auth(self, client):
        r = client.get(f"{API}/superadmin/account")
        assert r.status_code in (401, 403)

    def test_account_bad_token(self, client):
        r = client.get(f"{API}/superadmin/account",
                       headers={"Authorization": "Bearer abc.def.ghi"})
        assert r.status_code in (401, 403)

    def test_account_shape(self, client, super_headers):
        r = client.get(f"{API}/superadmin/account", headers=super_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("business_name", "admin_username", "suspended",
                  "storage_used_bytes", "storage_limit_bytes",
                  "gallery_count", "file_count", "share_count"):
            assert k in d, f"missing key {k}"
        assert d["business_name"] == "Aurora Studios"
        assert d["admin_username"] == "admin"
        assert d["suspended"] is False
        assert isinstance(d["storage_used_bytes"], int)
        assert isinstance(d["gallery_count"], int)


# -------- storage limit --------
class TestStorageLimit:
    def test_set_limit_5gb(self, client, super_headers):
        r = client.put(f"{API}/superadmin/storage-limit",
                       headers=super_headers, json={"storage_limit_gb": 5})
        assert r.status_code == 200, r.text
        acc = client.get(f"{API}/superadmin/account", headers=super_headers).json()
        assert acc["storage_limit_bytes"] == 5 * 1024 * 1024 * 1024

    def test_set_limit_unlimited(self, client, super_headers):
        r = client.put(f"{API}/superadmin/storage-limit",
                       headers=super_headers, json={"storage_limit_gb": 0})
        assert r.status_code == 200
        acc = client.get(f"{API}/superadmin/account", headers=super_headers).json()
        assert acc["storage_limit_bytes"] == 0

    def test_set_limit_requires_auth(self, client):
        r = client.put(f"{API}/superadmin/storage-limit",
                       json={"storage_limit_gb": 10})
        assert r.status_code in (401, 403)


# -------- suspend / reactivate flow --------
class TestSuspendFlow:
    """End-to-end: suspend → verify 423 on admin/share → settings still works → reactivate."""

    def test_full_cycle(self, client, super_headers):
        # 1. Confirm we start active.
        assert client.get(f"{API}/settings").json()["suspended"] is False

        # 2. Suspend.
        r = client.post(f"{API}/superadmin/suspend", headers=super_headers,
                        json={"message": "TEST_ paused for billing."})
        assert r.status_code == 200, r.text
        try:
            # 3. settings still works, flag set.
            s = client.get(f"{API}/settings")
            assert s.status_code == 200
            sj = s.json()
            assert sj["suspended"] is True
            assert "TEST_" in sj["suspend_message"]

            # 4. admin endpoints return 423.
            assert client.get(f"{API}/admin/check-setup").status_code == 423
            assert client.post(
                f"{API}/admin/login",
                json={"username": CUST_USER, "password": CUST_PASS}
            ).status_code == 423

            # 5. Share endpoint returns 423.
            assert client.post(
                f"{API}/share/some-fake-token/access", json={"password": ""}
            ).status_code == 423

            # 6. Superadmin still works.
            assert client.get(f"{API}/superadmin/account",
                              headers=super_headers).status_code == 200
        finally:
            # 7. Reactivate (always, even on assert failure).
            rr = client.post(f"{API}/superadmin/reactivate", headers=super_headers)
            assert rr.status_code == 200

        # 8. Post-reactivate, admin works again.
        s2 = client.get(f"{API}/settings").json()
        assert s2["suspended"] is False
        assert client.get(f"{API}/admin/check-setup").status_code == 200
        login = client.post(f"{API}/admin/login",
                            json={"username": CUST_USER, "password": CUST_PASS})
        assert login.status_code == 200


# -------- delete instance (API-only; do NOT actually wipe) --------
class TestDeleteInstance:
    def test_missing_confirm_rejected(self, client, super_headers):
        # FastAPI returns 422 for missing required query param; the explicit 400 path
        # is exercised by test_wrong_confirm_rejected. Accept either as a rejection.
        r = client.delete(f"{API}/superadmin/instance", headers=super_headers)
        assert r.status_code in (400, 422)

    def test_wrong_confirm_rejected(self, client, super_headers):
        r = client.delete(f"{API}/superadmin/instance?confirm=delete",
                          headers=super_headers)
        assert r.status_code == 400

    def test_requires_auth(self, client):
        r = client.delete(f"{API}/superadmin/instance?confirm=DELETE")
        assert r.status_code in (401, 403)


# -------- regression: customer admin & branding still work --------
class TestRegression:
    def test_customer_login(self, client):
        r = client.post(f"{API}/admin/login",
                        json={"username": CUST_USER, "password": CUST_PASS})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_settings_branding_fields(self, client):
        d = client.get(f"{API}/settings").json()
        for k in ("business_name", "accent_color", "platform_credit",
                  "has_custom_logo", "suspended"):
            assert k in d
        assert d["business_name"] == "Aurora Studios"
        assert d["platform_credit"] == "App designed & hosted by Weddings By Mark"
