"""Backend tests for White-Label Branding feature.

Covers:
- First-run setup wizard (POST /api/admin/setup) with business_name + accent_color
- Public branding endpoint (GET /api/settings)
- Admin branding update (PUT /api/admin/settings)
- Logo upload / fetch / delete (POST, GET, DELETE /api/admin/settings/logo, GET /api/settings/logo)
- Existing auth (POST /api/admin/login) still works after setup
- Share creation flow (no-password share token retrieval)
"""
import io
import os
import re

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bridal-showcase-15.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "test123"
BUSINESS_NAME = "Aurora Studios"
ACCENT = "#7C3AED"


# ─── Fixtures ────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def setup_state(session):
    """Run setup if not already done; return token."""
    r = session.get(f"{API}/admin/check-setup", timeout=10)
    assert r.status_code == 200, r.text
    state = r.json()
    if not state.get("setup_complete"):
        r2 = session.post(
            f"{API}/admin/setup",
            json={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD,
                "business_name": BUSINESS_NAME,
                "accent_color": ACCENT,
            },
            timeout=15,
        )
        assert r2.status_code == 200, f"Setup failed: {r2.status_code} {r2.text}"
        body = r2.json()
        assert body.get("token")
        assert body.get("display_name") == BUSINESS_NAME
        return {"token": body["token"], "fresh_setup": True}
    # Already set up, login to get token
    r3 = session.post(
        f"{API}/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=10,
    )
    assert r3.status_code == 200, f"Login failed: {r3.status_code} {r3.text}"
    return {"token": r3.json()["token"], "fresh_setup": False}


@pytest.fixture
def auth_headers(setup_state):
    return {"Authorization": f"Bearer {setup_state['token']}"}


# ─── Tests: Setup & public settings ──────────────────────────────────────
class TestSetupAndPublicSettings:
    def test_check_setup_endpoint_shape(self, session):
        r = session.get(f"{API}/admin/check-setup", timeout=10)
        assert r.status_code == 200
        assert "setup_complete" in r.json()

    def test_setup_completes_and_returns_token(self, setup_state):
        assert setup_state["token"]

    def test_public_settings_after_setup(self, session, setup_state):
        r = session.get(f"{API}/settings", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["business_name"] == BUSINESS_NAME, data
        assert re.match(r"^#[0-9A-Fa-f]{6}$", data["accent_color"]), data["accent_color"]
        assert data["platform_credit"] == "App designed & hosted by Weddings By Mark"
        # Only assert accent matches if fresh setup applied it
        if setup_state["fresh_setup"]:
            assert data["accent_color"].lower() == ACCENT.lower()

    def test_setup_idempotency_rejects_second_call(self, session, setup_state):
        r = session.post(
            f"{API}/admin/setup",
            json={"username": "x", "password": "y", "business_name": "z", "accent_color": "#000000"},
            timeout=10,
        )
        assert r.status_code == 400


# ─── Tests: Admin login still works ──────────────────────────────────────
class TestAdminLogin:
    def test_login_success(self, session, setup_state):
        r = session.post(
            f"{API}/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
            timeout=10,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("token")

    def test_login_invalid(self, session):
        r = session.post(
            f"{API}/admin/login",
            json={"username": ADMIN_USERNAME, "password": "wrong"},
            timeout=10,
        )
        assert r.status_code in (401, 403)


# ─── Tests: Branding update (PUT /api/admin/settings) ────────────────────
class TestBrandingUpdate:
    def test_put_requires_auth(self, session):
        r = session.put(f"{API}/admin/settings", json={"business_name": "Hacker"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_update_business_name_and_accent(self, session, auth_headers):
        new_name = "Aurora Studios Updated"
        new_accent = "#22C55E"
        r = session.put(
            f"{API}/admin/settings",
            json={"business_name": new_name, "accent_color": new_accent},
            headers=auth_headers,
            timeout=10,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["business_name"] == new_name
        assert data["accent_color"].lower() == new_accent.lower()
        # Verify persistence via public GET
        r2 = session.get(f"{API}/settings", timeout=10)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["business_name"] == new_name
        assert d2["accent_color"].lower() == new_accent.lower()
        # Restore canonical business name for following tests
        session.put(
            f"{API}/admin/settings",
            json={"business_name": BUSINESS_NAME, "accent_color": ACCENT},
            headers=auth_headers,
            timeout=10,
        )

    def test_invalid_accent_rejected(self, session, auth_headers):
        r = session.put(
            f"{API}/admin/settings",
            json={"accent_color": "not-a-hex"},
            headers=auth_headers,
            timeout=10,
        )
        assert r.status_code == 400

    def test_update_contact_and_website(self, session, auth_headers):
        r = session.put(
            f"{API}/admin/settings",
            json={"contact_email": "hello@aurora.test", "website": "https://aurora.test"},
            headers=auth_headers,
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["contact_email"] == "hello@aurora.test"


# ─── Tests: Logo upload / fetch / delete ─────────────────────────────────
PNG_BYTES = bytes.fromhex(
    "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
    "0000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
)


class TestBrandingLogo:
    def test_logo_404_when_absent(self, session, auth_headers):
        # Ensure no logo
        session.delete(f"{API}/admin/settings/logo", headers=auth_headers, timeout=10)
        r = session.get(f"{API}/settings/logo", timeout=10)
        assert r.status_code == 404

    def test_logo_upload_and_get(self, session, auth_headers):
        files = {"file": ("logo.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = session.post(f"{API}/admin/settings/logo", files=files, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["has_custom_logo"] is True
        assert data["logo_url"] and data["logo_url"].startswith("/api/settings/logo")

        # Public settings now also reflects it
        pub = session.get(f"{API}/settings", timeout=10).json()
        assert pub["has_custom_logo"] is True

        # Logo file is served
        r2 = session.get(f"{API}/settings/logo", timeout=10)
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")
        assert len(r2.content) > 0

    def test_logo_upload_requires_auth(self, session):
        files = {"file": ("logo.png", io.BytesIO(PNG_BYTES), "image/png")}
        r = session.post(f"{API}/admin/settings/logo", files=files, timeout=10)
        assert r.status_code in (401, 403)

    def test_logo_delete(self, session, auth_headers):
        r = session.delete(f"{API}/admin/settings/logo", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["has_custom_logo"] is False
        # Public settings reflects removal
        pub = session.get(f"{API}/settings", timeout=10).json()
        assert pub["has_custom_logo"] is False
        # File no longer served
        r2 = session.get(f"{API}/settings/logo", timeout=10)
        assert r2.status_code == 404

    def test_logo_rejects_non_image(self, session, auth_headers):
        files = {"file": ("evil.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")}
        r = session.post(f"{API}/admin/settings/logo", files=files, headers=auth_headers, timeout=10)
        assert r.status_code == 400


# ─── Tests: Share creation (gallery + no-password share token) ───────────
class TestShareFlow:
    def test_create_gallery_and_share(self, session, auth_headers):
        # Create a gallery
        folder_name = "TEST_BrandingShare 01.01.26"
        rg = session.post(
            f"{API}/admin/galleries",
            json={"folder_name": folder_name},
            headers=auth_headers,
            timeout=15,
        )
        assert rg.status_code in (200, 201), rg.text
        gallery = rg.json()
        gid = gallery.get("id")
        assert gid

        # Create a no-password share
        rs = session.post(
            f"{API}/admin/galleries/{gid}/shares",
            json={"gallery_id": gid, "access_level": "view", "label": "TEST_share"},
            headers=auth_headers,
            timeout=10,
        )
        assert rs.status_code in (200, 201), rs.text
        share = rs.json()
        token = share.get("token")
        assert token
        assert share.get("has_password") is False

        # Save for downstream UI test
        os.environ["TEST_SHARE_TOKEN"] = token
        with open("/tmp/test_share_token.txt", "w") as f:
            f.write(token)

        # Cleanup gallery
        session.delete(f"{API}/admin/galleries/{gid}", headers=auth_headers, timeout=15)
