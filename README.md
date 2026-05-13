# CAMP-RISK

Campus risk assessment app for Xavier SSIO: guards file incident reports, admins assess risk (HIRAC-style), dashboards and personnel management live in the UI.

Stack: Django in `backend/`, React + Vite in `src/`. Old `frontend/` folder is leftover; ignore it for day-to-day work.

---

## Deploying on Render (what we actually use)

Split into two services: a **Web Service** (Docker / Django + Gunicorn) and a **Static Site** (built SPA).

**Web service (API)** — set at least:

- `SECRET_KEY`
- `DATABASE_URL` — **must be on this service.** Django reads it here. If it’s missing, the app falls back to SQLite inside the container and data can vanish on restart. Don’t put `DATABASE_URL` on the static site; it doesn’t run Python.
- `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` — your static site URL(s), comma-separated if needed
- Turn off `DEBUG` for anything public

**Static site (SPA)** — after `npm run build:app`, publish `dist/`. Set:

- `VITE_API_URL` — full API base, e.g. `https://your-api.onrender.com` (no `/api` on the end unless you really meant to)
- Optional: `VITE_FEEDBACK_URL` — Google Form link; login page shows a beta feedback link when set

Swap in your real URLs instead of placeholders.

**Default admin login (dev / seeded):** user `Admin`, password `Admin@123`, role SSIO. Guards are added in **Manage Security Personnel**. Don’t ship those creds to a real class demo without changing them; rotate `SECRET_KEY` and the DB if you reuse an environment.

---

## “Not Found” when you refresh the SPA on Render

React routes (`/admin/dashboard`, etc.) aren’t real files on the CDN. Refreshing asks for a path that doesn’t exist.

Fix: Render dashboard → your **Static Site** → **Redirects / Rewrites** → add a **rewrite** (not redirect): source `/*`, destination `/index.html`. [Render docs on rewrites](https://render.com/docs/redirects-rewrites).

If you use a Blueprint, put the same idea under the static service in `render.yaml` (`routes` with rewrite to `/index.html`).

---

## `render.yaml`

There’s a sample [render.yaml](render.yaml) for API + Postgres; rename regions/services to match your group.

---

## Tags / versions

See [VERSIONING.md](VERSIONING.md). New tags look like `v0.2.0-beta.1`; older tags might still say `alpha` / `beta`.

```bash
git tag -l "v0.*"
git tag -n9 v0.1.0-beta.2
```

---

## Running it locally

Backend (from repo root):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Frontend — Vite proxies `/api` and `/media` to `http://127.0.0.1:8000`:

```bash
npm install
npm run dev
```

Open http://localhost:5173

Production-ish front build:

```bash
npm run build:app
```

---

## Quirks worth knowing

- Incident photos are served under `/media/`. If the SPA and API are on different origins, make sure media URLs resolve (the app tries to use absolute URLs when configured).
- Auth uses cookies plus a bearer token in **localStorage** so tabs behave consistently. If you rotate `SECRET_KEY` on Render, people need to sign in again.
- Google Sheets backup is optional; needs service account env vars on the API if you turn it on.

---

## Repo

Course org: [2502-XU-ITCC15-1B](https://github.com/2502-XU-ITCC15-1B). This repo tracks ITCC work; tag releases when your instructor wants proof of milestones.
