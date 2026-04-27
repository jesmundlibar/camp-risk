import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';
import { fetchReport, type ApiReport, type ApiRiskAssessmentDetail } from '../lib/api';

const CLASS_LABELS: Record<string, string> = {
  electrocution: 'Electrocution',
  fire: 'Fire hazard',
  equipment: 'Equipment damage',
  injury: 'Physical injury',
  slip: 'Slip / trip / fall',
};

function formatClassification(code: string) {
  if (!code) return '—';
  return CLASS_LABELS[code] ?? code;
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

export function ViewRiskDetails() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { riskId } = useParams<{ riskId: string }>();
  const [report, setReport] = useState<ApiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={xuLogo} alt="XU Logo" className="h-12" />
            <div>
              <h1 className="text-xl text-[var(--xu-blue)]">CAMP-RISK</h1>
              <p className="text-sm text-slate-600">Risk Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 text-[var(--xu-blue)] mb-6 hover:underline text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
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
              onClick={() => navigate('/admin/dashboard')}
              className="px-6 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700"
            >
              Return to dashboard
            </button>
          </div>
        ) : !assessment ? (
          <div className="bg-white rounded-lg shadow-lg p-10 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl text-slate-800 mb-2">No saved assessment</h2>
            <p className="text-slate-600 mb-2">
              {report.id} exists, but no risk assessment is stored for it yet. Open risks in the dashboard should
              normally include only assessed incidents—try refreshing the dashboard or complete an assessment for this
              report.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="px-6 py-2 border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Dashboard
              </button>
              {report.status_code === 'pending' ? (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/assess/${report.id}`)}
                  className="px-6 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700"
                >
                  Assess now
                </button>
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
                    {assessment.likelihood} × {assessment.severity}
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
