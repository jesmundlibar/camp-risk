import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';
import xuLogo from 'figma:asset/ec82392f1b0bc80e2b02dd96773ac4886a651a93.png';

const riskData: Record<string, any> = {
  'ASS-0089': {
    id: 'ASS-0089',
    hazard: 'Electrical System Vulnerability',
    location: 'Building A',
    currentMitigation: 'Replace all loose wiring, install proper conduit systems, and conduct electrical safety audit.',
    assignedTo: 'Maintenance Team',
    dueDate: '2024-04-15',
  },
  'ASS-0088': {
    id: 'ASS-0088',
    hazard: 'Slip Hazard - Main Corridor',
    location: 'Building C',
    currentMitigation: 'Install non-slip flooring, improve drainage system, add warning signage.',
    assignedTo: 'Facilities Team',
    dueDate: '2024-04-10',
  },
};

export function UpdateMitigation() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { riskId } = useParams<{ riskId: string }>();

  const risk = riskData[riskId || ''] || riskData['ASS-0089'];

  const [formData, setFormData] = useState({
    mitigationPlan: risk.currentMitigation,
    assignedTo: risk.assignedTo,
    dueDate: risk.dueDate,
    status: 'In Progress',
    notes: '',
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production: Save to backend
    alert('Mitigation plan updated successfully!');
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
          <h2 className="text-2xl sm:text-3xl mb-2">Update Mitigation Plan</h2>
          <p className="text-slate-600">Risk ID: {risk.id} - {risk.hazard}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* Risk Information */}
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
            <h3 className="text-sm text-slate-600 mb-3">Risk Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Risk ID:</span>
                <span className="ml-2 text-slate-800">{risk.id}</span>
              </div>
              <div>
                <span className="text-slate-600">Location:</span>
                <span className="ml-2 text-slate-800">{risk.location}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-600">Hazard:</span>
                <span className="ml-2 text-slate-800">{risk.hazard}</span>
              </div>
            </div>
          </div>

          {/* Mitigation Plan */}
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

          {/* Assigned To */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Assigned To</label>
            <select
              required
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
            >
              <option value="Maintenance Team">Maintenance Team</option>
              <option value="Facilities Team">Facilities Team</option>
              <option value="Safety Team">Safety Team</option>
              <option value="IT Team">IT Team</option>
              <option value="Security Team">Security Team</option>
            </select>
          </div>

          {/* Due Date */}
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

          {/* Status */}
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

          {/* Notes */}
          <div>
            <label className="block text-sm text-slate-700 mb-2">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] min-h-[100px]"
              placeholder="Add any additional notes or comments..."
            />
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
              className="flex-1 px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              Save Changes
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
