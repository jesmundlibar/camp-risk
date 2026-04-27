import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';
import { fetchReport, updateMitigationTracking, type ApiReport } from '../lib/api';

const TEAM_OPTIONS = ['Maintenance Team', 'Facilities Team', 'Safety Team', 'IT Team', 'Security Team'] as const;

export function UpdateMitigation() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { riskId } = useParams<{ riskId: string }>();

  const [report, setReport] = useState<ApiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [formData, setFormData] = useState({
    mitigationPlan: '',
    assignedTo: 'Maintenance Team',
    dueDate: '',
    status: 'In Progress',
    notes: '',
  });

  useEffect(() => {
    if (!riskId?.trim()) {
      setReport(null);
      setLoadError('Missing report ID.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const r = await fetchReport(riskId.trim());
        if (cancelled) return;
        setReport(r);
        const rows = r?.assessment?.mitigation_actions;
        if (!r?.assessment || !Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== 'object') {
          setLoadError('This report has no mitigation actions yet. Complete a risk assessment first.');
          return;
        }
        const row = rows[0] as Record<string, string | undefined>;
        const due = row.due_date ?? row.dueDate ?? '';
        const dueNorm = typeof due === 'string' && due.length >= 10 ? due.slice(0, 10) : '';
        const assigned = (row.assigned_to || 'Maintenance Team').trim() || 'Maintenance Team';
        const st = (row.action_status || 'In Progress').trim() || 'In Progress';
        setFormData({
          mitigationPlan: (row.description || '').trim(),
          assignedTo: assigned,
          dueDate: dueNorm,
          status: ['Pending', 'In Progress', 'Completed', 'On Hold'].includes(st) ? st : 'In Progress',
          notes: (row.mitigation_notes || '').trim(),
        });
      } catch (e) {
        if (!cancelled) {
          setReport(null);
          setLoadError(e instanceof Error ? e.message : 'Could not load report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [riskId]);

  const assignedChoices = useMemo(() => {
    const t = formData.assignedTo;
    if (t && !TEAM_OPTIONS.includes(t as (typeof TEAM_OPTIONS)[number])) {
      return [...TEAM_OPTIONS, t];
    }
    return [...TEAM_OPTIONS];
  }, [formData.assignedTo]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    if (!riskId?.trim()) {
      setSubmitError('Missing report ID.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await updateMitigationTracking(riskId.trim(), {
        mitigationPlan: formData.mitigationPlan.trim(),
        assignedTo: formData.assignedTo,
        dueDate: formData.dueDate,
        status: formData.status,
        notes: formData.notes.trim(),
      });
      setSubmitSuccess(res.message);
      window.setTimeout(() => navigate('/admin/dashboard'), 1800);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSubmitting(false);
    }
  };

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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--xu-blue)] mb-6 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl mb-2">Update Mitigation Plan</h2>
          <p className="text-slate-600">Report: {riskId ?? '—'} (first mitigation action is updated)</p>
        </div>

        {loading ? <p className="text-slate-600 text-sm mb-4">Loading…</p> : null}
        {loadError ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 text-sm">{loadError}</div>
        ) : null}
        {submitError ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 text-sm">{submitError}</div>
        ) : null}
        {submitSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-4 mb-6 text-sm">
            {submitSuccess}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
            <h3 className="text-sm text-slate-600 mb-3">Risk Information</h3>
            {report ? (
              <div className="text-sm text-slate-800 space-y-1">
                <p>
                  <span className="text-slate-500">Hazard:</span> {report.hazard}
                </p>
                <p>
                  <span className="text-slate-500">Location:</span> {report.location}
                </p>
                <p>
                  <span className="text-slate-500">Status:</span> {report.status}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No linked report loaded.</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-2">Mitigation Plan</label>
            <textarea
              required
              value={formData.mitigationPlan}
              onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] min-h-[120px]"
              placeholder="Describe the mitigation plan in detail..."
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-2">Assigned To</label>
            <select
              required
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
            >
              {assignedChoices.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-2">Due Date</label>
            <input
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-2">Status</label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-2">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] min-h-[100px]"
              placeholder="Add any additional notes or comments..."
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !!loadError || !report}
              className="flex-1 px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Save className="h-5 w-5" />
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
