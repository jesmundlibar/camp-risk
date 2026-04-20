import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Upload } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';
import { useAuth } from '../context/AuthContext';
import { submitIncidentReport } from '../lib/api';

export function IncidentReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hazardTypes, setHazardTypes] = useState<string[]>([]);
  const [otherHazard, setOtherHazard] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [specific, setSpecific] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hazardOptions = [
    'Slip/Trip Hazard',
    'Electrical Fault',
    'Fire Hazard',
    'Chemical Spill',
    'Security Incident',
    'Structural Damage',
    'Equipment Failure',
    'Other (specify)',
  ];

  const toggleHazard = (hazard: string) => {
    if (hazardTypes.includes(hazard)) {
      setHazardTypes(hazardTypes.filter((h) => h !== hazard));
    } else {
      setHazardTypes([...hazardTypes, hazard]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) {
      setError('You must be logged in to submit a report.');
      return;
    }
    if (hazardTypes.length === 0) {
      setError('Select at least one hazard type.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('submitted_by_user_id', user.id);
      fd.append('submitted_by_name', user.fullName);
      fd.append('hazard_types', JSON.stringify(hazardTypes));
      fd.append('other_hazard', otherHazard);
      fd.append('building', building);
      fd.append('floor', floor);
      fd.append('room', room);
      fd.append('specific_location', specific);
      fd.append('description', description);
      if (photo) {
        fd.append('photo', photo);
      }
      await submitIncidentReport(fd);
      navigate('/guard/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
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
          <button
            type="button"
            onClick={() => navigate('/guard/dashboard')}
            className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-slate-800">New Incident Report</h2>
            <button
              type="button"
              onClick={() => navigate('/guard/dashboard')}
              className="text-slate-600 hover:text-slate-800"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-slate-800 mb-3">
                Hazard Type
                <span className="text-sm text-slate-600 ml-2">(Select all that apply)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {hazardOptions.map((hazard) => (
                  <label
                    key={hazard}
                    className="flex items-center gap-3 p-3 border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={hazardTypes.includes(hazard)}
                      onChange={() => toggleHazard(hazard)}
                      className="h-5 w-5 text-[var(--xu-blue)] rounded focus:ring-[var(--xu-blue)]"
                    />
                    <span className="text-slate-700">{hazard}</span>
                  </label>
                ))}
              </div>
              {hazardTypes.includes('Other (specify)') && (
                <input
                  type="text"
                  value={otherHazard}
                  onChange={(e) => setOtherHazard(e.target.value)}
                  placeholder="Please specify"
                  className="w-full mt-4 px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                />
              )}
            </div>

            <div>
              <label className="block text-slate-800 mb-3">Photo Upload</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-[var(--xu-blue)] transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-700 mb-1">Click to Upload Image</p>
                  <p className="text-sm text-slate-500">(JPG/PNG, Max 5MB)</p>
                  {photo && (
                    <p className="text-sm text-[var(--xu-blue)] mt-2">Selected: {photo.name}</p>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-slate-800 mb-3">Location Details</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="Building"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="Floor"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Room/Zone"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={specific}
                    onChange={(e) => setSpecific(e.target.value)}
                    placeholder="Specific Location"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-800 mb-3">
                Description
                <span className="text-sm text-slate-600 ml-2">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Additional details about the incident..."
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white resize-none"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
