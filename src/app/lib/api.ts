/**
 * API base: leave unset in dev so Vite proxies `/api` and `/media` to Django (127.0.0.1:8000).
 * Set `VITE_API_URL` when the frontend and API are on different hosts.
 */
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

export interface ApiUser {
  id: string;
  username: string;
  role: 'guard' | 'admin';
  fullName: string;
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
  return body as ApiUser;
}

export async function apiLogout(): Promise<void> {
  await fetch(apiUrl('/api/auth/logout/'), {
    ...fetchDefaults,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

export async function apiMe(): Promise<ApiUser | null> {
  const res = await fetch(apiUrl('/api/auth/me/'), { ...fetchDefaults });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: ApiUser | null };
  return data.user ?? null;
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
  const res = await fetch(url.toString(), fetchDefaults);
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
  const res = await fetch(apiUrl(path), fetchDefaults);
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
  const res = await fetch(apiUrl('/api/reports/'), {
    ...fetchDefaults,
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
  const res = await fetch(apiUrl('/api/personnel/'), fetchDefaults);
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
  const res = await fetch(apiUrl('/api/personnel/'), {
    ...fetchDefaults,
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
  const res = await fetch(apiUrl(`/api/personnel/${encodeURIComponent(userId)}/`), {
    ...fetchDefaults,
    method: 'DELETE',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Could not delete personnel');
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(apiUrl('/api/dashboard/summary/'), fetchDefaults);
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
  const res = await fetch(apiUrl(`/api/reports/${encodeURIComponent(reportId)}/request-info/`), {
    ...fetchDefaults,
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
  const res = await fetch(apiUrl(`/api/reports/${encodeURIComponent(reportId)}/assessment/`), {
    ...fetchDefaults,
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
  const path = `/api/mitigation/actions/${encodeURIComponent(actionRef.trim())}/extend-deadline/`;
  const res = await fetch(apiUrl(path), {
    ...fetchDefaults,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
  const res = await fetch(apiUrl(`/api/mitigation/reports/${encodeURIComponent(reportId)}/tracking/`), {
    ...fetchDefaults,
    method: 'POST',
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
