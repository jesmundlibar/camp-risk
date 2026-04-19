import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle, Clock, Shield, X, Users } from 'lucide-react';
import xuLogo from 'figma:asset/ec82392f1b0bc80e2b02dd96773ac4886a651a93.png';

const pendingReports = [
  { id: 'RISK-0421', hazard: 'Loose Electrical Wiring', date: '2024-04-01', priority: 'High', location: 'Building A, Floor 2', guard: 'Juan dela Cruz', status: 'pending' },
  { id: 'RISK-0420', hazard: 'Wet Floor - Corridor B', date: '2024-04-01', priority: 'Medium', location: 'Building C, Floor 1', guard: 'Pedro Garcia', status: 'pending' },
  { id: 'RISK-0419', hazard: 'Broken Fire Exit Light', date: '2024-03-31', priority: 'High', location: 'Building B, Floor 3', guard: 'Juan dela Cruz', status: 'pending' },
  { id: 'RISK-0418', hazard: 'Damaged Railing', date: '2024-03-31', priority: 'Medium', location: 'Stairwell D', guard: 'Maria Lopez', status: 'pending' },
  { id: 'RISK-0417', hazard: 'Chemical Spill', date: '2024-03-30', priority: 'High', location: 'Laboratory 5', guard: 'Pedro Garcia', status: 'pending' },
];

const openRisks = [
  { id: 'ASS-0089', hazard: 'Electrical System Vulnerability', severity: 'High', status: 'Open', score: 12, location: 'Building A', dateAssessed: '2024-04-01' },
  { id: 'ASS-0088', hazard: 'Slip Hazard - Main Corridor', severity: 'Medium', status: 'In Review', score: 8, location: 'Building C', dateAssessed: '2024-03-28' },
  { id: 'ASS-0086', hazard: 'Fire Safety Equipment', severity: 'High', status: 'Open', score: 12, location: 'Building B', dateAssessed: '2024-03-27' },
  { id: 'ASS-0084', hazard: 'Structural Integrity Issue', severity: 'Medium', status: 'Open', score: 9, location: 'Stairwell D', dateAssessed: '2024-03-25' },
];

const overdueActions = [
  { id: 'MIT-085', task: 'Replace fire exit signage', dueDate: '2024-03-30', daysOverdue: 6, assignedTo: 'Safety Team', relatedRisk: 'ASS-0086' },
  { id: 'MIT-083', task: 'Repair damaged railing', dueDate: '2024-03-28', daysOverdue: 8, assignedTo: 'Maintenance', relatedRisk: 'ASS-0084' },
  { id: 'MIT-081', task: 'Install non-slip floor coating', dueDate: '2024-03-25', daysOverdue: 11, assignedTo: 'Facilities', relatedRisk: 'ASS-0088' },
];

const riskRegister = [
  { id: 'ASS-0089', severity: 'High', status: 'Open' },
  { id: 'ASS-0088', severity: 'Medium', status: 'In Review' },
  { id: 'ASS-0087', severity: 'High', status: 'Mitigated' },
  { id: 'ASS-0086', severity: 'Low', status: 'Open' },
  { id: 'ASS-0085', severity: 'Medium', status: 'Mitigated' },
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState<'pending' | 'risks' | 'overdue' | null>(null);

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/manage-personnel')}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Users className="h-4 w-4" />
              Manage Personnel
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl mb-2">Welcome, {user?.fullName}</h2>
          <p className="text-slate-600">Administrator Dashboard</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <div
            onClick={() => setShowModal('pending')}
            className="bg-white rounded-lg shadow-lg p-6 lg:p-8 border-t-4 border-[var(--xu-blue)] cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-slate-600 text-sm sm:text-base">Pending Reports</h3>
              <Clock className="h-6 w-6 lg:h-7 lg:w-7 text-[var(--xu-blue)]" />
            </div>
            <p className="text-4xl lg:text-5xl text-slate-800 mb-2">{pendingReports.length}</p>
            <p className="text-xs text-slate-500">Click to view details</p>
          </div>

          <div
            onClick={() => setShowModal('risks')}
            className="bg-white rounded-lg shadow-lg p-6 lg:p-8 border-t-4 border-[var(--xu-gold)] cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-slate-600 text-sm sm:text-base">Open Risks</h3>
              <AlertCircle className="h-6 w-6 lg:h-7 lg:w-7 text-[var(--xu-gold)]" />
            </div>
            <p className="text-4xl lg:text-5xl text-slate-800 mb-2">{openRisks.length}</p>
            <p className="text-xs text-slate-500">Click to view details</p>
          </div>

          <div
            onClick={() => setShowModal('overdue')}
            className="bg-white rounded-lg shadow-lg p-6 lg:p-8 border-t-4 border-[var(--xu-red)] cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-slate-600 text-sm sm:text-base">Overdue Actions</h3>
              <AlertCircle className="h-6 w-6 lg:h-7 lg:w-7 text-[var(--xu-red)]" />
            </div>
            <p className="text-4xl lg:text-5xl text-slate-800 mb-2">{overdueActions.length}</p>
            <p className="text-xs text-slate-500">Click to view details</p>
          </div>
        </div>

        {/* Risk Assessment Queue */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-xl text-slate-800">Risk Assessment Queue</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">ID</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Hazard</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Date</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Priority</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pendingReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-[var(--xu-blue)]">{report.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{report.hazard}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{report.date}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          report.priority === 'High'
                            ? 'bg-red-100 text-red-800'
                            : report.priority === 'Medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {report.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/admin/assess/${report.id}`)}
                        className="px-4 py-2 bg-[var(--xu-blue)] text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Assess
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Risk Register */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-xl text-slate-800">Risk Register</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm text-slate-600">ID</th>
                    <th className="px-6 py-3 text-left text-sm text-slate-600">Severity</th>
                    <th className="px-6 py-3 text-left text-sm text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {riskRegister.map((risk) => (
                    <tr key={risk.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-[var(--xu-blue)]">{risk.id}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            risk.severity === 'High'
                              ? 'bg-red-100 text-red-800'
                              : risk.severity === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {risk.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{risk.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mitigation Tracking */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <h3 className="text-xl text-slate-800">Mitigation Tracking</h3>
              <p className="text-sm text-slate-600 mt-1">Jan-Jun 2024</p>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-700">Completed Actions</span>
                  <span className="text-sm text-green-600">75%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-700">In Progress</span>
                  <span className="text-sm text-yellow-600">50%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '50%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-700">Overdue</span>
                  <span className="text-sm text-red-600">25%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div className="bg-red-500 h-3 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Pending Reports Modal */}
      {showModal === 'pending' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-2xl text-slate-800">Pending Reports</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Incident reports awaiting risk assessment
                </p>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {pendingReports.map((report) => (
                  <div
                    key={report.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[var(--xu-blue)]">{report.id}</span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              report.priority === 'High'
                                ? 'bg-red-100 text-red-800'
                                : report.priority === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {report.priority} Priority
                          </span>
                        </div>
                        <h4 className="text-lg text-slate-800 mb-2">{report.hazard}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">Location:</span> {report.location}
                          </div>
                          <div>
                            <span className="font-medium">Reported by:</span> {report.guard}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {report.date}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> Awaiting Assessment
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/assess/${report.id}`)}
                        className="flex-1 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Assess This Report
                      </button>
                      <button
                        onClick={() => navigate(`/admin/request-info/${report.id}`)}
                        className="flex-1 px-4 py-2 border border-[var(--xu-blue)] text-[var(--xu-blue)] rounded-md hover:bg-blue-50 transition-colors"
                      >
                        Request More Info
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open Risks Modal */}
      {showModal === 'risks' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-2xl text-slate-800">Open Risks</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Active risks requiring monitoring and mitigation
                </p>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {openRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[var(--xu-blue)]">{risk.id}</span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              risk.severity === 'High'
                                ? 'bg-red-100 text-red-800'
                                : risk.severity === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {risk.severity} Severity
                          </span>
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            Risk Score: {risk.score}
                          </span>
                        </div>
                        <h4 className="text-lg text-slate-800 mb-2">{risk.hazard}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">Location:</span> {risk.location}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> {risk.status}
                          </div>
                          <div>
                            <span className="font-medium">Assessed:</span> {risk.dateAssessed}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/view-risk/${risk.id}`)}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => navigate(`/admin/update-mitigation/${risk.id}`)}
                        className="flex-1 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Update Mitigation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Actions Modal */}
      {showModal === 'overdue' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-2xl text-slate-800">Overdue Actions</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Mitigation actions past their due date requiring immediate attention
                </p>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {overdueActions.map((action) => (
                  <div
                    key={action.id}
                    className="border-l-4 border-red-500 bg-red-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[var(--xu-blue)]">{action.id}</span>
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-600 text-white">
                            {action.daysOverdue} days overdue
                          </span>
                        </div>
                        <h4 className="text-lg text-slate-800 mb-3">{action.task}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
                          <div>
                            <span className="font-medium">Due Date:</span> {action.dueDate}
                          </div>
                          <div>
                            <span className="font-medium">Assigned To:</span> {action.assignedTo}
                          </div>
                          <div>
                            <span className="font-medium">Related Risk:</span> {action.relatedRisk}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/view-risk/${action.relatedRisk}`)}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-md hover:bg-slate-100 transition-colors"
                      >
                        View Risk Details
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to mark this action as completed?')) {
                            alert('Action marked as completed!');
                            setShowModal(null);
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Mark as Completed
                      </button>
                      <button
                        onClick={() => navigate(`/admin/extend-deadline/${action.id}`)}
                        className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                      >
                        Extend Deadline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
