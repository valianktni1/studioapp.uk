# PRD — White-Label Wedding Gallery (Studioapps)

## Original Problem Statement
Fork an existing, fully working wedding photography gallery app (GitHub: valianktni1/180226galleryrepo) into a white-label resale version. Each photographer is deployed as a SEPARATE Docker Compose stack (own MongoDB + upload dir + subdomain like benparry.studioapp.uk). Make all "Weddings By Mark" branding and the hardcoded gold (#D4AF37) configurable per customer, keep a fixed platform credit, and add a platform-owner Super Admin to suspend/reactivate/limit/delete each instance for non-payment. Do NOT break existing features.

## Architecture
- FastAPI (`backend/server.py`, /api prefix) + React (CRA/craco) + MongoDB (motor). Auth = bcrypt + PyJWT (HS256, Bearer tokens). FFmpeg/VAAPI transcoding, video.js, nginx-video sidecar — all preserved.
- Branding stored in `settings` collection (key="branding"); platform state in settings (key="platform").
- Per-instance Super Admin seeded from env (SUPERADMIN_USERNAME/PASSWORD), role "superadmin".

## User Personas
- **Photographer (customer admin)** — manages galleries, shares, branding for their studio.
- **Couples/guests** — view/download photos via share links.
- **Platform owner (super admin = Weddings By Mark)** — controls each customer instance.

## Core Requirements (static)
- White-label: business name, logo, accent colour, contact email, website per customer.
- Fixed platform credit footer on every page: "App designed & hosted by Weddings By Mark".
- Super Admin: view account + storage, suspend/reactivate (instant kill-switch), storage limit (blocks uploads), delete instance data.
- Preserve all existing functionality.

## Implemented (2026-06)
- Backend: `GET /api/settings` (public, incl. suspended flag), `PUT /api/admin/settings`, logo `POST/DELETE /api/admin/settings/logo` + `GET /api/settings/logo`; setup wizard accepts business_name + accent_color.
- Super Admin: `/api/superadmin/login|account|suspend|reactivate|storage-limit|instance`; env-seeded idempotent; suspension middleware returns 423 for `/api/admin/*` + `/api/share/*` (allows `/api/settings`, `/api/superadmin/*`); storage-limit enforced on admin + guest uploads.
- Frontend: `BrandingProvider` sets CSS vars `--brand` / `--brand-rgb` from accent; `BrandMark` shows uploaded logo or a text wordmark (no original-brand leak); `PlatformFooter`; `SuspendedNotice`; Branding tab in Admin Settings; extended setup wizard; SuperAdminLogin + SuperAdminDashboard at `/superadmin`. All hardcoded #D4AF37 → `var(--brand)`, rgba(212,175,55,x) → `rgba(var(--brand-rgb),x)`.
- Verified by testing agent (iteration_1 branding 16/16; iteration_2 super admin — all critical/UI/integration pass).

## Backlog
- P1: Add data-testids to customer admin login inputs (login form currently uses login-username/password/submit-btn).
- P2: Rename suspend request body `message` → `suspend_message` for contract consistency.
- P2: Static `public/1.How_To_Choose_Your_Favourites.html` help doc still has Mark-specific copy (downloadable; not auto-shown) — make generic if reused.
- P2: Show storage usage to the customer admin too; email alerts near limit.

## Next Tasks
- Confirm docker-compose per-tenant template documents new env vars (JWT_SECRET, SUPERADMIN_USERNAME/PASSWORD).
- Optional: superadmin password-change UI.
