# Deployment and testing document  
**Course deliverable base:** export this file to **`Group#_DeployStage.pdf`** (replace `Group#` with your section identifier)

**Project:** CAMP-RISK — Campus Risk Assessment System  
**Repository:** `2502-XU-ITCC15-1B/CAMP-RISK-Campus-Risk-Assessment-System` (and fork as applicable)

---

## 1. Executive summary

**Staging** is public on the Internet via **Render** (static site + API web service + optional Postgres). Acceptance testing follows **alpha** (internal) then **beta** (external) with **Execute → Re-execute** cycles per [ACCEPTANCE_TEST_PLAN.md](ACCEPTANCE_TEST_PLAN.md).

| Item | Value (fill in) |
|------|-----------------|
| Staging SPA URL | `https://________________.onrender.com` |
| Staging API URL | `https://________________.onrender.com` |
| Admin test account | Document separately (do not paste passwords in public PDFs) |
| Git tags | `alpha`, `beta` |

---

## 2. Merge history and commit logs

**Instructions:** paste output after each major integration, or attach full log in **Appendix A**.

### 2.1 Recent linear history (regenerate)

```bash
git log --oneline --decorate -30
```

**Snapshot (replace with your run output):**

```
(Fill: copy-paste from `git log` at tagging time)
```

### 2.2 Merge / integration notes

| Date | Description | Commits / PR |
|------|-------------|--------------|
| | Example: merge org `main` + Render fixes | `b5c1411`, … |
| | Example: cross-origin session + API URL validation | `c965c5a` |
| | Example: Bearer token auth for split hosts | `5c1f04a` |

---

## 3. Release notes (tagged releases)

### 3.1 Tag: `alpha` — internal testing

| Field | Content |
|-------|---------|
| Points to commit | `c965c5a` (see `git show alpha`) |
| Goal | Staging smoke + internal SSIO/team pass on split static/API |
| **Changes** | Render split deploy helpers; `VITE_API_URL` validation; production session `SameSite=None`; Unauthorized UX |
| **Known issues** | Admin **Manage Personnel** could still show “Authentication required” if session cookies blocked cross-site (mitigated in `beta`) |
| **Test focus** | Deploy variables, login, navigation, initial API smoke |

### 3.2 Tag: `beta` — external acceptance

| Field | Content |
|-------|---------|
| Points to commit | `5c1f04a` (see `git show beta`) |
| Goal | External beta + course acceptance evidence |
| **Changes** | Signed **Bearer** token at login; `Authorization` on authenticated API calls; PDF fetch via blob when token present |
| **Known issues** | `/media/` incident photos may need absolute URLs or policy alignment on some browsers; free-tier cold starts |
| **Test focus** | Full matrix in `ACCEPTANCE_TEST_PLAN.md`; feedback form export |

**View tag messages locally**

```bash
git show alpha --no-patch
git show beta --no-patch
```

---

## 4. Evidence of testing

### 4.1 Screenshots index (fill)

| # | Description | File / link |
|---|-------------|-------------|
| 1 | Staging login | |
| 2 | Admin dashboard | |
| 3 | Manage Personnel success | |
| 4 | Guard submit report | |
| 5 | Beta feedback form (submissions or setup) | |

### 4.2 Logs index (fill)

| # | Source | File / link |
|---|--------|-------------|
| 1 | Render API deploy success | |
| 2 | Render static deploy success | |
| 3 | Sample API log (redacted) | |

### 4.3 User feedback summary (beta)

| Response # | Theme | Severity | Action |
|------------|-------|----------|--------|
| | | | |

---

## 5. Appendices

### Appendix A — Raw `git log` / `git log --graph`

*(Attach multi-page export if required.)*

### Appendix B — Configuration (redacted)

| Key | Service | Set? (Y/N) | Notes |
|-----|---------|------------|-------|
| `SECRET_KEY` | API | Y | Never paste value |
| `DATABASE_URL` | API | Y/N | Postgres vs SQLite |
| `CORS_ALLOWED_ORIGINS` | API | Y | SPA `https://` origin |
| `CSRF_TRUSTED_ORIGINS` | API | Y | Same as CORS SPA |
| `VITE_API_URL` | Static **build** | Y | API `https://` base |
| `DEBUG` | API | Omit / N | |

### Appendix C — Tester handout (text for betainvite)

Paste your “how to login, what to try, feedback link” prose here.

---

## 6. Reflection *(required narrative)*

**Guidance:** ¾–1 page. Address insights, successes, improvements.

*(Fill)*

### 6.1 Insights

-

### 6.2 Successes

-

### 6.3 Areas for improvement

-

### 6.4 Process improvements (deploy / QA)

-

---

**Document prepared for:** ITCC15 / Group# ______  
**Editors:** ______  
**Last updated:** ______
