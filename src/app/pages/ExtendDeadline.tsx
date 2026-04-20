import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar, Save } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';

export function ExtendDeadline() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { actionId } = useParams<{ actionId: string }>();

  const [formData, setFormData] = useState({
    currentDueDate: '',
    newDueDate: '',
    extensionReason: '',
    justification: '',
    notifyTeam: true,
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Deadline extended successfully!');
    navigate('/admin/dashboard');
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
            Action ID: {actionId ?? '—'} — mitigation actions will appear here once tracked in the system.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-full">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg text-slate-800 mb-2">No action on file</h3>
              <p className="text-sm text-slate-600">
                There is no overdue mitigation task loaded for this ID. You can still use the form below as a
                placeholder.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div>
            <label className="block text-sm text-slate-700 mb-2">Current Due Date</label>
            <input
              type="text"
              value={formData.currentDueDate}
              onChange={(e) => setFormData({ ...formData, currentDueDate: e.target.value })}
              placeholder="—"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
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
            <p className="text-xs text-slate-500 mt-1">Select a future date for the new deadline</p>
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
              <span className="text-sm text-slate-700">Notify assigned team of deadline change</span>
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
              className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              Extend Deadline
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
