/**
 * API base: leave unset in dev so Vite proxies `/api` and `/media` to Django (127.0.0.1:8000).
 * Set `VITE_API_URL` when the frontend and API are on different hosts.
 */
export function apiUrl(path: string): string {
  const prefix = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
  if (prefix) {
    return `${prefix}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
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
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to load reports (${res.status})`);
  }
  const data = (await res.json()) as { reports: ApiReport[] };
  return data.reports ?? [];
}

export async function fetchReport(reportId: string): Promise<ApiReport | null> {
  const path = `/api/reports/${encodeURIComponent(reportId)}/`;
  const res = await fetch(apiUrl(path));
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to load report (${res.status})`);
  }
  return (await res.json()) as ApiReport;
}

export async function submitIncidentReport(form: FormData): Promise<ApiReport> {
  const res = await fetch(apiUrl('/api/reports/'), {
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
