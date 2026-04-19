import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar, Save } from 'lucide-react';
import xuLogo from 'figma:asset/ec82392f1b0bc80e2b02dd96773ac4886a651a93.png';

const actionData: Record<string, any> = {
  'MIT-085': {
    id: 'MIT-085',
    task: 'Replace fire exit signage',
    dueDate: '2024-03-30',
    daysOverdue: 6,
    assignedTo: 'Safety Team',
    relatedRisk: 'ASS-0086',
    description: 'Replace all damaged fire exit signage in Building B to comply with safety regulations.',
  },
  'MIT-083': {
    id: 'MIT-083',
    task: 'Repair damaged railing',
    dueDate: '2024-03-28',
    daysOverdue: 8,
    assignedTo: 'Maintenance',
    relatedRisk: 'ASS-0084',
    description: 'Repair structural damage to stairwell railing on all floors.',
  },
  'MIT-081': {
    id: 'MIT-081',
    task: 'Install non-slip floor coating',
    dueDate: '2024-03-25',
    daysOverdue: 11,
    assignedTo: 'Facilities',
    relatedRisk: 'ASS-0088',
    description: 'Apply non-slip coating to main corridor floors to prevent slip hazards.',
  },
};

export function ExtendDeadline() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { actionId } = useParams<{ actionId: string }>();

  const action = actionData[actionId || ''] || actionData['MIT-085'];

  const [formData, setFormData] = useState({
    currentDueDate: action.dueDate,
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
    // In production: Update deadline in backend
    alert('Deadline extended successfully!');
    navigate('/admin/dashboard');
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--xu-blue)] mb-6 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl mb-2">Extend Deadline</h2>
          <p className="text-slate-600">Action ID: {action.id} - {action.task}</p>
        </div>

        {/* Action Summary */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-full">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg text-slate-800 mb-2">{action.task}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Action ID:</span>
                  <span className="ml-2 text-slate-800">{action.id}</span>
                </div>
                <div>
                  <span className="text-slate-600">Assigned To:</span>
                  <span className="ml-2 text-slate-800">{action.assignedTo}</span>
                </div>
                <div>
                  <span className="text-slate-600">Original Due Date:</span>
                  <span className="ml-2 text-slate-800">{action.dueDate}</span>
                </div>
                <div>
                  <span className="text-slate-600">Days Overdue:</span>
                  <span className="ml-2 text-red-600">{action.daysOverdue} days</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-600">Related Risk:</span>
                  <span className="ml-2 text-slate-800">{action.relatedRisk}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-amber-200 pt-4">
            <p className="text-sm text-slate-700">{action.description}</p>
          </div>
        </div>

        {/* Extension Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* Current Due Date */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Current Due Date</label>
            <input
              type="text"
              value={formData.currentDueDate}
              disabled
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 text-slate-600"
            />
          </div>

          {/* New Due Date */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">New Due Date <span className="text-red-500">*</span></label>
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

          {/* Extension Reason */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Reason for Extension <span className="text-red-500">*</span></label>
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

          {/* Justification */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Detailed Justification <span className="text-red-500">*</span></label>
            <textarea
              required
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] min-h-[120px]"
              placeholder="Provide a detailed explanation for why the deadline needs to be extended..."
            />
          </div>

          {/* Notify Team */}
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

          {/* Action Buttons */}
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
