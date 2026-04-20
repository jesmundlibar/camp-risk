import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Save, Send, AlertCircle } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';
import { fetchReport, type ApiReport } from '../lib/api';

interface MitigationAction {
  description: string;
  dueDate: string;
}

export function RiskAssessment() {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const [sourceReport, setSourceReport] = useState<ApiReport | null>(null);
  const [reportLoading, setReportLoading] = useState(!!reportId);

  useEffect(() => {
    if (!reportId) {
      setSourceReport(null);
      setReportLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setReportLoading(true);
      try {
        const r = await fetchReport(reportId);
        if (!cancelled) setSourceReport(r);
      } catch {
        if (!cancelled) setSourceReport(null);
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const [riskClassification, setRiskClassification] = useState('');
  const [likelihood, setLikelihood] = useState('');
  const [severity, setSeverity] = useState('');
  const [engineering, setEngineering] = useState('');
  const [administrative, setAdministrative] = useState('');
  const [ppe, setPpe] = useState('');
  const [actions, setActions] = useState<MitigationAction[]>([
    { description: '', dueDate: '' },
  ]);

  const riskScore = likelihood && severity ? parseInt(likelihood) * parseInt(severity) : 0;
  const riskLevel =
    riskScore >= 12
      ? 'High Risk'
      : riskScore >= 6
      ? 'Medium Risk'
      : riskScore > 0
      ? 'Low Risk'
      : '';

  const addAction = () => {
    setActions([...actions, { description: '', dueDate: '' }]);
  };

  const updateAction = (index: number, field: keyof MitigationAction, value: string) => {
    const newActions = [...actions];
    newActions[index][field] = value;
    setActions(newActions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Assessment submitted successfully!');
    navigate('/admin/dashboard');
  };

  const handleSaveDraft = () => {
    alert('Draft saved successfully!');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={xuLogo} alt="XU Logo" className="h-12" />
            <div>
              <h1 className="text-xl text-[var(--xu-blue)]">CAMP-RISK</h1>
              <p className="text-sm text-slate-600">Risk Management System</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-slate-800">Risk Assessment - Report #{reportId}</h2>
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Incident Details (Read-Only) */}
            <div className="bg-slate-50 rounded-lg p-4 sm:p-6 lg:p-8 border border-slate-200">
              <h3 className="text-lg lg:text-xl text-slate-800 mb-4">Incident Details</h3>
              {reportLoading ? (
                <p className="text-sm text-slate-500">Loading incident…</p>
              ) : sourceReport ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
                  <div>
                    <span className="text-slate-600">Hazard:</span>
                    <span className="ml-2 text-slate-800">{sourceReport.hazard}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Location:</span>
                    <span className="ml-2 text-slate-800">{sourceReport.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Reported:</span>
                    <span className="ml-2 text-slate-800">
                      {sourceReport.date} — {sourceReport.guard}
                    </span>
                  </div>
                  <div>
                    {sourceReport.photo_url ? (
                      <a
                        href={sourceReport.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--xu-blue)] hover:underline"
                      >
                        View attached image
                      </a>
                    ) : (
                      <span className="text-slate-500">No image attached</span>
                    )}
                  </div>
                  {sourceReport.description ? (
                    <div className="sm:col-span-2">
                      <span className="text-slate-600">Description:</span>
                      <p className="mt-1 text-slate-800">{sourceReport.description}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  No incident loaded for this ID. Use &quot;Assess&quot; from a pending report in the admin queue, or
                  check that the API is running.
                </p>
              )}
            </div>

            {/* Risk Classification */}
            <div>
              <label className="block text-slate-800 mb-3">Risk Classification</label>
              <select
                value={riskClassification}
                onChange={(e) => setRiskClassification(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
              >
                <option value="">Select Risk</option>
                <option value="electrocution">Electrocution</option>
                <option value="fire">Fire Hazard</option>
                <option value="equipment">Equipment Damage</option>
                <option value="injury">Physical Injury</option>
                <option value="slip">Slip/Trip/Fall</option>
              </select>
            </div>

            {/* Risk Rating */}
            <div>
              <label className="block text-slate-800 mb-3">Risk Rating</label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Likelihood (1-4)</label>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4].map((num) => (
                      <label
                        key={num}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="likelihood"
                          value={num}
                          checked={likelihood === String(num)}
                          onChange={(e) => setLikelihood(e.target.value)}
                          required
                          className="h-4 w-4 text-[var(--xu-blue)]"
                        />
                        <span className="text-slate-700">{num}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Severity (1-4)</label>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4].map((num) => (
                      <label
                        key={num}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="severity"
                          value={num}
                          checked={severity === String(num)}
                          onChange={(e) => setSeverity(e.target.value)}
                          required
                          className="h-4 w-4 text-[var(--xu-blue)]"
                        />
                        <span className="text-slate-700">{num}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {riskScore > 0 && (
                <div className="mt-4 p-4 bg-slate-100 rounded-lg flex items-center gap-3">
                  <AlertCircle className={`h-6 w-6 ${
                    riskLevel === 'High Risk' ? 'text-red-600' :
                    riskLevel === 'Medium Risk' ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                  <div>
                    <span className="text-slate-600">Calculated Score: </span>
                    <span className="text-slate-800 font-medium">{riskScore}</span>
                    <span className={`ml-3 px-3 py-1 rounded-full text-sm ${
                      riskLevel === 'High Risk' ? 'bg-red-100 text-red-800' :
                      riskLevel === 'Medium Risk' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {riskLevel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Control Measures */}
            <div>
              <label className="block text-slate-800 mb-3">Control Measures (HIRAC Framework)</label>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Engineering Controls</label>
                  <input
                    type="text"
                    value={engineering}
                    onChange={(e) => setEngineering(e.target.value)}
                    placeholder="e.g., Replace wiring, Install protective barriers"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Administrative Controls</label>
                  <input
                    type="text"
                    value={administrative}
                    onChange={(e) => setAdministrative(e.target.value)}
                    placeholder="e.g., Post warning signs, Restrict access"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">PPE Requirements</label>
                  <input
                    type="text"
                    value={ppe}
                    onChange={(e) => setPpe(e.target.value)}
                    placeholder="e.g., Insulated gloves, Safety footwear"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Mitigation Actions */}
            <div>
              <label className="block text-slate-800 mb-3">Mitigation Actions</label>
              <div className="space-y-4">
                {actions.map((action, index) => (
                  <div key={index} className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className="lg:col-span-2">
                      <label className="block text-sm text-slate-600 mb-2">
                        Action {index + 1}
                      </label>
                      <input
                        type="text"
                        value={action.description}
                        onChange={(e) =>
                          updateAction(index, 'description', e.target.value)
                        }
                        placeholder="Describe the action to be taken"
                        className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-2">Due Date</label>
                      <input
                        type="date"
                        value={action.dueDate}
                        onChange={(e) => updateAction(index, 'dueDate', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAction}
                  className="text-[var(--xu-blue)] text-sm hover:underline"
                >
                  + Add Another Action
                </button>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                Request More Info
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Send className="h-4 w-4" />
                Submit Assessment
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
