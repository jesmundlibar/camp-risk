import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Clock, ExternalLink, Eye, FileSpreadsheet, LayoutDashboard, Lock } from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import {
  fetchDashboardSummary,
  fetchGoogleSheetsBackupInfo,
  fetchReportActivityLog,
  fetchReports,
  type ApiActivityLogEntry,
  type ApiReport,
  type GuardReportTallyRow,
  type MitigationTracking,
} from '../lib/api';

type AnalyticsWindow = 'all' | '7d' | '30d' | 'custom';

function statusBadgeClass(code: string) {
  switch (code) {
    case 'pending':
      return 'bg-amber-100 text-amber-900';
    case 'assessed':
      return 'bg-blue-100 text-blue-900';
    case 'in_progress':
      return 'bg-violet-100 text-violet-900';
    case 'closed':
      return 'bg-slate-200 text-slate-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function DirectorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [analyticsWindow, setAnalyticsWindow] = useState<AnalyticsWindow>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activity, setActivity] = useState<ApiActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [pendingReports, setPendingReports] = useState<ApiReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [openRisksCount, setOpenRisksCount] = useState(0);
  const [overdueActionsCount, setOverdueActionsCount] = useState(0);
  const [guardReportTally, setGuardReportTally] = useState<GuardReportTallyRow[]>([]);
  const [mitigationTracking, setMitigationTracking] = useState<MitigationTracking>({
    total_actions: 0,
    completed_actions: 0,
    in_progress_actions: 0,
    overdue_actions: 0,
    completed_pct: 0,
    in_progress_pct: 0,
    overdue_pct: 0,
  });
  const [backupSheet, setBackupSheet] = useState<{ url: string | null; configured: boolean }>({
    url: null,
    configured: false,
  });

  useEffect(() => {
    if (user?.role !== 'director') {
      setBackupSheet({ url: null, configured: false });
      return;
    }
    let cancelled = false;
    void fetchGoogleSheetsBackupInfo()
      .then((info) => {
        if (!cancelled) {
          setBackupSheet({ url: info.view_url, configured: info.configured });
        }
      })
      .catch(() => {
        if (!cancelled) setBackupSheet({ url: null, configured: false });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.id, location.pathname]);

  useEffect(() => {
    if (user?.role !== 'director') {
      setPendingReports([]);
      setReportsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setReportsLoading(true);
      try {
        const data = await fetchReports({ status: 'pending' });
        if (!cancelled) setPendingReports(data);
      } catch {
        if (!cancelled) setPendingReports([]);
      } finally {
        if (!cancelled) setReportsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, location.pathname]);

  useEffect(() => {
    if (user?.role !== 'director') {
      setActivity([]);
      return;
    }
    let cancelled = false;
    setActivityLoading(true);
    void fetchReportActivityLog(100)
      .then((rows) => {
        if (!cancelled) setActivity(rows);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, location.pathname]);

  const reloadDashboardSummary = useCallback(async () => {
    if (user?.role !== 'director') return;
    setSummaryLoading(true);
    try {
      const today = new Date();
      const toIso = (d: Date) => d.toISOString().slice(0, 10);
      let params: { startDate?: string; endDate?: string } | undefined;
      if (analyticsWindow === '7d') {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        params = { startDate: toIso(start), endDate: toIso(today) };
      } else if (analyticsWindow === '30d') {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        params = { startDate: toIso(start), endDate: toIso(today) };
      } else if (analyticsWindow === 'custom' && customStartDate && customEndDate) {
        params = { startDate: customStartDate, endDate: customEndDate };
      }

      const d = await fetchDashboardSummary(params);
      setOpenRisksCount(d.open_risks_count ?? 0);
      setOverdueActionsCount(d.overdue_actions_count ?? 0);
      setGuardReportTally(d.guard_report_tally ?? []);
      if (d.mitigation_tracking) setMitigationTracking(d.mitigation_tracking);
    } catch {
      setOpenRisksCount(0);
      setOverdueActionsCount(0);
      setGuardReportTally([]);
      setMitigationTracking({
        total_actions: 0,
        completed_actions: 0,
        in_progress_actions: 0,
        overdue_actions: 0,
        completed_pct: 0,
        in_progress_pct: 0,
        overdue_pct: 0,
      });
    } finally {
      setSummaryLoading(false);
    }
  }, [analyticsWindow, customEndDate, customStartDate, user?.role]);

  useEffect(() => {
    void reloadDashboardSummary();
  }, [reloadDashboardSummary, user?.id, location.pathname, analyticsWindow, customStartDate, customEndDate]);

  const handleLogout = () => {
    void logout();
    navigate('/');
  };

  if (user?.role !== 'director') {
    return null;
  }

  return (
    <div className="app-page">
      <AppShellHeader
        actions={
          <>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              View only
            </span>
            <button type="button" onClick={handleLogout} className="app-btn-outline">
              Logout
            </button>
          </>
        }
      />

      <main className="app-main">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-[var(--xu-blue)] shrink-0" aria-hidden />
              <h2 className="app-page-title">Director oversight</h2>
            </div>
            <p className="app-page-subtitle mt-1.5">
              Welcome, {user.fullName}. Monitor incidents, mitigation progress, and activity across the system.
            </p>
          </div>
        </div>

        <div className="app-card mb-5 border-l-4 border-l-[var(--xu-blue)] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 shrink-0 text-[var(--xu-blue)] mt-0.5" aria-hidden />
            <div className="min-w-0 text-sm text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900">Read-only account</p>
              <p className="mt-1">
                You can open reports and PDFs for review, but you cannot submit incidents, run assessments, change
                statuses, manage personnel, or alter any stored data. All changes remain with Security and SSIO roles.
              </p>
            </div>
          </div>
        </div>

        <div className="app-card mb-5 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                <div className="w-full min-w-0 sm:w-auto sm:min-w-[12rem]">
                  <label htmlFor="director-analytics-window" className="text-[11px] font-medium text-slate-500">
                    Analytics timeframe
                  </label>
                  <select
                    id="director-analytics-window"
                    value={analyticsWindow}
                    onChange={(e) => setAnalyticsWindow(e.target.value as AnalyticsWindow)}
                    className="mt-1 w-full min-h-9 rounded-md border border-slate-200/90 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm outline-none focus:border-[var(--xu-blue)]/50 focus:ring-1 focus:ring-[var(--xu-blue)]/25"
                  >
                    <option value="all">All time</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="custom">Custom range</option>
                  </select>
                </div>
                {analyticsWindow === 'custom' ? (
                  <>
                    <div className="min-w-0 flex-1 sm:max-w-[11rem]">
                      <label htmlFor="director-analytics-start" className="text-[11px] font-medium text-slate-500">
                        Start
                      </label>
                      <input
                        id="director-analytics-start"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="mt-1 w-full min-h-9 rounded-md border border-slate-200/90 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm"
                      />
                    </div>
                    <div className="min-w-0 flex-1 sm:max-w-[11rem]">
                      <label htmlFor="director-analytics-end" className="text-[11px] font-medium text-slate-500">
                        End
                      </label>
                      <input
                        id="director-analytics-end"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="mt-1 w-full min-h-9 rounded-md border border-slate-200/90 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm"
                      />
                    </div>
                  </>
                ) : null}
              </div>
              <p className="text-[11px] leading-snug text-slate-500">
                Summary cards and guard tally follow this range.
                {summaryLoading ? <span className="text-slate-400"> · Updating…</span> : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 sm:pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <button
                type="button"
                disabled={!backupSheet.configured || !backupSheet.url}
                title={
                  backupSheet.configured && backupSheet.url
                    ? 'Opens the backup Google Sheet in a new tab (read-only link).'
                    : 'Spreadsheet not configured on the server.'
                }
                onClick={() => {
                  if (backupSheet.url) window.open(backupSheet.url, '_blank', 'noopener,noreferrer');
                }}
                className="app-btn-sheet !min-h-9 gap-2 text-sm"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">Financial / backup sheet</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          <div className="app-card border-l-[3px] border-l-[var(--xu-blue)] p-5 sm:p-6">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-500">Pending reports</h3>
              <Clock className="h-5 w-5 shrink-0 text-[var(--xu-blue)] opacity-90" aria-hidden />
            </div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
              {pendingReports.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Awaiting SSIO assessment</p>
          </div>
          <div className="app-card border-l-[3px] border-l-amber-500 p-5 sm:p-6">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-500">Open risks</h3>
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 opacity-90" aria-hidden />
            </div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
              {openRisksCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Assessed / in progress</p>
          </div>
          <div className="app-card border-l-[3px] border-l-[var(--xu-red)] p-5 sm:p-6 sm:col-span-2 xl:col-span-1">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-500">Overdue actions</h3>
              <AlertCircle className="h-5 w-5 shrink-0 text-[var(--xu-red)] opacity-90" aria-hidden />
            </div>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
              {overdueActionsCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Mitigation past due date</p>
          </div>
          <div className="app-card border-l-[3px] border-l-emerald-600 p-5 sm:p-6 sm:col-span-2 xl:col-span-1">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Mitigation mix</h3>
            <p className="text-sm text-slate-700 tabular-nums">
              Total {mitigationTracking.total_actions} · Completed {mitigationTracking.completed_actions} · In progress{' '}
              {mitigationTracking.in_progress_actions} · Overdue {mitigationTracking.overdue_actions}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {mitigationTracking.total_actions > 0
                ? `${mitigationTracking.completed_pct}% done · ${mitigationTracking.in_progress_pct}% active · ${mitigationTracking.overdue_pct}% overdue`
                : 'No mitigation rows in this period.'}
            </p>
          </div>
        </div>

        <div className="app-card mb-6 overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h3 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">Activity log</h3>
            <p className="mt-1 text-sm text-slate-500">
              Recent status changes on reports (guards and SSIO). Refreshes when you reload or change timeframe context
              on navigation.
            </p>
          </div>
          <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-100">
            {activityLoading ? (
              <p className="px-4 py-6 text-sm text-slate-500 sm:px-6">Loading activity…</p>
            ) : activity.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500 sm:px-6">No activity entries yet.</p>
            ) : (
              activity.map((row) => (
                <div key={row.id} className="px-4 py-3 sm:px-6 hover:bg-slate-50/80">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/director/view-risk/${encodeURIComponent(row.report_id)}`)}
                      className="text-left text-sm font-semibold text-[var(--xu-blue)] hover:underline"
                    >
                      {row.report_id}
                    </button>
                    <time className="text-xs text-slate-500 tabular-nums">{new Date(row.created_at).toLocaleString()}</time>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusBadgeClass(row.from_status)}`}
                      >
                        {row.from_status_display || '—'}
                      </span>
                      <span aria-hidden>→</span>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusBadgeClass(row.to_status)}`}
                      >
                        {row.to_status_display || row.to_status}
                      </span>
                    </span>
                    {row.changed_by ? (
                      <span className="text-slate-500">
                        {' '}
                        · <span className="font-medium text-slate-700">{row.changed_by}</span>
                      </span>
                    ) : null}
                  </p>
                  {row.note ? <p className="mt-1 text-xs text-slate-500 italic">{row.note}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="app-card mb-6 overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h3 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">Guard incident tally</h3>
            <p className="mt-1 text-sm text-slate-500">Reports filed per guard in the selected analytics timeframe.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px]">
              <thead className="app-table-head">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-sm text-slate-600">Guard</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-sm text-slate-600">Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {guardReportTally.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 sm:px-6 py-8 text-center text-slate-500 text-sm">
                      No data for this range.
                    </td>
                  </tr>
                ) : (
                  guardReportTally.map((r) => (
                    <tr key={r.submitted_by_user_id} className="hover:bg-slate-50">
                      <td className="px-4 sm:px-6 py-3 text-sm text-slate-800">
                        <span className="font-medium">{r.guard_name}</span>
                        <span className="block text-xs text-slate-500 sm:inline sm:ml-2">· User {r.submitted_by_user_id}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right text-sm tabular-nums font-semibold text-slate-800">
                        {r.report_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="app-card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h3 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">Pending queue (detail)</h3>
            <p className="mt-1 text-sm text-slate-500">Open a report for read-only review or PDF (after assessment).</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="app-table-head">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-sm text-slate-600">ID</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-sm text-slate-600">Hazard</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-sm text-slate-600">Guard</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-sm text-slate-600">Status</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-sm text-slate-600">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-3 sm:px-6 py-8 text-center text-slate-500 text-sm">
                      Loading…
                    </td>
                  </tr>
                ) : pendingReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 sm:px-6 py-8 text-center text-slate-500 text-sm">
                      No pending reports.
                    </td>
                  </tr>
                ) : (
                  pendingReports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 sm:px-6 py-3 text-sm font-mono text-[var(--xu-blue)]">{r.id}</td>
                      <td className="px-3 sm:px-6 py-3 text-sm text-slate-800">{r.hazard}</td>
                      <td className="px-3 sm:px-6 py-3 text-sm text-slate-600">{r.guard}</td>
                      <td className="px-3 sm:px-6 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${statusBadgeClass(r.status_code)}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/director/view-risk/${encodeURIComponent(r.id)}`)}
                          className="app-btn-outline !min-h-9 text-sm"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
