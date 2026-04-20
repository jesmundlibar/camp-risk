import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Clock, MapPin, FileText, Shield, X } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';
import { fetchReports, type ApiReport } from '../lib/api';

interface Report {
  id: string;
  time: string;
  location: string;
  date: string;
  hazard: string;
  status: string;
  hazardTypes: string[];
  description: string;
  submittedBy: string;
  building: string;
  floor: string;
  room: string;
  specificLocation: string;
  photoUrl?: string | null;
}

function mapApiReport(r: ApiReport): Report {
  return {
    id: r.id,
    time: r.time,
    location: r.location,
    date: r.date,
    hazard: r.hazard,
    status: r.status,
    hazardTypes: r.hazard_types,
    description: r.description,
    submittedBy: r.submitted_by,
    building: r.building,
    floor: r.floor,
    room: r.room,
    specificLocation: r.specific_location,
    photoUrl: r.photo_url,
  };
}

export function GuardDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const loadReports = useCallback(async () => {
    if (!user?.id) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchReports({ submitted_by_user_id: user.id });
      setReports(data.map(mapApiReport));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const recentSlice = reports.slice(0, 3);

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
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl mb-2">Welcome, {user?.fullName}</h2>
          <p className="text-slate-600">Security Guard Dashboard</p>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <p className="font-medium">Could not reach the server</p>
            <p className="mt-1 text-amber-800">
              Start the Django API on port 8000 (e.g.{' '}
              <code className="bg-amber-100 px-1 rounded">python manage.py runserver</code> in{' '}
              <code className="bg-amber-100 px-1 rounded">backend</code>) while Vite is running, then refresh.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/guard/report')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/guard/report')}
            className="bg-gradient-to-br from-[var(--xu-blue)] to-blue-700 text-white rounded-lg shadow-lg p-8 lg:p-10 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <FileText className="h-16 w-16 lg:h-20 lg:w-20 mb-4 opacity-90" />
            <h3 className="text-2xl lg:text-3xl mb-2">SUBMIT INCIDENT REPORT</h3>
            <p className="text-blue-100 text-lg">Click Here</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
            <h3 className="text-xl lg:text-2xl mb-4 text-slate-800">Recent Reports</h3>
            {loading ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : recentSlice.length === 0 ? (
              <p className="text-slate-500 text-sm">No reports yet. Submit your first incident report.</p>
            ) : (
              <div className="space-y-4">
                {recentSlice.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[var(--xu-blue)]">{report.id}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{report.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{report.location}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="text-[var(--xu-blue)] text-sm hover:underline"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-xl text-slate-800">My Report History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Date</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Hazard</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Status</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                      Loading…
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 text-sm">
                      No report history.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-800">{report.date}</td>
                      <td className="px-6 py-4 text-sm text-slate-800">{report.hazard}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            report.status === 'Closed'
                              ? 'bg-green-100 text-green-800'
                              : report.status === 'Assessed'
                                ? 'bg-blue-100 text-blue-800'
                                : report.status === 'In Progress'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(report)}
                          className="text-[var(--xu-blue)] text-sm hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl text-slate-800">Report Details</h3>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Report ID</p>
                  <p className="text-lg text-[var(--xu-blue)]">{selectedReport.id}</p>
                </div>
                <span
                  className={`inline-flex px-3 py-1 text-sm rounded-full ${
                    selectedReport.status === 'Closed'
                      ? 'bg-green-100 text-green-800'
                      : selectedReport.status === 'Assessed'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedReport.status === 'In Progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {selectedReport.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Date</p>
                  <p className="text-slate-800">{selectedReport.date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Time</p>
                  <p className="text-slate-800">{selectedReport.time}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Hazard</p>
                <p className="text-slate-800">{selectedReport.hazard}</p>
              </div>

              {selectedReport.photoUrl ? (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Photo</p>
                  <img
                    src={selectedReport.photoUrl}
                    alt="Report attachment"
                    className="max-h-48 rounded-md border border-slate-200"
                  />
                </div>
              ) : null}

              <div>
                <p className="text-sm text-slate-600 mb-2">Hazard Types</p>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.hazardTypes.map((type, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Description</p>
                <p className="text-slate-800 leading-relaxed">
                  {selectedReport.description || '—'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-slate-600">Location Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Building</p>
                    <p className="text-slate-800">{selectedReport.building}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Floor</p>
                    <p className="text-slate-800">{selectedReport.floor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Room</p>
                    <p className="text-slate-800">{selectedReport.room}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Specific Location</p>
                    <p className="text-slate-800">{selectedReport.specificLocation || '—'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-1">Submitted By</p>
                <p className="text-slate-800">{selectedReport.submittedBy}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
