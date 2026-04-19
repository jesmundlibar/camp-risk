import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowLeft, Calendar, MapPin, TrendingUp } from 'lucide-react';
import xuLogo from 'figma:asset/ec82392f1b0bc80e2b02dd96773ac4886a651a93.png';

const riskDetailsData: Record<string, any> = {
  'ASS-0089': {
    id: 'ASS-0089',
    hazard: 'Electrical System Vulnerability',
    severity: 'High',
    status: 'Open',
    score: 12,
    location: 'Building A',
    dateAssessed: '2024-04-01',
    likelihood: 'Likely',
    impact: 'Severe',
    description: 'Loose electrical wiring detected in multiple office spaces, posing fire and electrocution risks.',
    affectedAreas: ['Office 201', 'Office 205', 'Corridor A2'],
    mitigationPlan: 'Replace all loose wiring, install proper conduit systems, and conduct electrical safety audit.',
    assignedTo: 'Maintenance Team',
    dueDate: '2024-04-15',
    notes: [
      { date: '2024-04-01', author: 'Admin', text: 'Initial assessment completed. High priority.' },
      { date: '2024-04-03', author: 'Maintenance', text: 'Materials ordered for repairs.' },
    ],
  },
  'ASS-0088': {
    id: 'ASS-0088',
    hazard: 'Slip Hazard - Main Corridor',
    severity: 'Medium',
    status: 'In Review',
    score: 8,
    location: 'Building C',
    dateAssessed: '2024-03-28',
    likelihood: 'Possible',
    impact: 'Moderate',
    description: 'Wet floor condition frequently observed in main corridor due to drainage issues.',
    affectedAreas: ['Corridor C1', 'Entrance Hall'],
    mitigationPlan: 'Install non-slip flooring, improve drainage system, add warning signage.',
    assignedTo: 'Facilities Team',
    dueDate: '2024-04-10',
    notes: [
      { date: '2024-03-28', author: 'Admin', text: 'Drainage inspection scheduled.' },
    ],
  },
};

export function ViewRiskDetails() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { riskId } = useParams<{ riskId: string }>();

  const risk = riskDetailsData[riskId || ''] || riskDetailsData['ASS-0089'];

  const handleLogout = () => {
    logout();
    navigate('/');
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--xu-blue)] mb-6 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Risk Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl text-[var(--xu-blue)]">{risk.id}</span>
                <span className={`inline-flex px-3 py-1 text-sm rounded-full ${
                  risk.severity === 'High' ? 'bg-red-100 text-red-800' :
                  risk.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {risk.severity} Severity
                </span>
                <span className="inline-flex px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
                  Risk Score: {risk.score}
                </span>
              </div>
              <h2 className="text-2xl text-slate-800 mb-4">{risk.hazard}</h2>
            </div>
            <span className={`px-3 py-1 text-sm rounded-full ${
              risk.status === 'Open' ? 'bg-amber-100 text-amber-800' :
              risk.status === 'In Review' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {risk.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-5 w-5" />
              <div>
                <p className="text-xs text-slate-500">Location</p>
                <p className="text-sm">{risk.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-5 w-5" />
              <div>
                <p className="text-xs text-slate-500">Date Assessed</p>
                <p className="text-sm">{risk.dateAssessed}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <TrendingUp className="h-5 w-5" />
              <div>
                <p className="text-xs text-slate-500">Likelihood</p>
                <p className="text-sm">{risk.likelihood}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm text-slate-600 mb-2">Description</h3>
            <p className="text-slate-800">{risk.description}</p>
          </div>
        </div>

        {/* Affected Areas */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg text-slate-800 mb-4">Affected Areas</h3>
          <div className="flex flex-wrap gap-2">
            {risk.affectedAreas.map((area: string, index: number) => (
              <span key={index} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm">
                {area}
              </span>
            ))}
          </div>
        </div>

        {/* Mitigation Plan */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg text-slate-800 mb-4">Mitigation Plan</h3>
          <p className="text-slate-700 mb-4">{risk.mitigationPlan}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Assigned To:</span>
              <span className="ml-2 text-slate-800">{risk.assignedTo}</span>
            </div>
            <div>
              <span className="text-slate-600">Due Date:</span>
              <span className="ml-2 text-slate-800">{risk.dueDate}</span>
            </div>
          </div>
        </div>

        {/* Notes & Comments */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg text-slate-800 mb-4">Notes & Comments</h3>
          <div className="space-y-4">
            {risk.notes.map((note: any, index: number) => (
              <div key={index} className="border-l-4 border-[var(--xu-blue)] pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-slate-600">{note.author}</span>
                  <span className="text-xs text-slate-400">{note.date}</span>
                </div>
                <p className="text-sm text-slate-700">{note.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => navigate(`/admin/update-mitigation/${risk.id}`)}
            className="flex-1 px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Update Mitigation
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </main>
    </div>
  );
}
