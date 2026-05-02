# CAMP-RISK — Campus Risk Assessment System

Django REST API (**`backend/`**) plus Vite/React SPA (repo **`src/`**). Used for SSIO/officer dashboards, guard incident reporting, and risk assessment workflows.

## Staging / production (Internet-accessible acceptance testing)

Hosting is commonly split on **Render** (or similar):

| Service | Role | You must set |
|--------|------|----------------|
| **Web Service** | Django API (Gunicorn) | `SECRET_KEY`, `DATABASE_URL` (if Postgres), `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`; avoid `DEBUG` in production |
| **Static Site** | Built SPA (`npm run build:app`, publish **`dist/`**) | **`VITE_API_URL`** = full `https://` URL of the API (**no trailing path**) |

Replace with your deployed URLs:

- **Staging / beta site (SPA):** `https://<your-static-site>.onrender.com`
- **Staging / beta API:** `https://<your-api-service>.onrender.com`

Fixed **SSIO bootstrap account** (code): username `Admin`, password `Admin@123`, sign-in role **SSIO Officer / Administrator**. Guards are created under **Manage Security Personnel**.

> **Tester access:** Provide the static URL credentials test accounts only; rotate `SECRET_KEY` / DB if you recycle the environment.

## Related documentation

| Document | Purpose |
|----------|---------|
| [docs/DEPLOYMENT_AND_TESTING.md](docs/DEPLOYMENT_AND_TESTING.md) | Merge history snapshots, release notes, evidence checklist, reflection — export to **`Group#_DeployStage.pdf`** |
| [docs/ACCEPTANCE_TEST_PLAN.md](docs/ACCEPTANCE_TEST_PLAN.md) | Alpha vs beta scopes, **test cases**, systematic feedback (**Execute / Re-execute**) |
| [render.yaml](render.yaml) | Blueprint sketch for API + Postgres (adjust names/regions) |

## Git releases (course / acceptance)

Annotated tags (**alpha**, **beta**) mark internal vs external readiness. See GitHub → **Releases** (or Tags) + `docs/DEPLOYMENT_AND_TESTING.md` for notes.

```bash
git tag -n9 alpha
git tag -n9 beta
```

## Local development

**Backend**

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend** (expects API at `http://127.0.0.1:8000` via Vite proxy)

```bash
npm install
npm run dev        # SPA: http://localhost:5173
```

Production-style SPA build:

```bash
npm run build:app
```

## Known limitations (staging)

- Report **photos** use `/media/` URLs; on split origins, images rely on cookie/session/browser behavior unless media is absolute or proxied — see ACCEPTANCE_TEST_PLAN risk items.
- **Bearer tokens** improve API auth when cookies are flaky across origins; testers should **refresh after deploy** and sign in again.

## Repo / ownership

Upstream course org: **`2502-XU-ITCC15-1B`**. Maintain release notes when tagging so acceptance evidence stays traceable.
