/**
 * API base: leave unset in dev so Vite proxies `/api` and `/media` to Django (127.0.0.1:8000).
 * Set `VITE_API_URL` when the frontend and API are on different hosts.
 */
const API_TOKEN_KEY = 'camp_risk_api_token';

/** Prefer localStorage so the token is shared across tabs; migrate legacy sessionStorage. */
function getStoredApiToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromLocal = localStorage.getItem(API_TOKEN_KEY);
    if (fromLocal) return fromLocal;
    const legacy = sessionStorage.getItem(API_TOKEN_KEY);
    if (legacy) {
      localStorage.setItem(API_TOKEN_KEY, legacy);
      sessionStorage.removeItem(API_TOKEN_KEY);
      return legacy;
    }
  } catch {
    /* private mode etc. */
  }
  return null;
}

export function clearApiToken(): void {
  try {
    localStorage.removeItem(API_TOKEN_KEY);
    sessionStorage.removeItem(API_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function setApiToken(token: string): void {
  try {
    localStorage.setItem(API_TOKEN_KEY, token);
    sessionStorage.removeItem(API_TOKEN_KEY);
  } catch {
    try {
      sessionStorage.setItem(API_TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  }
}

/** Human hint when Bearer/session is gone (deploy, SECRET_KEY rotation, stale tab state). */
function apiErrorHint(res: Response, body: Record<string, unknown>, fallback: string): string {
  const raw = typeof body.error === 'string' ? body.error : fallback;
  if (res.status === 401 && /authentication required/i.test(raw)) {
    return `${raw} Use Logout then sign in again. If Render rotated SECRET_KEY or you opened a new tab before this update, tokens must be refreshed.`;
  }
  return raw;
}

/** Session cookies plus Bearer token (needed when static site and API are on different hosts). */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  const t = getStoredApiToken();
  if (t) headers.set('Authorization', `Bearer ${t}`);
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

/** Ensure incident images load when the API returns `/media/...` and the SPA is on another host. */
export function ensureMediaSrc(url: string | null | undefined): string | null {
  if (url == null || typeof url !== 'string') return null;
  const u = url.trim();
  if (!u) return null;
  if (/^(https?:|blob:|data:)/i.test(u)) return u;
  const prefix = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
  if (u.startsWith('/') && prefix) return `${prefix}${u}`;
  return u;
}

export function assessmentPdfUrl(reportId: string): string {
  return apiUrl(`/api/reports/${encodeURIComponent(reportId)}/assessment-pdf/`);
}

export interface ApiUser {
  id: string;
  username: string;
  role: 'guard' | 'admin' | 'director';
  fullName: string;
}

function isValidApiUser(x: unknown): x is ApiUser {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.username === 'string' &&
    (o.role === 'admin' || o.role === 'guard' || o.role === 'director') &&
    typeof o.fullName === 'string'
  );
}

export async function apiLogin(
  username: string,
  password: string,
  role: 'guard' | 'admin' | 'director',
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
  return { id: raw.id as string, username: raw.username as string, role: raw.role as ApiUser['role'], fullName: raw.fullName as string };
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

export interface ApiHazardRiskBreakdownRow {
  hazard?: string;
  specific_risk: string;
  affected_area?: string;
  likelihood: number;
  severity: number;
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
  mitigation_actions: Array<{ description?: string; due_date?: string; dueDate?: string; assigned_to?: string }>;
  hazard_risk_breakdown?: ApiHazardRiskBreakdownRow[];
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

export interface GuardReportTallyRow {
  submitted_by_user_id: string;
  guard_name: string;
  report_count: number;
}

export interface DashboardSummary {
  pending_count: number;
  open_risks_count: number;
  overdue_actions_count: number;
  mitigation_tracking?: MitigationTracking;
  guard_report_tally?: GuardReportTallyRow[];
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
  /** Bullet mask for the password column (length matches stored copy when present). */
  passwordDisplay?: string;
  /** Last password set via Manage Personnel (admin API only); empty for older accounts until next save. */
  passwordPlain?: string;
  dateAdded: string;
  status: 'Active' | 'Inactive';
}

export async function fetchPersonnel(): Promise<ApiPersonnelRow[]> {
  const res = await authFetch(apiUrl('/api/personnel/'), {});
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(apiErrorHint(res, body, 'Could not load personnel'));
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
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(apiErrorHint(res, body, 'Could not add personnel'));
  }
  return body as ApiPersonnelRow;
}

export async function deletePersonnel(userId: string): Promise<void> {
  const res = await authFetch(apiUrl(`/api/personnel/${encodeURIComponent(userId)}/`), {
    method: 'DELETE',
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(apiErrorHint(res, body, 'Could not delete personnel'));
  }
}

/** Update guard profile; server requires a new password (8+ chars) whenever profile fields are updated. */
export async function updatePersonnel(
  userId: string,
  payload: { username: string; fullName: string; email: string; password: string },
): Promise<ApiPersonnelRow> {
  const body: Record<string, string> = {
    username: payload.username.trim(),
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    password: payload.password.trim(),
  };
  const res = await authFetch(apiUrl(`/api/personnel/${encodeURIComponent(userId)}/`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const resBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(apiErrorHint(res, resBody, 'Could not update personnel'));
  }
  return resBody as ApiPersonnelRow;
}

/** Disable or re-enable a guard account (preserves incident history; they cannot sign in while disabled). */
export async function setPersonnelActive(userId: string, active: boolean): Promise<ApiPersonnelRow> {
  const res = await authFetch(apiUrl(`/api/personnel/${encodeURIComponent(userId)}/`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(apiErrorHint(res, body, 'Could not update personnel status'));
  }
  return body as ApiPersonnelRow;
}

export interface GoogleSheetsBackupInfo {
  backup_enabled: boolean;
  configured: boolean;
  view_url: string | null;
}

/** Admin: URL to open the backup Google Sheet (from API env, or Vite env if API is not configured). */
export async function fetchGoogleSheetsBackupInfo(): Promise<GoogleSheetsBackupInfo> {
  const viteBrowser = (import.meta.env.VITE_GOOGLE_SHEETS_BROWSER_URL as string | undefined)?.trim();
  const viteId = (import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID as string | undefined)?.trim();
  const clientFallback = (): GoogleSheetsBackupInfo | null => {
    if (viteBrowser) {
      return { backup_enabled: false, configured: true, view_url: viteBrowser };
    }
    if (viteId) {
      return {
        backup_enabled: false,
        configured: true,
        view_url: `https://docs.google.com/spreadsheets/d/${viteId}/edit`,
      };
    }
    return null;
  };

  let res: Response;
  try {
    res = await authFetch(apiUrl('/api/admin/google-sheets-backup/'), {});
  } catch {
    const fb = clientFallback();
    if (fb) return fb;
    throw new Error('Could not reach the API to load backup spreadsheet settings.');
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 || res.status === 403) {
    throw new Error('SSIO or Director session required to load backup spreadsheet settings.');
  }
  if (!res.ok) {
    const fb = clientFallback();
    if (fb) return fb;
    throw new Error(typeof body.error === 'string' ? body.error : 'Could not load backup spreadsheet info');
  }

  const primary: GoogleSheetsBackupInfo = {
    backup_enabled: body.backup_enabled === true,
    configured: body.configured === true,
    view_url: typeof body.view_url === 'string' && body.view_url.length > 0 ? body.view_url : null,
  };
  const fb = clientFallback();
  if (!primary.configured && fb) {
    return {
      backup_enabled: primary.backup_enabled,
      configured: true,
      view_url: fb.view_url,
    };
  }
  return primary;
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
    throw new Error('You need an SSIO or Director session to load the dashboard summary.');
  }
  if (!res.ok) {
    throw new Error(`Failed to load dashboard (${res.status})`);
  }
  return (await res.json()) as DashboardSummary;
}

export interface ApiActivityLogEntry {
  id: number;
  report_id: string;
  created_at: string;
  from_status: string;
  to_status: string;
  from_status_display: string;
  to_status_display: string;
  changed_by: string;
  note: string;
}

/** Recent report status transitions (SSIO and Director read-only). */
export async function fetchReportActivityLog(limit = 80): Promise<ApiActivityLogEntry[]> {
  const url = new URL(apiUrl('/api/reports/activity-log/'), window.location.origin);
  url.searchParams.set('limit', String(limit));
  const res = await authFetch(url.toString(), {});
  if (res.status === 401 || res.status === 403) {
    throw new Error('You need an SSIO or Director session to load the activity log.');
  }
  if (!res.ok) {
    throw new Error(`Failed to load activity log (${res.status})`);
  }
  const data = (await res.json()) as { entries?: ApiActivityLogEntry[] };
  return data.entries ?? [];
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
    engineering_controls: string;
    administrative_controls: string;
    ppe_controls: string;
    residual_risk: string;
    mitigation_actions: Array<{ description: string; due_date: string }>;
    mitigation_assigned_to?: string;
    likelihood?: number;
    severity?: number;
    hazard_risk_breakdown?: Array<{
      hazard: string;
      specific_risk: string;
      affected_area: string;
      likelihood: number;
      severity: number;
    }>;
  },
): Promise<{ ok: boolean; report_id: string; risk_score: number; risk_level: string; status_code: string }> {
  const res = await authFetch(apiUrl(`/api/reports/${encodeURIComponent(reportId)}/assessment/`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(apiErrorHint(res, body, 'Could not save assessment'));
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
  return !!getStoredApiToken();
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

export interface ApiNotificationRow {
  id: number;
  created_at: string;
  read: boolean;
  report_id: string;
  kind: string;
  title: string;
  body: string;
}

export async function fetchNotifications(): Promise<{ notifications: ApiNotificationRow[]; unread_count: number }> {
  const res = await authFetch(apiUrl('/api/notifications/'), {});
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(apiErrorHint(res, body, 'Could not load notifications'));
  }
  const rows = body.notifications;
  const notifications = Array.isArray(rows) ? (rows as ApiNotificationRow[]) : [];
  const unread = typeof body.unread_count === 'number' ? body.unread_count : 0;
  return { notifications, unread_count: unread };
}

export async function markNotificationRead(id: number): Promise<void> {
  const res = await authFetch(apiUrl(`/api/notifications/${id}/read/`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(apiErrorHint(res, body, 'Could not update notification'));
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await authFetch(apiUrl('/api/notifications/read-all/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(apiErrorHint(res, body, 'Could not mark notifications read'));
  }
}
