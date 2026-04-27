import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';
import { createPersonnel, deletePersonnel, fetchPersonnel, type ApiPersonnelRow } from '../lib/api';

export function ManagePersonnel() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [personnel, setPersonnel] = useState<ApiPersonnelRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
  });

  const loadList = useCallback(async () => {
    if (user?.role !== 'admin') {
      setPersonnel([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    setListError('');
    try {
      const rows = await fetchPersonnel();
      setPersonnel(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Could not load personnel');
      setPersonnel([]);
    } finally {
      setListLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAddPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const row = await createPersonnel({
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      setPersonnel((prev) => [...prev, row].sort((a, b) => a.username.localeCompare(b.username)));
      setShowAddModal(false);
      setFormData({ username: '', fullName: '', email: '', password: '' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add personnel');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePersonnel = async (id: string) => {
    setFormError('');
    try {
      await deletePersonnel(id);
      setPersonnel((prev) => prev.filter((p) => p.id !== id));
      setShowDeleteModal(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not delete');
    }
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
              <p className="text-slate-600">
                Add guard accounts stored in the database. New users can sign in as <strong>Security</strong> with the
                username and password you set.
              </p>
            </div>
            <button
              onClick={() => {
                setFormError('');
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              Add Personnel
            </button>
          </div>
        </div>

        {listError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{listError}</div>
        )}
        {formError && !showAddModal && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{formError}</div>
        )}

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
                {listLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 text-sm">
                      Loading personnel…
                    </td>
                  </tr>
                ) : personnel.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 text-sm">
                      No personnel records yet. Use &quot;Add Personnel&quot; to create a guard login in the database.
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
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{formError}</div>
              )}
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
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Add Personnel'}
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
              Remove this guard account from the database. They will no longer be able to sign in.
            </p>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{formError}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeletePersonnel(showDeleteModal)}
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
