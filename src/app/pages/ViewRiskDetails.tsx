import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowLeft, FileDown } from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import {
  downloadAssessmentPdf,
  ensureMediaSrc,
  fetchReport,
  openAssessmentPdf,
  type ApiReport,
  type ApiRiskAssessmentDetail,
} from '../lib/api';

const CLASS_LABELS: Record<string, string> = {
  'earthquake-impact': 'Earthquake Impact',
  'fire-hazard': 'Fire Hazard',
  'laboratory-hazard': 'Laboratory Hazard',
  'campus-security': 'Campus Security Risk',
  'traffic-safety': 'Traffic Safety Risk',
  'flooding-impact': 'Flooding Impact',
  'electrical-hazard': 'Electrical Hazard',
  'evacuation-failure': 'Emergency Evacuation Failure',
  'slip-trip-fall': 'Slip / Trip / Fall',
  'public-health': 'Public Health Risk',
};

function formatClassification(code: string) {
  if (!code) return '—';
  return CLASS_LABELS[code] ?? code;
}

function likelihoodLabel(value: number) {
  return (
    {
      1: 'Rare',
      2: 'Unlikely',
      3: 'Possible',
      4: 'Likely',
      5: 'Very likely',
    }[value] ?? '—'
  );
}

function severityLabel(value: number) {
  return (
    {
      1: 'Insignificant',
      2: 'Minor',
      3: 'Moderate',
      4: 'Major',
      5: 'Catastrophic',
    }[value] ?? '—'
  );
}

function MitigationList({ assessment }: { assessment: ApiRiskAssessmentDetail }) {
  const rows = assessment.mitigation_actions ?? [];
  if (rows.length === 0) {
    return <p className="text-slate-600 text-sm">No mitigation actions recorded.</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map((act, i) => {
        const due = act.due_date ?? act.dueDate ?? '';
        return (
          <li key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <p className="text-slate-800 font-medium">{act.description || '—'}</p>
            {due ? <p className="text-sm text-slate-600 mt-1">Due: {due}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export type ViewRiskDetailsProps = {
  /** Dashboard to return to (SSIO vs Director oversight). */
  homePath?: string;
  /** When false, hide assess / request-info and other mutation entry points. */
  allowProgressActions?: boolean;
};

export function ViewRiskDetails({
  homePath = '/admin/dashboard',
  allowProgressActions = true,
}: ViewRiskDetailsProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { riskId } = useParams<{ riskId: string }>();
  const [report, setReport] = useState<ApiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfAction, setPdfAction] = useState<'open' | 'download'>('open');

  useEffect(() => {
    if (!riskId) {
      setReport(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const r = await fetchReport(riskId);
        if (!cancelled) {
          setReport(r);
        }
      } catch (e) {
        if (!cancelled) {
          setReport(null);
          setError(e instanceof Error ? e.message : 'Could not load report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [riskId]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const assessment = report?.assessment ?? null;

  return (
    <div className="app-page">
      <AppShellHeader
        actions={
          <>
            {assessment && riskId ? (
              <button
                type="button"
                disabled={pdfLoading}
                onClick={() => {
                  setPdfLoading(true);
                  void (async () => {
                    try {
                      if (pdfAction === 'download') {
                        await downloadAssessmentPdf(riskId);
                      } else {
                        await openAssessmentPdf(riskId);
                      }
                    } catch (e) {
                      alert(e instanceof Error ? e.message : 'Could not process PDF action');
                    } finally {
                      setPdfLoading(false);
                    }
                  })();
                }}
                className="app-btn-primary w-full min-h-11 sm:w-auto"
              >
                <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                {pdfLoading ? 'Preparing PDF…' : 'Open PDF report'}
              </button>
            ) : null}
            {assessment && riskId ? (
              <select
                value={pdfAction}
                onChange={(e) => setPdfAction(e.target.value as 'open' | 'download')}
                className="w-full min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm sm:w-auto sm:min-w-[170px] touch-manipulation"
              >
                <option value="open">Open preview</option>
                <option value="download">Download</option>
              </select>
            ) : null}
            <button type="button" onClick={() => navigate(homePath)} className="app-btn-outline w-full sm:w-auto">
              Back to Dashboard
            </button>
            <button type="button" onClick={handleLogout} className="app-btn-outline w-full sm:w-auto">
              Logout
            </button>
          </>
        }
      />

      <main className="app-main-narrow">
        {!allowProgressActions ? (
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <strong className="font-semibold text-slate-900">View only</strong> — This account cannot edit incidents,
            assessments, or mitigation. Use PDF tools below for printable copies when available.
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => navigate(homePath)}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-[var(--xu-blue)] hover:underline touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to dashboard
        </button>

        {loading ? (
          <p className="text-slate-600">Loading report…</p>
        ) : error ? (
          <div className="bg-white rounded-lg shadow border border-red-200 p-6 text-red-800 text-sm">{error}</div>
        ) : !report ? (
          <div className="bg-white rounded-lg shadow-lg p-10 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl text-slate-800 mb-2">Report not found</h2>
            <p className="text-slate-600 mb-6">
              {riskId ? (
                <>
                  No report for <span className="font-mono">{riskId}</span>.
                </>
              ) : (
                'No report selected.'
              )}
            </p>
            <button
              type="button"
              onClick={() => navigate(homePath)}
              className="px-6 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700"
            >
              Return to dashboard
            </button>
          </div>
        ) : !assessment ? (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex gap-4">
              <AlertCircle className="h-10 w-10 text-amber-600 shrink-0" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold text-amber-950">No saved assessment yet</h2>
                <p className="text-sm text-amber-900 mt-1">
                  <span className="font-mono">{report.id}</span> is loaded below. Pending reports need an SSIO assessment
                  before this page shows scoring and mitigation. Use Assess for pending items, or return to the
                  dashboard queue.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Incident (read-only)</h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Status</span>
                  <p className="text-slate-800 mt-1">{report.status}</p>
                </div>
                <div>
                  <span className="text-slate-500">Reported</span>
                  <p className="text-slate-800 mt-1">
                    {report.date} — {report.guard}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Location</span>
                  <p className="text-slate-800 mt-1">{report.location}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Hazard</span>
                  <p className="text-slate-800 mt-1">{report.hazard}</p>
                </div>
              </div>
              {report.hazard_types && report.hazard_types.length > 0 ? (
                <div className="mt-4">
                  <span className="text-sm text-slate-500">Hazard types</span>
                  <ul className="mt-2 list-disc pl-5 text-slate-800 text-sm space-y-1">
                    {report.hazard_types.map((t, i) => (
                      <li key={`${i}-${t}`}>{t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {ensureMediaSrc(report.photo_url) ? (
                <div className="mt-4">
                  <span className="text-sm text-slate-500 block mb-2">Photo</span>
                  <img
                    src={ensureMediaSrc(report.photo_url)!}
                    alt="Incident"
                    className="max-h-56 rounded-md border border-slate-200 object-contain"
                  />
                </div>
              ) : null}
              {report.description ? (
                <div className="mt-4">
                  <span className="text-sm text-slate-500">Description</span>
                  <p className="text-slate-800 text-sm mt-1 whitespace-pre-wrap">{report.description}</p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate(homePath)}
                className="px-6 py-2 border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Dashboard
              </button>
              {allowProgressActions ? (
                report.status_code === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/assess/${report.id}`)}
                    className="px-6 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700"
                  >
                    Open assessment form
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/request-info/${encodeURIComponent(report.id)}`)}
                    className="px-6 py-2 border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Request more info
                  </button>
                )
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl text-slate-800">Risk details — {report.id}</h2>
                  <p className="text-slate-600 mt-1">{report.hazard}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-900">
                    Score {assessment.risk_score}
                  </span>
                  <span className="inline-flex px-3 py-1 text-sm rounded-full bg-slate-100 text-slate-800">
                    {assessment.risk_level}
                  </span>
                  <span className="inline-flex px-3 py-1 text-sm rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                    {report.status}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-6">
                <div>
                  <span className="text-slate-500">Location</span>
                  <p className="text-slate-800 mt-1">{report.location}</p>
                </div>
                <div>
                  <span className="text-slate-500">Reported</span>
                  <p className="text-slate-800 mt-1">
                    {report.date} — {report.guard}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Likelihood × severity</span>
                  <p className="text-slate-800 mt-1">
                    {assessment.likelihood} ({likelihoodLabel(assessment.likelihood)}) × {assessment.severity} (
                    {severityLabel(assessment.severity)})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Assessment last updated</span>
                  <p className="text-slate-800 mt-1">{new Date(assessment.updated_at).toLocaleString()}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Risk classification</span>
                  <p className="text-slate-800 mt-1">{formatClassification(assessment.risk_classification)}</p>
                </div>
              </div>
            </div>

            {ensureMediaSrc(report.photo_url) ? (
              <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
                <h3 className="text-lg text-slate-800 mb-4">Incident photo</h3>
                <img
                  src={ensureMediaSrc(report.photo_url)!}
                  alt="Incident attachment"
                  className="max-h-72 rounded-md border border-slate-200 object-contain"
                />
              </div>
            ) : null}

            {assessment.hazard_risk_breakdown && assessment.hazard_risk_breakdown.length > 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 overflow-x-auto">
                <h3 className="text-lg text-slate-800 mb-4">Per-hazard risk breakdown</h3>
                <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-700">Hazard</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-700">Specific risk</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-700">Affected area</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-700">L × S</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-700">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assessment.hazard_risk_breakdown.map((row, i) => (
                      <tr key={i} className="bg-white">
                        <td className="px-3 py-2 text-slate-800 align-top">
                          {row.hazard ?? (report.hazard_types?.[i] ?? '—')}
                        </td>
                        <td className="px-3 py-2 text-slate-700 align-top">{row.specific_risk || '—'}</td>
                        <td className="px-3 py-2 text-slate-600 align-top">{row.affected_area ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700 align-top whitespace-nowrap">
                          {row.likelihood} ({likelihoodLabel(row.likelihood)}) × {row.severity} (
                          {severityLabel(row.severity)})
                        </td>
                        <td className="px-3 py-2 text-slate-800 font-medium align-top">
                          {row.likelihood * row.severity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
              <h3 className="text-lg text-slate-800 mb-4">Control measure</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-slate-500 block mb-1">Engineering</span>
                  <p className="text-slate-800">{assessment.engineering_controls || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Administrative</span>
                  <p className="text-slate-800">{assessment.administrative_controls || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">PPE</span>
                  <p className="text-slate-800">{assessment.ppe_controls || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Residual risk</span>
                  <p className="text-slate-800">{assessment.residual_risk || '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
              <h3 className="text-lg text-slate-800 mb-4">Mitigation actions</h3>
              <MitigationList assessment={assessment} />
            </div>

            {report.description ? (
              <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
                <h3 className="text-lg text-slate-800 mb-2">Original incident description</h3>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{report.description}</p>
              </div>
            ) : null}

            {report.information_requests && report.information_requests.length > 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
                <h3 className="text-lg text-slate-800 mb-4">Information requests on file</h3>
                <ul className="space-y-4">
                  {report.information_requests.map((ir) => (
                    <li key={ir.id} className="border border-slate-200 rounded-lg p-4 text-sm">
                      <p className="text-xs text-slate-500 mb-2">
                        {new Date(ir.created_at).toLocaleString()} — urgency: {ir.payload.urgency ?? '—'}
                      </p>
                      <p className="text-slate-800 whitespace-pre-wrap">{ir.payload.specificQuestions ?? '—'}</p>
                      {ir.payload.otherInfo ? (
                        <p className="text-slate-600 mt-2 text-xs">Other: {ir.payload.otherInfo}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
