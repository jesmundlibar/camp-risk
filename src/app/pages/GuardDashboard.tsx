import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Clock, MapPin, FileText, Shield, X } from 'lucide-react';
import xuLogo from 'figma:asset/ec82392f1b0bc80e2b02dd96773ac4886a651a93.png';

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
}

const recentReports: Report[] = [
  {
    id: '#2024-087',
    time: '12:30 PM',
    location: 'Gate B',
    date: '2024-04-05',
    hazard: 'Broken Gate Lock',
    status: 'Pending',
    hazardTypes: ['Property Damage', 'Security Issue'],
    description: 'The main lock mechanism on Gate B is broken and cannot be secured properly. This poses a security risk.',
    submittedBy: 'Juan dela Cruz',
    building: 'Perimeter',
    floor: 'Ground',
    room: 'N/A',
    specificLocation: 'Gate B entrance, left side lock'
  },
  {
    id: '#2024-086',
    time: '10:15 AM',
    location: 'Parking Lot C',
    date: '2024-04-05',
    hazard: 'Oil Spill',
    status: 'Assessed',
    hazardTypes: ['Slip Hazard', 'Environmental'],
    description: 'Large oil spill covering approximately 3 square meters in Parking Lot C. Slippery surface.',
    submittedBy: 'Juan dela Cruz',
    building: 'Parking Structure C',
    floor: 'Level 2',
    room: 'N/A',
    specificLocation: 'Near pillar C-23'
  },
  {
    id: '#2024-085',
    time: 'Yesterday',
    location: 'Main Entrance',
    date: '2024-04-04',
    hazard: 'Suspicious Individual',
    status: 'Closed',
    hazardTypes: ['Security Issue'],
    description: 'Individual loitering near main entrance for extended period. Approached multiple people. Person has left the premises.',
    submittedBy: 'Juan dela Cruz',
    building: 'Main Building',
    floor: 'Ground',
    room: 'Lobby',
    specificLocation: 'Near information desk'
  },
];

const reportHistory: Report[] = [
  {
    id: '#2024-084',
    date: '2024-03-28',
    hazard: 'Slip Hazard',
    status: 'Assessed',
    time: '2:45 PM',
    location: 'Building A - Floor 3',
    hazardTypes: ['Slip Hazard'],
    description: 'Wet floor near water fountain without warning signs.',
    submittedBy: 'Juan dela Cruz',
    building: 'Building A',
    floor: 'Floor 3',
    room: 'Hallway',
    specificLocation: 'Near water fountain'
  },
  {
    id: '#2024-083',
    date: '2024-03-27',
    hazard: 'Electrical Fault',
    status: 'Closed',
    time: '9:20 AM',
    location: 'Building B - Floor 2',
    hazardTypes: ['Electrical Hazard'],
    description: 'Sparking electrical outlet in classroom.',
    submittedBy: 'Juan dela Cruz',
    building: 'Building B',
    floor: 'Floor 2',
    room: 'Room 204',
    specificLocation: 'Wall outlet near whiteboard'
  },
  {
    id: '#2024-082',
    date: '2024-03-26',
    hazard: 'Fire Hazard',
    status: 'In Progress',
    time: '11:30 AM',
    location: 'Science Lab',
    hazardTypes: ['Fire Hazard', 'Chemical'],
    description: 'Improperly stored flammable chemicals.',
    submittedBy: 'Juan dela Cruz',
    building: 'Science Building',
    floor: 'Floor 1',
    room: 'Lab 101',
    specificLocation: 'Storage cabinet near sink'
  },
  {
    id: '#2024-081',
    date: '2024-03-25',
    hazard: 'Security Incident',
    status: 'Assessed',
    time: '4:15 PM',
    location: 'Library',
    hazardTypes: ['Security Issue'],
    description: 'Unattended bag left in library for several hours.',
    submittedBy: 'Juan dela Cruz',
    building: 'Library Building',
    floor: 'Floor 2',
    room: 'Reading Area',
    specificLocation: 'Table near window section'
  },
  {
    id: '#2024-080',
    date: '2024-03-24',
    hazard: 'Equipment Failure',
    status: 'Closed',
    time: '8:00 AM',
    location: 'Gym',
    hazardTypes: ['Equipment Damage'],
    description: 'Broken treadmill belt. Equipment tagged out of service.',
    submittedBy: 'Juan dela Cruz',
    building: 'Sports Complex',
    floor: 'Ground',
    room: 'Gym',
    specificLocation: 'Treadmill #5'
  },
];

export function GuardDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

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
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl mb-2">Welcome, {user?.fullName}</h2>
          <p className="text-slate-600">Security Guard Dashboard</p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Submit Report Card */}
          <div
            onClick={() => navigate('/guard/report')}
            className="bg-gradient-to-br from-[var(--xu-blue)] to-blue-700 text-white rounded-lg shadow-lg p-8 lg:p-10 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <FileText className="h-16 w-16 lg:h-20 lg:w-20 mb-4 opacity-90" />
            <h3 className="text-2xl lg:text-3xl mb-2">SUBMIT INCIDENT REPORT</h3>
            <p className="text-blue-100 text-lg">Click Here</p>
          </div>

          {/* Recent Reports Card */}
          <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
            <h3 className="text-xl lg:text-2xl mb-4 text-slate-800">Recent Reports</h3>
            <div className="space-y-4">
              {recentReports.map((report) => (
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
                    onClick={() => setSelectedReport(report)}
                    className="text-[var(--xu-blue)] text-sm hover:underline"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report History Table */}
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
                {reportHistory.map((report, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-800">{report.date}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{report.hazard}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          report.status === 'Closed'
                            ? 'bg-green-100 text-green-800'
                            : report.status === 'Assessed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="text-[var(--xu-blue)] text-sm hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* View Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl text-slate-800">Report Details</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Report ID & Status */}
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

              {/* Date & Time */}
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

              {/* Hazard Information */}
              <div>
                <p className="text-sm text-slate-600 mb-1">Hazard</p>
                <p className="text-slate-800">{selectedReport.hazard}</p>
              </div>

              {/* Hazard Types */}
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

              {/* Description */}
              <div>
                <p className="text-sm text-slate-600 mb-1">Description</p>
                <p className="text-slate-800 leading-relaxed">{selectedReport.description}</p>
              </div>

              {/* Location Details */}
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
                    <p className="text-slate-800">{selectedReport.specificLocation}</p>
                  </div>
                </div>
              </div>

              {/* Submitted By */}
              <div>
                <p className="text-sm text-slate-600 mb-1">Submitted By</p>
                <p className="text-slate-800">{selectedReport.submittedBy}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end">
              <button
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
