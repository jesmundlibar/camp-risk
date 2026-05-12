import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Clock, MapPin, FileText, X } from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import { NotificationBell } from '../components/NotificationBell';
import { ensureMediaSrc, fetchReport, fetchReports, type ApiReport } from '../lib/api';

interface Report {
  id: string;
  time: string;
  location: string;
  date: string;
  hazard: string;
  status: string;
  /** Machine status from API (`pending`, `assessed`, …). */
  statusCode: string;
  hazardTypes: string[];
  description: string;
  submittedBy: string;
  building: string;
  floor: string;
  room: string;
  specificLocation: string;
  photoUrl?: string | null;
  informationRequestCount?: number;
}

function mapApiReport(r: ApiReport): Report {
  return {
    id: r.id,
    time: r.time,
    location: r.location,
    date: r.date,
    hazard: r.hazard,
    status: r.status,
    statusCode: r.status_code,
    hazardTypes: r.hazard_types,
    description: r.description,
    submittedBy: r.submitted_by,
    building: r.building,
    floor: r.floor,
    room: r.room,
    specificLocation: r.specific_location,
    photoUrl: r.photo_url,
    informationRequestCount: r.information_request_count ?? 0,
  };
}

export function GuardDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApiReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedReport) {
      setSelectedDetail(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void fetchReport(selectedReport.id)
      .then((d) => {
        if (!cancelled) setSelectedDetail(d);
      })
      .catch(() => {
        if (!cancelled) setSelectedDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedReport?.id]);

  const loadReports = useCallback(async () => {
    if (!user?.id || user.role !== 'guard') {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchReports();
      setReports(data.map(mapApiReport));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    void loadReports();
  }, [loadReports, location.pathname]);

  useEffect(() => {
    const rid = searchParams.get('report')?.trim();
    if (!rid || reports.length === 0) return;
    const found = reports.find((r) => r.id === rid);
    if (found) setSelectedReport(found);
  }, [searchParams, reports]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const recentSlice = reports.slice(0, 3);

  return (
    <div className="app-page">
      <AppShellHeader
        actions={
          <>
            <NotificationBell role="guard" />
            <button type="button" onClick={handleLogout} className="app-btn-outline">
              Logout
            </button>
          </>
        }
      />

      <main className="app-main">
        <div className="mb-6 sm:mb-8">
          <h2 className="app-page-title">Welcome, {user?.fullName}</h2>
          <p className="app-page-subtitle mt-1.5">Security guard workspace — file incidents and review your history.</p>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <p className="font-medium">Could not load reports</p>
            <p className="mt-1 text-amber-800">{loadError}</p>
            {(loadError.includes('Failed to fetch') || loadError.includes('NetworkError')) && (
              <p className="mt-2 text-amber-800">
                Start the Django API on port 8000 (e.g.{' '}
                <code className="bg-amber-100 px-1 rounded">python manage.py runserver</code> in{' '}
                <code className="bg-amber-100 px-1 rounded">backend</code>) while Vite is running, then refresh.
                Use the same host as Vite in the address bar (both <code className="bg-amber-100 px-1">localhost</code> or
                both <code className="bg-amber-100 px-1">127.0.0.1</code>) so your login session is sent.
              </p>
            )}
            {loadError.toLowerCase().includes('session') && (
              <p className="mt-2 text-amber-800">Sign out and sign in again on this same browser URL.</p>
            )}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/guard/report')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/guard/report')}
            className="cursor-pointer rounded-xl border border-blue-900/20 bg-gradient-to-br from-[var(--xu-blue)] via-blue-800 to-blue-950 p-7 text-white shadow-md transition-shadow duration-200 hover:shadow-lg lg:p-9"
          >
            <FileText className="mb-4 h-14 w-14 opacity-90 lg:h-16 lg:w-16" aria-hidden />
            <h3 className="mb-2 text-xl font-semibold tracking-tight lg:text-2xl">Submit incident report</h3>
            <p className="text-sm font-medium text-blue-100/95 lg:text-base">Open the reporting form</p>
          </div>

          <div className="app-card p-6 lg:p-7">
            <h3 className="mb-4 text-base font-semibold tracking-tight text-slate-900 lg:text-lg">Recent reports</h3>
            {loading ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : recentSlice.length === 0 ? (
              <p className="text-slate-500 text-sm">No reports yet. Submit your first incident report.</p>
            ) : (
              <div className="space-y-4">
                {recentSlice.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-start justify-between rounded-lg border border-slate-100 bg-slate-50/80 p-4 transition-colors hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[var(--xu-blue)]">{report.id}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{report.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{report.location}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="text-[var(--xu-blue)] text-sm hover:underline"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="app-card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h3 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">My report history</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="app-table-head">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-sm text-slate-600">Date</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-sm text-slate-600">Hazard</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-sm text-slate-600">Status</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-sm text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 sm:px-6 py-8 text-center text-slate-500 text-sm">
                      Loading…
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 sm:px-6 py-8 text-center text-slate-500 text-sm">
                      No report history.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="px-3 sm:px-6 py-4 text-sm text-slate-800">{report.date}</td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-slate-800">{report.hazard}</td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              report.status === 'Closed'
                                ? 'bg-green-100 text-green-800'
                                : report.status === 'Assessed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : report.status === 'In Progress'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {report.status}
                          </span>
                          {(report.informationRequestCount ?? 0) > 0 ? (
                            <span className="inline-flex px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-900">
                              SSIO info request
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            className="min-h-10 px-2 py-2 text-[var(--xu-blue)] text-sm hover:underline touch-manipulation inline-flex items-center"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/50 p-3 sm:p-4">
          <div className="my-auto flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10 max-h-[min(92dvh,40rem)]">
            <div className="sticky top-0 z-10 flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
              <h3 className="text-xl text-slate-800">Report Details</h3>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="self-end text-slate-400 hover:text-slate-600 transition-colors touch-manipulation min-h-10 min-w-10 inline-flex items-center justify-center rounded-md sm:self-center"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-600">Report ID</p>
                  <p className="text-lg text-[var(--xu-blue)]">{selectedReport.id}</p>
                </div>
                <span
                  className={`inline-flex px-3 py-1 text-sm rounded-full ${
                    selectedReport.status === 'Closed'
                      ? 'bg-green-100 text-green-800'
                      : selectedReport.status === 'Assessed'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedReport.status === 'In Progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {selectedReport.status}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Date</p>
                  <p className="text-slate-800">{selectedReport.date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Time</p>
                  <p className="text-slate-800">{selectedReport.time}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Hazard</p>
                <p className="text-slate-800">{selectedReport.hazard}</p>
              </div>

              {ensureMediaSrc(selectedReport.photoUrl ?? null) ? (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Photo</p>
                  <img
                    src={ensureMediaSrc(selectedReport.photoUrl)!}
                    alt="Report attachment"
                    className="max-h-48 rounded-md border border-slate-200"
                  />
                </div>
              ) : null}

              <div>
                <p className="text-sm text-slate-600 mb-2">Hazard Types</p>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.hazardTypes.map((type, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Description</p>
                <p className="text-slate-800 leading-relaxed">
                  {selectedReport.description || '—'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-slate-600">Location Details</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Building</p>
                    <p className="text-slate-800">{selectedReport.building}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Floor</p>
                    <p className="text-slate-800">{selectedReport.floor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Room</p>
                    <p className="text-slate-800">{selectedReport.room}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Specific Location</p>
                    <p className="text-slate-800">{selectedReport.specificLocation || '—'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Submitted By</p>
                <p className="text-slate-800">{selectedReport.submittedBy}</p>
              </div>

              {!detailLoading && selectedDetail?.assessment ? (
                <div className="border border-blue-200 bg-blue-50/70 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-blue-950">SSIO risk assessment</p>
                  <p className="text-sm text-slate-800">
                    Score <span className="font-semibold">{selectedDetail.assessment.risk_score}</span>
                    <span className="text-slate-500"> · </span>
                    {selectedDetail.assessment.risk_level}
                  </p>
                  {selectedDetail.assessment.mitigation_actions &&
                  selectedDetail.assessment.mitigation_actions.length > 0 ? (
                    <div className="text-sm text-slate-700">
                      <p className="text-slate-600 text-xs mb-1">First mitigation action</p>
                      <p className="font-medium">
                        {(selectedDetail.assessment.mitigation_actions[0] as { description?: string }).description ||
                          '—'}
                      </p>
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-600">
                    Open this report from the bell to see the summary here. Full PDF and officer tools are in the SSIO
                    portal.
                  </p>
                </div>
              ) : null}

              {detailLoading ? (
                <p className="text-sm text-slate-500">Loading SSIO messages…</p>
              ) : selectedDetail?.information_requests && selectedDetail.information_requests.length > 0 ? (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-950 mb-2">Messages from SSIO (information requests)</p>
                  <p className="text-xs text-amber-900 mb-3">
                    Reply by contacting SSIO or submitting an updated report.
                  </p>
                  <ul className="space-y-3 text-sm text-amber-950">
                    {selectedDetail.information_requests.map((ir) => (
                      <li key={ir.id} className="border-t border-amber-200/80 pt-3 first:border-t-0 first:pt-0">
                        <p className="text-xs text-amber-800 mb-1">
                          {new Date(ir.created_at).toLocaleString()}
                          {ir.payload.urgency ? ` · urgency: ${ir.payload.urgency}` : ''}
                        </p>
                        <p className="whitespace-pre-wrap">{ir.payload.specificQuestions ?? '—'}</p>
                        {ir.payload.otherInfo ? (
                          <p className="text-xs text-amber-900 mt-1">Other: {ir.payload.otherInfo}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6 sm:gap-3">
              {selectedReport.statusCode === 'pending' ? (
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedReport.id;
                    setSelectedReport(null);
                    navigate(`/guard/report/edit/${encodeURIComponent(id)}`);
                  }}
                  className="min-h-11 w-full px-4 py-2.5 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors touch-manipulation sm:w-auto"
                >
                  Update report
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="min-h-11 w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors touch-manipulation sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
