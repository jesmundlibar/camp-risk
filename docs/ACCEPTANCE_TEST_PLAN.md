# Acceptance test plan — CAMP-RISK  
**Modes:** Alpha (internal) → Beta (external) • **Loops:** Execute → evaluate → fix → **Re-execute**

Replace **`Group#`**, tutor name, URLs, dates, and owner names wherever noted.

---

## 1. Objectives

| Phase | Audience | Goal |
|-------|-----------|------|
| **Alpha** | Team + lab / SSIO insiders | Shake out regressions, deploy/config errors, blocking defects before outsiders see the site. |
| **Beta** | Selected external users | Validate usability, role clarity, and stability; collect systematic feedback before final submission. |

**Exit criteria (both phases):** all **P1** scenarios pass **Execute** + **Re-execute** after fixes (see §4 severity).

---

## 2. Roles & credentials (testing only)

Document real values in your evidence bundle (never commit secrets to README).

| Persona | How to obtain | Purpose |
|---------|----------------|---------|
| **SSIO / Admin** | Built-in admin flow | Personnel, dashboards, assessments, approvals |
| **Security Guard** | Admin creates guard in **Manage Personnel** | Submit/edit own reports |

---

## 3. Embedded / systematic beta feedback (“tools like embedded feedback forms”)

Pick **one** channel and stick to it for analyzable data.

### Option A — Google Forms (recommended)

1. Form fields: scenario ID, severity (blocking / annoying / cosmetic), repro steps, browser/device, screenshots optional.
2. Share link on beta instructions page and **pinned chat**.
3. Optional embed in static site: add an **“Beta feedback”** link in the login footer (or post-login help) opening the form in a new tab — avoids iframe cookie issues on static hosting.

### Option B — Formspree / Tally / Microsoft Forms

Same structure; export CSV for Appendix D.

### Option C — GitHub Issues (internal beta)

Label `beta-feedback`; link from tester handout.

**Execute / Re-execute:**  
- **Execute** = first full pass of §4 with build **B₁**.  
- **Re-execute** = rerun **failed P1 scenarios only** plus **spot-check PASS** regressions after patch **B₂**.

Record: build ID/tag, tester ID, PASS/FAIL, attachment links.

---

## 4. Test cases (minimal matrix — extend per rubric)

**Environment column:** `[Alpha: API+Static URLs]` `[Beta: same + tag beta]`.

**Severity:** **P1** blocking / compliance / safety of data • **P2** major usability • **P3** cosmetic.

### 4.1 Deployment & connectivity

| ID | Scenario | Steps | Expected | Phase |
|----|-----------|-------|----------|-------|
| D-01 | SPA loads | Open static HTTPS URL | Login page renders, no blank console explosion | Alpha→Beta |
| D-02 | API health | GET `/api/health/` | OK JSON/status as implemented | Alpha |
| D-03 | Wrong API URL | Simulate missing `VITE_API_URL` (local only) | Clear error, no fake “login success” | Alpha |

### 4.2 Authentication & sessions

| ID | Scenario | Steps | Expected | Phase |
|----|-----------|-------|----------|-------|
| A-01 | Admin login | Admin + SSIO role + correct password | Dashboard, no Unauthorized loop | Alpha→Beta |
| A-02 | Wrong role | Admin + Guard role | Readable error message | Alpha→Beta |
| A-03 | Bad password | Wrong password | Invalid credentials messaging | Beta |
| A-04 | Guard login | Guard user + Guard role | Guard dashboard | Alpha→Beta |
| A-05 | Persistence | Reload after login | Still logged (token/session per design) | Alpha→Beta |
| A-06 | Logout | Logout then hit protected route | Redirect / login | Alpha→Beta |

### 4.3 Admin critical path

| ID | Scenario | Steps | Expected | Phase |
|----|-----------|-------|----------|-------|
| M-01 | Personnel list | Open Manage Personnel | List loads (**no “Authentication required”**) | Alpha→Beta |
| M-02 | Add guard | Valid form submit | Guard appears | Alpha→Beta |
| M-03 | Duplicate user | Duplicate username | Field/server error readable | Beta |
| M-04 | Dashboard summary | Filters / defaults | KPIs load without endless spinners | Beta |

### 4.4 Guard critical path

| ID | Scenario | Steps | Expected | Phase |
|----|-----------|-------|----------|-------|
| G-01 | New report | Submit minimal valid report | Confirmation + visible in lists | Alpha→Beta |
| G-02 | Photo upload | Attach image (if used) | Survives round-trip; note cross-origin media caveat | Alpha→Beta |

### 4.5 Officer / assessment (if in scope)

| ID | Scenario | Steps | Expected | Phase |
|----|-----------|-------|----------|-------|
| R-01 | Open report | From admin queue | Detail loads | Beta |
| R-02 | Risk assessment | Save assessment | State persists; PDF if in scope | Beta |

### 4.6 Non-functional (spot)

| N-01 | Mobile width | Resize / device | Usable forms | Beta |
| N-02 | Chrome + Edge | Same P1 subset | Consistent | Beta |

---

## 5. Evidence pack (for PDF + appendices)

For each **Execute** and **Re-execute** cycle, collect:

| Evidence | Contents |
|-----------|----------|
| **Screenshots** | Login OK, Unauthorized (if reproduced pre-fix), Manage Personnel OK, Guard submit, Beta form responses |
| **Logs** | Render **API** build + deploy excerpts; **SPA** deploy; `/api/` 4xx sample if diagnosing |
| **Feedback export** | CSV/PDF export from Forms or Issue list screenshot |
| **Config redaction** | Table of keys only (no secrets): `VITE_*`, presence of `CORS_*`, `DATABASE_URL` linked Y/N |

Filename convention: `Group#_ALPHA_YYYYMMDD_HHMM_<id>_PASS.png`

---

## 6. Reporting template (per run)

```
Run: Alpha | Beta (circle)
Git tag / commit: _______
Tester: _______
Browser: _______

| Case | Result | Notes / link |
|------|--------|--------------|
| A-01 | PASS | |
| M-01 | FAIL → fixed in 5c1f04a | screenshot before/after |

Re-execute (date): _____   Cases rerun: _____
```

---

## 7. Open risks (document honestly)

- **Media / photos** on split Render hosts may require absolute URLs or cookie alignment — log as known issue if observed.
- **Free-tier sleep:** first request cold start — note in beta instructions.

---

## Sign-off (optional)

| Role | Name | Signature / date |
|------|------|------------------|
| Technical lead | | |
| Product / SSIO rep | | |
