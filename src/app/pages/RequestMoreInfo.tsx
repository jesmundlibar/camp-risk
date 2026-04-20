import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';
import { fetchReport, type ApiReport } from '../lib/api';

export function RequestMoreInfo() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { reportId } = useParams<{ reportId: string }>();
  const [apiReport, setApiReport] = useState<ApiReport | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    requestType: 'clarification',
    specificQuestions: '',
    additionalPhotos: false,
    measurements: false,
    witnessStatements: false,
    otherInfo: '',
    urgency: 'normal',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!reportId) {
        setApiReport(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const r = await fetchReport(reportId);
        if (!cancelled) setApiReport(r);
      } catch {
        if (!cancelled) setApiReport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const who = apiReport?.guard ?? 'the reporting guard';
    alert(`Information request recorded (demo). Would notify: ${who}`);
    navigate('/admin/dashboard');
  };

  const report = apiReport;

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
          <h2 className="text-2xl sm:text-3xl mb-2">Request More Information</h2>
          <p className="text-slate-600">
            Report ID: {reportId ?? '—'}
            {report ? ` — ${report.hazard}` : ''}
          </p>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading report…</p>
        ) : !report ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-slate-600">
            <p className="mb-4">This report was not found, or the server is unreachable.</p>
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700"
            >
              Back to dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg text-slate-800 mb-4">Report Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Report ID:</span>
                  <span className="ml-2 text-slate-800">{report.id}</span>
                </div>
                <div>
                  <span className="text-slate-600">Reported by:</span>
                  <span className="ml-2 text-slate-800">{report.guard}</span>
                </div>
                <div>
                  <span className="text-slate-600">Location:</span>
                  <span className="ml-2 text-slate-800">{report.location}</span>
                </div>
                <div>
                  <span className="text-slate-600">Date:</span>
                  <span className="ml-2 text-slate-800">{report.date}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-600">Description:</span>
                  <p className="mt-1 text-slate-800">{report.description || '—'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
              <div>
                <label className="block text-sm text-slate-700 mb-2">Request Type</label>
                <select
                  required
                  value={formData.requestType}
                  onChange={(e) => setFormData({ ...formData, requestType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
                >
                  <option value="clarification">Request Clarification</option>
                  <option value="additional_details">Request Additional Details</option>
                  <option value="follow_up">Follow-up Information</option>
                  <option value="verification">Request Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-2">Specific Questions</label>
                <textarea
                  required
                  value={formData.specificQuestions}
                  onChange={(e) => setFormData({ ...formData, specificQuestions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] min-h-[120px]"
                  placeholder="What specific information do you need from the security guard?"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-3">Additional Requirements</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.additionalPhotos}
                      onChange={(e) => setFormData({ ...formData, additionalPhotos: e.target.checked })}
                      className="w-4 h-4 text-[var(--xu-blue)] border-slate-300 rounded focus:ring-[var(--xu-blue)]"
                    />
                    <span className="text-sm text-slate-700">Request additional photos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.measurements}
                      onChange={(e) => setFormData({ ...formData, measurements: e.target.checked })}
                      className="w-4 h-4 text-[var(--xu-blue)] border-slate-300 rounded focus:ring-[var(--xu-blue)]"
                    />
                    <span className="text-sm text-slate-700">Request measurements or dimensions</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.witnessStatements}
                      onChange={(e) => setFormData({ ...formData, witnessStatements: e.target.checked })}
                      className="w-4 h-4 text-[var(--xu-blue)] border-slate-300 rounded focus:ring-[var(--xu-blue)]"
                    />
                    <span className="text-sm text-slate-700">Request witness statements</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-2">Other Information Needed</label>
                <textarea
                  value={formData.otherInfo}
                  onChange={(e) => setFormData({ ...formData, otherInfo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] min-h-[80px]"
                  placeholder="Any other specific information needed..."
                />
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-2">Urgency</label>
                <select
                  required
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
                >
                  <option value="low">Low - Response within 3 days</option>
                  <option value="normal">Normal - Response within 24 hours</option>
                  <option value="high">High - Response within 4 hours</option>
                  <option value="urgent">Urgent - Immediate response required</option>
                </select>
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
                  className="flex-1 px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-5 w-5" />
                  Send Request
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
