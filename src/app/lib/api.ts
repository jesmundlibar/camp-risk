/**
 * API base: leave unset in dev so Vite proxies `/api` and `/media` to Django (127.0.0.1:8000).
 * Set `VITE_API_URL` when the frontend and API are on different hosts.
 */
const API_TOKEN_KEY = 'camp_risk_api_token';

export function clearApiToken(): void {
  try {
    sessionStorage.removeItem(API_TOKEN_KEY);
  } catch {
    /* private mode etc. */
  }
}

function setApiToken(token: string): void {
  try {
    sessionStorage.setItem(API_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

/** Session cookies plus Bearer token (needed when static site and API are on different hosts). */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  try {
    const t = sessionStorage.getItem(API_TOKEN_KEY);
    if (t) headers.set('Authorization', `Bearer ${t}`);
  } catch {
    /* ignore */
  }
  return fetch(input, {
    credentials: 'include',
    ...init,
    headers,
  });
}

const fetchDefaults: RequestInit = {
  credentials: 'include',
};

export function apiUrl(path: string): string {
  const prefix = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
  if (prefix) {
    return `${prefix}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export function assessmentPdfUrl(reportId: string): string {
  return apiUrl(`/api/reports/${encodeURIComponent(reportId)}/assessment-pdf/`);
}

export interface ApiUser {
  id: string;
  username: string;
  role: 'guard' | 'admin';
  fullName: string;
}

function isValidApiUser(x: unknown): x is ApiUser {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.username === 'string' &&
    (o.role === 'admin' || o.role === 'guard') &&
    typeof o.fullName === 'string'
  );
}

export async function apiLogin(
  username: string,
  password: string,
  role: 'guard' | 'admin',
): Promise<ApiUser> {
  const res = await fetch(apiUrl('/api/auth/login/'), {
    ...fetchDefaults,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Login failed');
  }
  if (!isValidApiUser(body)) {
    throw new Error(
      'Could not reach the API. On Render, set VITE_API_URL to your backend base URL (for example https://your-api.onrender.com) in the static site build environment, rebuild, and redeploy.',
    );
  }
  const raw = body as Record<string, unknown>;
  const token = raw.authToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Login succeeded but API did not return authToken — redeploy the backend.');
  }
  setApiToken(token);
  return { id: raw.id as string, username: raw.username as string, role: raw.role as 'guard' | 'admin', fullName: raw.fullName as string };
}

export async function apiLogout(): Promise<void> {
  try {
    await authFetch(apiUrl('/api/auth/logout/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } finally {
    clearApiToken();
  }
}

export async function apiMe(): Promise<ApiUser | null> {
  const res = await authFetch(apiUrl('/api/auth/me/'), {});
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  const data = (await res.json().catch(() => ({}))) as { user?: unknown };
  const u = data.user ?? null;
  if (!u) return null;
  return isValidApiUser(u) ? u : null;
}

export interface ApiRiskAssessmentDetail {
  risk_classification: string;
  likelihood: number;
  severity: number;
  risk_score: number;
  risk_level: string;
  engineering_controls: string;
  administrative_controls: string;
  ppe_controls: string;
  residual_risk: string;
  mitigation_actions: Array<{ description?: string; due_date?: string; dueDate?: string }>;
  updated_at: string;
}

export interface ApiInformationRequestRow {
  id: number;
  created_at: string;
  payload: {
    requestType?: string;
    specificQuestions?: string;
    additionalPhotos?: boolean;
    measurements?: boolean;
    witnessStatements?: boolean;
    otherInfo?: string;
    urgency?: string;
  };
}

export interface ApiReport {
  id: string;
  hazard: string;
  hazard_types: string[];
  date: string;
  time: string;
  status: string;
  status_code: string;
  priority: string;
  location: string;
  guard: string;
  description: string;
  submitted_by: string;
  building: string;
  floor: string;
  room: string;
  specific_location: string;
  other_hazard: string;
  photo_url: string | null;
  created_at: string;
  information_request_count?: number;
  assessment?: ApiRiskAssessmentDetail | null;
  information_requests?: ApiInformationRequestRow[];
}

export async function fetchReports(params?: {
  submitted_by_user_id?: string;
  status?: string;
}): Promise<ApiReport[]> {
  const url = new URL(apiUrl('/api/reports/'), window.location.origin);
  if (params?.submitted_by_user_id) {
    url.searchParams.set('submitted_by_user_id', params.submitted_by_user_id);
  }
  if (params?.status) {
    url.searchParams.set('status', params.status);
  }
  const res = await authFetch(url.toString(), {});
  if (res.status === 401) {
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    throw new Error(`Failed to load reports (${res.status})`);
  }
  const data = (await res.json()) as { reports: ApiReport[] };
  return data.reports ?? [];
}

export async function fetchReport(reportId: string): Promise<ApiReport | null> {
  const path = `/api/reports/${encodeURIComponent(reportId)}/`;
  const res = await authFetch(apiUrl(path), {});
  if (res.status === 404) return null;
  if (res.status === 401) {
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    throw new Error(`Failed to load report (${res.status})`);
  }
  return (await res.json()) as ApiReport;
}

export async function submitIncidentReport(form: FormData): Promise<ApiReport> {
  const res = await authFetch(apiUrl('/api/reports/'), {
    method: 'POST',
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof body.error === 'string' ? body.error : 'Could not submit report';
    throw new Error(msg);
  }
  return body as ApiReport;
}

/** Guard-only: revise a Pending report they submitted (multipart, same fields as create). */
export async function updateGuardIncidentReport(reportId: string, form: FormData): Promise<ApiReport> {
  const path = `/api/reports/${encodeURIComponent(reportId)}/update/`;
  const res = await authFetch(apiUrl(path), {
    // POST required: Django only parses multipart into POST/FILES for POST, not PATCH.
    method: 'POST',
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof body.error === 'string' ? body.error : 'Could not update report';
    throw new Error(msg);
  }
  return body as ApiReport;
}

export interface MitigationTracking {
  total_actions: number;
  completed_actions: number;
  in_progress_actions: number;
  overdue_actions: number;
  completed_pct: number;
  in_progress_pct: number;
  overdue_pct: number;
}

export interface DashboardSummary {
  pending_count: number;
  open_risks_count: number;
  overdue_actions_count: number;
  mitigation_tracking?: MitigationTracking;
  open_risks: Array<{
    id: string;
    hazard: string;
    severity: string;
    status: string;
    score: number;
    location: string;
    dateAssessed: string;
  }>;
  overdue_actions: Array<{
    id: string;
    task: string;
    dueDate: string;
    daysOverdue: number;
    assignedTo: string;
    relatedRisk: string;
  }>;
  risk_register: Array<{ id: string; severity: string; status: string }>;
  hazard_frequency: Array<{ hazard: string; count: number }>;
  top_risk_types: Array<{ risk_type: string; count: number }>;
}

export interface ApiPersonnelRow {
  id: string;
  username: string;
  fullName: string;
  email: string;
  dateAdded: string;
  status: 'Active' | 'Inactive';
}

export async function fetchPersonnel(): Promise<ApiPersonnelRow[]> {
  const res = await authFetch(apiUrl('/api/personnel/'), {});
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : 'Could not load personnel');
  }
  const data = (await res.json()) as { personnel: ApiPersonnelRow[] };
  return data.personnel ?? [];
}

export async function createPersonnel(payload: {
  username: string;
  fullName: string;
  email: string;
  password: string;
}): Promise<ApiPersonnelRow> {
  const res = await authFetch(apiUrl('/api/personnel/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Could not add personnel');
  }
  return body as ApiPersonnelRow;
}

export async function deletePersonnel(userId: string): Promise<void> {
  const res = await authFetch(apiUrl(`/api/personnel/${encodeURIComponent(userId)}/`), {
    method: 'DELETE',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Could not delete personnel');
  }
}

export async function fetchDashboardSummary(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<DashboardSummary> {
  const url = new URL(apiUrl('/api/dashboard/summary/'), window.location.origin);
  if (params?.startDate) {
    url.searchParams.set('start_date', params.startDate);
  }
  if (params?.endDate) {
    url.searchParams.set('end_date', params.endDate);
  }
  const res = await authFetch(url.toString(), {});
  if (res.status === 401 || res.status === 403) {
    throw new Error('You need an administrator session to load the dashboard summary.');
  }
  if (!res.ok) {
    throw new Error(`Failed to load dashboard (${res.status})`);
  }
  return (await res.json()) as DashboardSummary;
}

export async function submitInformationRequest(
  reportId: string,
  payload: {
    requestType: string;
    specificQuestions: string;
    additionalPhotos: boolean;
    measurements: boolean;
    witnessStatements: boolean;
    otherInfo: string;
    urgency: string;
  },
): Promise<{ ok: boolean; id: number; report_id: string; message: string }> {
  const res = await authFetch(apiUrl(`/api/reports/${encodeURIComponent(reportId)}/request-info/`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof body.error === 'string' ? body.error : 'Could not save information request';
    throw new Error(msg);
  }
  return body as { ok: boolean; id: number; report_id: string; message: string };
}

export async function submitRiskAssessment(
  reportId: string,
  payload: {
    risk_classification: string;
    likelihood: number;
    severity: number;
    engineering_controls: string;
    administrative_controls: string;
    ppe_controls: string;
    residual_risk: string;
    mitigation_actions: Array<{ description: string; due_date: string }>;
  },
): Promise<{ ok: boolean; report_id: string; risk_score: number; risk_level: string; status_code: string }> {
  const res = await authFetch(apiUrl(`/api/reports/${encodeURIComponent(reportId)}/assessment/`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof body.error === 'string' ? body.error : 'Could not save assessment';
    throw new Error(msg);
  }
  return body as { ok: boolean; report_id: string; risk_score: number; risk_level: string; status_code: string };
}

async function assessmentPdfBlobUrl(reportId: string): Promise<string> {
  const res = await authFetch(apiUrl(`/api/reports/${encodeURIComponent(reportId)}/assessment-pdf/`));
  if (!res.ok) {
    throw new Error(`Could not load PDF (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

function tryHasStoredApiToken(): boolean {
  try {
    return !!sessionStorage.getItem(API_TOKEN_KEY);
  } catch {
    return false;
  }
}

/** Open printable PDF endpoint in a new tab for browser preview/print. */
export async function openAssessmentPdf(reportId: string): Promise<void> {
  let previewUrl = assessmentPdfUrl(reportId);
  let blobUrlToRevoke: string | null = null;
  if (tryHasStoredApiToken()) {
    try {
      blobUrlToRevoke = await assessmentPdfBlobUrl(reportId);
      previewUrl = blobUrlToRevoke;
    } catch {
      previewUrl = assessmentPdfUrl(reportId);
      blobUrlToRevoke = null;
    }
  }
  const preview = window.open(previewUrl, '_blank', 'noopener');
  if (preview) {
    if (blobUrlToRevoke) window.setTimeout(() => URL.revokeObjectURL(blobUrlToRevoke), 60_000);
    return;
  }
  window.location.assign(previewUrl);
  if (blobUrlToRevoke) window.setTimeout(() => URL.revokeObjectURL(blobUrlToRevoke), 60_000);
}

/** Download assessment PDF directly from endpoint. */
export async function downloadAssessmentPdf(reportId: string): Promise<void> {
  if (tryHasStoredApiToken()) {
    try {
      const blobUrl = await assessmentPdfBlobUrl(reportId);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${(reportId || 'report').replace(/[^\w.-]+/g, '_')}-risk-assessment.pdf`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    } catch {
      /* fallback to cookie-based GET */
    }
  }
  const url = assessmentPdfUrl(reportId);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(reportId || 'report').replace(/[^\w.-]+/g, '_')}-risk-assessment.pdf`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Open PDF and trigger browser print dialog. */
export async function printAssessmentPdf(reportId: string): Promise<void> {
  let url = assessmentPdfUrl(reportId);
  let revoke: string | null = null;
  if (tryHasStoredApiToken()) {
    try {
      revoke = await assessmentPdfBlobUrl(reportId);
      url = revoke;
    } catch {
      url = assessmentPdfUrl(reportId);
      revoke = null;
    }
  }
  const win = window.open(url, '_blank', 'noopener');
  if (!win) {
    window.location.assign(url);
    if (revoke) window.setTimeout(() => URL.revokeObjectURL(revoke), 60_000);
    return;
  }
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      // Ignore if browser blocks automated print.
    }
    if (revoke) window.setTimeout(() => URL.revokeObjectURL(revoke), 60_000);
  }, 900);
}

/** e.g. RPT-12-A1 → report RPT-12, 1-based action index */
export function parseMitigationActionRef(actionRef: string): { reportId: string; index1: number } | null {
  const m = /^RPT-(\d+)-A(\d+)$/i.exec((actionRef || '').trim());
  if (!m) return null;
  return { reportId: `RPT-${m[1]}`, index1: parseInt(m[2], 10) };
}

export async function extendMitigationDeadline(
  actionRef: string,
  payload: {
    newDueDate: string;
    extensionReason: string;
    justification: string;
    notifyTeam: boolean;
  },
): Promise<{ ok: boolean; action_ref: string; new_due_date: string; message: string }> {
  const parsed = parseMitigationActionRef(actionRef);
  if (!parsed) {
    throw new Error('Invalid action ID. Expected format like RPT-12-A1.');
  }
  const path = `/api/reports/${encodeURIComponent(parsed.reportId)}/extend-deadline/`;
  const res = await authFetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action_index: parsed.index1,
      new_due_date: payload.newDueDate,
      extension_reason: payload.extensionReason,
      justification: payload.justification,
      notify_team: payload.notifyTeam,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Could not extend deadline');
  }
  return body as { ok: boolean; action_ref: string; new_due_date: string; message: string };
}

export async function completeMitigationAction(
  actionRef: string,
): Promise<{ ok: boolean; action_ref: string; message: string; status_code: string }> {
  const path = `/api/mitigation/actions/${encodeURIComponent(actionRef)}/complete/`;
  const res = await authFetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Could not mark action as completed');
  }
  return body as { ok: boolean; action_ref: string; message: string; status_code: string };
}

export async function updateMitigationTracking(
  reportId: string,
  payload: {
    mitigationPlan: string;
    assignedTo: string;
    dueDate: string;
    status: string;
    notes: string;
  },
): Promise<{ ok: boolean; report_id: string; message: string; status_code: string }> {
  const res = await authFetch(apiUrl(`/api/reports/${encodeURIComponent(reportId)}/mitigation/`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mitigation_plan: payload.mitigationPlan,
      assigned_to: payload.assignedTo,
      due_date: payload.dueDate,
      action_status: payload.status,
      notes: payload.notes,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Could not save mitigation');
  }
  return body as { ok: boolean; report_id: string; message: string; status_code: string };
}
