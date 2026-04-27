import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';
import { extendMitigationDeadline, fetchReport, parseMitigationActionRef, type ApiReport } from '../lib/api';

export function ExtendDeadline() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { actionId } = useParams<{ actionId: string }>();

  const parsed = useMemo(() => (actionId ? parseMitigationActionRef(actionId) : null), [actionId]);

  const [report, setReport] = useState<ApiReport | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [formData, setFormData] = useState({
    currentDueDate: '',
    newDueDate: '',
    extensionReason: '',
    justification: '',
    notifyTeam: true,
  });

  useEffect(() => {
    if (!parsed) {
      setReport(null);
      setLoadError('Invalid action ID. Expected format like RPT-12-A1.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const r = await fetchReport(parsed.reportId);
        if (cancelled) return;
        setReport(r);
        const rows = r?.assessment?.mitigation_actions ?? [];
        const row = rows[parsed.index1 - 1];
        if (!r?.assessment || !row || typeof row !== 'object') {
          setLoadError('Could not find this mitigation action on the report.');
          return;
        }
        const due = (row as { due_date?: string; dueDate?: string }).due_date ?? (row as { dueDate?: string }).dueDate ?? '';
        const dueStr = typeof due === 'string' && due.length >= 10 ? due.slice(0, 10) : String(due || '');
        setFormData((prev) => ({
          ...prev,
          currentDueDate: dueStr || '—',
        }));
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
  }, [parsed]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    if (!actionId?.trim()) {
      setSubmitError('Missing action ID.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await extendMitigationDeadline(actionId.trim(), {
        newDueDate: formData.newDueDate,
        extensionReason: formData.extensionReason,
        justification: formData.justification.trim(),
        notifyTeam: formData.notifyTeam,
      });
      setSubmitSuccess(res.message);
      window.setTimeout(() => navigate('/admin/dashboard'), 1800);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Request failed');
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
          <h2 className="text-2xl sm:text-3xl mb-2">Extend Deadline</h2>
          <p className="text-slate-600">
            Action ID: {actionId ?? '—'}
            {parsed ? ` · Report ${parsed.reportId}, mitigation #${parsed.index1}` : null}
          </p>
        </div>

        {loading ? (
          <p className="text-slate-600 text-sm mb-6">Loading action…</p>
        ) : null}

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
          <div>
            <label className="block text-sm text-slate-700 mb-2">Current Due Date</label>
            <input
              type="text"
              readOnly
              value={formData.currentDueDate}
              className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-2">
              New Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.newDueDate}
              onChange={(e) => setFormData({ ...formData, newDueDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-slate-500 mt-1">Pick the new deadline (today or later).</p>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-2">
              Reason for Extension <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.extensionReason}
              onChange={(e) => setFormData({ ...formData, extensionReason: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
            >
              <option value="">Select a reason...</option>
              <option value="resource_unavailability">Resource Unavailability</option>
              <option value="budget_constraints">Budget Constraints</option>
              <option value="technical_complexity">Technical Complexity</option>
              <option value="external_dependencies">External Dependencies</option>
              <option value="priority_change">Priority Change</option>
              <option value="unexpected_obstacles">Unexpected Obstacles</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-2">
              Detailed Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] min-h-[120px]"
              placeholder="Provide a detailed explanation for why the deadline needs to be extended..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifyTeam}
                onChange={(e) => setFormData({ ...formData, notifyTeam: e.target.checked })}
                className="w-4 h-4 text-[var(--xu-blue)] border-slate-300 rounded focus:ring-[var(--xu-blue)]"
              />
              <span className="text-sm text-slate-700">Record that the assigned team should be notified (for your records)</span>
            </label>
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
              disabled={submitting || !!loadError || !parsed}
              className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Save className="h-5 w-5" />
              {submitting ? 'Saving…' : 'Extend Deadline'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
