import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Shield, X, UserPlus, Trash2 } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';

interface SecurityPersonnel {
  id: string;
  username: string;
  fullName: string;
  email: string;
  dateAdded: string;
  status: 'Active' | 'Inactive';
}

export function ManagePersonnel() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [personnel, setPersonnel] = useState<SecurityPersonnel[]>([]);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAddPersonnel = (e: React.FormEvent) => {
    e.preventDefault();
    const newPersonnel: SecurityPersonnel = {
      id: (personnel.length + 1).toString(),
      username: formData.username,
      fullName: formData.fullName,
      email: formData.email,
      dateAdded: new Date().toISOString().split('T')[0],
      status: 'Active',
    };
    setPersonnel([...personnel, newPersonnel]);
    setShowAddModal(false);
    setFormData({ username: '', fullName: '', email: '', password: '' });
  };

  const handleDeletePersonnel = (id: string) => {
    setPersonnel(personnel.filter(p => p.id !== id));
    setShowDeleteModal(null);
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl mb-2">Manage Security Personnel</h2>
              <p className="text-slate-600">Add or remove security guard accounts</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              Add Personnel
            </button>
          </div>
        </div>

        {/* Personnel Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">ID</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Username</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Full Name</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Email</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Date Added</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Status</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {personnel.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 text-sm">
                      No personnel records yet. Use &quot;Add Personnel&quot; to create entries.
                    </td>
                  </tr>
                ) : (
                  personnel.map((person) => (
                    <tr key={person.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-[var(--xu-blue)]">{person.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-800">{person.username}</td>
                      <td className="px-6 py-4 text-sm text-slate-800">{person.fullName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{person.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{person.dateAdded}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            person.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {person.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setShowDeleteModal(person.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
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

      {/* Add Personnel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl text-slate-800">Add Security Personnel</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddPersonnel} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-700 mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
                  placeholder="jdoe"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
                  placeholder="john.doe@xu.edu.ph"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Personnel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl text-slate-800">Delete Personnel</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this security personnel account? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePersonnel(showDeleteModal)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
