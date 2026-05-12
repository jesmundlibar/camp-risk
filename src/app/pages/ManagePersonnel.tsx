import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { X, UserPlus, Trash2, Eye, EyeOff, UserX, UserCheck, FileSpreadsheet, ExternalLink, Pencil } from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import { NotificationBell } from '../components/NotificationBell';
import {
  createPersonnel,
  deletePersonnel,
  fetchGoogleSheetsBackupInfo,
  fetchPersonnel,
  setPersonnelActive,
  updatePersonnel,
  type ApiPersonnelRow,
} from '../lib/api';

const personnelFieldClass =
  'box-border w-full min-h-10 min-w-0 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[var(--xu-blue)]/45 focus:ring-2 focus:ring-[var(--xu-blue)]/18';
const personnelModalShellClass =
  'my-auto w-full min-w-0 max-w-md max-h-[min(90vh,40rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10 sm:max-w-lg';
const personnelErrorBannerClass =
  'break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-snug text-red-800';
const personnelLabelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500';

const EM_DASH = '\u2014';

function isOfficialXuEmployeeEmail(email: string): boolean {
  const l = email.trim().toLowerCase();
  if (!l) return false;
  if (l.endsWith('@my.xu.edu.ph')) return false;
  return l.endsWith('@xu.edu.ph');
}

function guardHasUsablePassword(person: ApiPersonnelRow): boolean {
  const d = person.passwordDisplay;
  return Boolean(d && d !== EM_DASH);
}

export function ManagePersonnel() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
  });
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [personnel, setPersonnel] = useState<ApiPersonnelRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [backupSheet, setBackupSheet] = useState<{ url: string | null; configured: boolean }>({
    url: null,
    configured: false,
  });

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
  });
  /** Table/card: toggle between dotted mask and showing the password copy kept for this admin screen. */
  const [tablePwdRevealIds, setTablePwdRevealIds] = useState<Set<string>>(() => new Set());

  const toggleTablePasswordReveal = (id: string) => {
    setTablePwdRevealIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  useEffect(() => {
    if (user?.role !== 'admin') {
      setBackupSheet({ url: null, configured: false });
      return;
    }
    let cancelled = false;
    void fetchGoogleSheetsBackupInfo()
      .then((info) => {
        if (!cancelled) setBackupSheet({ url: info.view_url, configured: info.configured });
      })
      .catch(() => {
        if (!cancelled) setBackupSheet({ url: null, configured: false });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.id]);

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
      setFormError('');
      setShowPassword(false);
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

  const handleToggleActive = async (id: string, active: boolean) => {
    setFormError('');
    setTogglingId(id);
    try {
      const row = await setPersonnelActive(id, active);
      setPersonnel((prev) =>
        [...prev.map((p) => (p.id === id ? row : p))].sort((a, b) => a.username.localeCompare(b.username)),
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setTogglingId(null);
    }
  };

  const openEditPersonnel = (person: ApiPersonnelRow) => {
    setFormError('');
    setShowAddModal(false);
    setEditShowPassword(false);
    setEditForm({
      username: person.username,
      fullName: person.fullName,
      email: person.email,
      password: '',
    });
    setEditPersonId(person.id);
  };

  const handleEditPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPersonId) return;
    setFormError('');
    setEditSaving(true);
    try {
      const pwd = editForm.password.trim();
      if (!pwd) {
        setFormError('Enter a new password (at least 8 characters) to save changes.');
        return;
      }
      if (pwd.length < 8) {
        setFormError('New password must be at least 8 characters.');
        return;
      }
      const row = await updatePersonnel(editPersonId, {
        username: editForm.username.trim(),
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        password: pwd,
      });
      setPersonnel((prev) =>
        [...prev.map((p) => (p.id === editPersonId ? row : p))].sort((a, b) => a.username.localeCompare(b.username)),
      );
      setEditPersonId(null);
      setEditForm({ username: '', fullName: '', email: '', password: '' });
      setEditShowPassword(false);
      setFormError('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const renderEmailWithBadge = (person: ApiPersonnelRow) => (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="break-all text-sm text-slate-600">{person.email || '—'}</span>
        {!isOfficialXuEmployeeEmail(person.email) ? (
          <span
            className="inline-flex shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900"
            title="Use an official @xu.edu.ph address (not Gmail or @my.xu.edu.ph)."
          >
            Wrong domain
          </span>
        ) : null}
      </div>
    </div>
  );

  const renderPasswordToggle = (person: ApiPersonnelRow, opts?: { compact?: boolean }) => {
    const revealed = tablePwdRevealIds.has(person.id);
    const hasPw = guardHasUsablePassword(person);
    const plain = (person.passwordPlain ?? '').trim();
    const masked = person.passwordDisplay ?? '••••••••';
    return (
      <div
        className={`flex min-w-0 items-start gap-1 ${opts?.compact ? 'max-w-full' : 'max-w-full md:max-w-[10.5rem] lg:max-w-[12rem] xl:max-w-none'}`}
      >
        <button
          type="button"
          onClick={() => toggleTablePasswordReveal(person.id)}
          className="min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-100"
          aria-pressed={revealed}
          aria-label={revealed ? 'Hide password' : 'Show password'}
        >
          {revealed ? (
            plain ? (
              <span className="select-all break-all font-mono text-sm text-slate-900">{plain}</span>
            ) : (
              <span className="text-xs leading-snug text-slate-600">
                {hasPw
                  ? 'No copy here yet. Have this guard sign in once, or use Edit → save with a password.'
                  : 'No password set for this account.'}
              </span>
            )
          ) : (
            <span className="font-mono text-sm tracking-[0.25em] text-slate-700">{hasPw ? masked : EM_DASH}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => toggleTablePasswordReveal(person.id)}
          className="mt-0.5 inline-flex shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label={revealed ? 'Hide password' : 'Show password'}
        >
          {revealed ? <EyeOff className="h-4 w-4 shrink-0" aria-hidden /> : <Eye className="h-4 w-4 shrink-0" aria-hidden />}
        </button>
      </div>
    );
  };

  const renderPersonActions = (person: ApiPersonnelRow) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
      <button
        type="button"
        onClick={() => openEditPersonnel(person)}
        className="app-btn-outline !min-h-10 w-full justify-center gap-1 px-3 py-2 text-sm sm:!min-h-9 sm:w-auto"
      >
        <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Edit
      </button>
      {person.status === 'Active' ? (
        <button
          type="button"
          disabled={togglingId === person.id}
          onClick={() => void handleToggleActive(person.id, false)}
          className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-800 transition-colors hover:bg-amber-50 disabled:opacity-50 sm:min-h-9 sm:w-auto"
        >
          <UserX className="h-4 w-4 shrink-0" aria-hidden />
          Disable
        </button>
      ) : (
        <button
          type="button"
          disabled={togglingId === person.id}
          onClick={() => void handleToggleActive(person.id, true)}
          className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-green-300 px-3 py-2 text-sm text-green-800 transition-colors hover:bg-green-50 disabled:opacity-50 sm:min-h-9 sm:w-auto"
        >
          <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
          Enable
        </button>
      )}
      <button
        type="button"
        onClick={() => setShowDeleteModal(person.id)}
        className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 sm:min-h-9 sm:w-auto"
      >
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
        Delete
      </button>
    </div>
  );

  return (
    <div className="app-page">
      <AppShellHeader
        actions={
          <>
            <NotificationBell role="admin" />
            <button type="button" onClick={() => navigate('/admin/dashboard')} className="app-btn-outline">
              Back to Dashboard
            </button>
            <button type="button" onClick={handleLogout} className="app-btn-outline">
              Logout
            </button>
          </>
        }
      />

      <main className="app-main">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <h2 className="app-page-title">Manage security personnel</h2>
              <p className="app-page-subtitle mt-2 max-w-xl leading-relaxed">
                Add or edit guards; each save needs a new password (8+). Official{' '}
                <span className="font-medium text-slate-700">@xu.edu.ph</span> email only. Tap the dots or eye to show the
                password stored for this list. Disable or delete when needed.
              </p>
            </div>
            <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={!backupSheet.configured || !backupSheet.url}
                title={
                  backupSheet.configured && backupSheet.url
                    ? 'Opens the backup Google Sheet in a new tab.'
                    : 'Set GOOGLE_SHEETS_SPREADSHEET_ID (or GOOGLE_SHEETS_BROWSER_URL) on the API server.'
                }
                onClick={() => {
                  if (backupSheet.url) window.open(backupSheet.url, '_blank', 'noopener,noreferrer');
                }}
                className="app-btn-sheet w-full justify-center sm:w-auto"
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
                View backup spreadsheet
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setEditPersonId(null);
                  setShowPassword(false);
                  setShowAddModal(true);
                }}
                className="app-btn-primary w-full justify-center sm:w-auto"
              >
                <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                Add personnel
              </button>
            </div>
          </div>
        </div>

        {listError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{listError}</div>
        )}
        {formError && !showAddModal && !editPersonId && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{formError}</div>
        )}

        {/* Personnel list: cards on small screens, table on md+ */}
        <div className="md:hidden">
          {listLoading ? (
            <div className="app-card p-8 text-center text-sm text-slate-500">Loading personnel…</div>
          ) : personnel.length === 0 ? (
            <div className="app-card p-8 text-center text-sm text-slate-500">
              No personnel yet. Tap Add personnel to create a guard login.
            </div>
          ) : (
            <ul className="space-y-3">
              {personnel.map((person) => (
                <li key={person.id} className="app-card overflow-hidden p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">ID {person.id}</p>
                      <p className="truncate text-base font-semibold text-slate-900">{person.username}</p>
                      <p className="text-sm text-slate-600">{person.fullName}</p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        person.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {person.status}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
                      <dd className="mt-1">{renderEmailWithBadge(person)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Password</dt>
                      <dd className="mt-1">{renderPasswordToggle(person, { compact: true })}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Date added</dt>
                      <dd className="mt-1 text-slate-600">{person.dateAdded}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 border-t border-slate-100 pt-4">{renderPersonActions(person)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="app-card hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 table-fixed">
              <thead className="app-table-head">
                <tr>
                  <th className="w-12 px-3 py-3 text-left text-xs uppercase tracking-wide text-slate-500 lg:px-5">ID</th>
                  <th className="px-3 py-3 text-left text-xs uppercase tracking-wide text-slate-500 lg:px-5">User</th>
                  <th className="hidden px-3 py-3 text-left text-xs uppercase tracking-wide text-slate-500 lg:table-cell lg:px-5">
                    Full name
                  </th>
                  <th className="px-3 py-3 text-left text-xs uppercase tracking-wide text-slate-500 lg:px-5">Email</th>
                  <th className="w-[9.5rem] px-2 py-3 text-left text-xs uppercase tracking-wide text-slate-500 xl:w-48 xl:px-3">
                    Password
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs uppercase tracking-wide text-slate-500 md:table-cell lg:px-5">
                    Added
                  </th>
                  <th className="w-24 px-2 py-3 text-left text-xs uppercase tracking-wide text-slate-500 lg:px-4">Status</th>
                  <th className="w-[11rem] px-2 py-3 text-left text-xs uppercase tracking-wide text-slate-500 xl:w-auto xl:px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {listLoading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500 lg:px-6">
                      Loading personnel…
                    </td>
                  </tr>
                ) : personnel.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500 lg:px-6">
                      No personnel records yet. Use Add personnel to create a guard login.
                    </td>
                  </tr>
                ) : (
                  personnel.map((person) => (
                    <tr key={person.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 align-top text-sm text-[var(--xu-blue)] lg:px-5">{person.id}</td>
                      <td className="min-w-0 px-3 py-3 align-top lg:px-5">
                        <div className="truncate text-sm font-medium text-slate-800">{person.username}</div>
                        <div className="truncate text-xs text-slate-500 lg:hidden">{person.fullName}</div>
                      </td>
                      <td className="hidden min-w-0 px-3 py-3 align-top text-sm text-slate-800 lg:table-cell lg:px-5">
                        <span className="line-clamp-2 break-words">{person.fullName}</span>
                      </td>
                      <td className="min-w-0 px-3 py-3 align-top lg:px-5">{renderEmailWithBadge(person)}</td>
                      <td className="min-w-0 px-2 py-3 align-top xl:px-3">{renderPasswordToggle(person)}</td>
                      <td className="hidden min-w-0 px-3 py-3 align-top text-sm text-slate-600 md:table-cell lg:px-5">
                        {person.dateAdded}
                      </td>
                      <td className="px-2 py-3 align-top lg:px-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs ${
                            person.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {person.status}
                        </span>
                      </td>
                      <td className="min-w-0 px-2 py-3 align-top xl:px-4">{renderPersonActions(person)}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain bg-black/50 p-4 sm:p-5">
          <div className={personnelModalShellClass}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <h3 className="text-base font-semibold tracking-tight text-slate-900">Add security personnel</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPassword(false);
                  setShowAddModal(false);
                  setFormError('');
                }}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddPersonnel} className="space-y-4 p-5 sm:p-6">
              {formError ? <div className={personnelErrorBannerClass}>{formError}</div> : null}
              <div>
                <label htmlFor="add-personnel-username" className={personnelLabelClass}>
                  Username
                </label>
                <input
                  id="add-personnel-username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={personnelFieldClass}
                  placeholder="jdoe"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="add-personnel-fullname" className={personnelLabelClass}>
                  Full name
                </label>
                <input
                  id="add-personnel-fullname"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={personnelFieldClass}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="add-personnel-email" className={personnelLabelClass}>
                  Email
                </label>
                <input
                  id="add-personnel-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={personnelFieldClass}
                  placeholder="john.doe@xu.edu.ph"
                  autoComplete="email"
                />
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Official <span className="font-medium text-slate-600">@xu.edu.ph</span> only (not Gmail, not{' '}
                  <span className="font-medium text-slate-600">@my.xu.edu.ph</span>).
                </p>
              </div>
              <div>
                <label htmlFor="add-personnel-password" className={personnelLabelClass}>
                  Password
                </label>
                <div className="relative min-w-0">
                  <input
                    id="add-personnel-password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    autoComplete="new-password"
                    className={`${personnelFieldClass} pr-11`}
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 z-10 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPassword(false);
                    setShowAddModal(false);
                    setFormError('');
                  }}
                  className="app-btn-outline w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="app-btn-primary w-full sm:w-auto">
                  {saving ? 'Saving…' : 'Add personnel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Personnel Modal */}
      {editPersonId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain bg-black/50 p-4 sm:p-5">
          <div className={personnelModalShellClass}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-slate-900">Edit security personnel</h3>
                <p className="mt-0.5 text-xs text-slate-500">User ID {editPersonId}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditShowPassword(false);
                  setEditPersonId(null);
                  setEditForm({ username: '', fullName: '', email: '', password: '' });
                  setFormError('');
                }}
                className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditPersonnel} className="space-y-4 p-5 sm:p-6">
              {formError ? <div className={personnelErrorBannerClass}>{formError}</div> : null}
              <div>
                <label htmlFor="edit-personnel-username" className={personnelLabelClass}>
                  Username
                </label>
                <input
                  id="edit-personnel-username"
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className={personnelFieldClass}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="edit-personnel-fullname" className={personnelLabelClass}>
                  Full name
                </label>
                <input
                  id="edit-personnel-fullname"
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className={personnelFieldClass}
                />
              </div>
              <div>
                <label htmlFor="edit-personnel-email" className={personnelLabelClass}>
                  Email
                </label>
                <input
                  id="edit-personnel-email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className={personnelFieldClass}
                  autoComplete="email"
                />
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Official <span className="font-medium text-slate-600">@xu.edu.ph</span> only (not Gmail, not{' '}
                  <span className="font-medium text-slate-600">@my.xu.edu.ph</span>).
                </p>
              </div>
              <div>
                <label htmlFor="edit-personnel-password" className={personnelLabelClass}>
                  New password
                </label>
                <div className="relative min-w-0">
                  <input
                    id="edit-personnel-password"
                    name="new-password-edit"
                    type={editShowPassword ? 'text' : 'password'}
                    required
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    autoComplete="new-password"
                    className={`${personnelFieldClass} pr-11`}
                    placeholder="Required — at least 8 characters"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword((v) => !v)}
                    aria-label={editShowPassword ? 'Hide new password' : 'Show new password'}
                    aria-pressed={editShowPassword}
                    className="absolute right-2 top-1/2 z-10 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    {editShowPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Required to save. Use the eye icon to show or hide what you typed (dots hide the characters until you show
                  them).
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditShowPassword(false);
                    setEditPersonId(null);
                    setEditForm({ username: '', fullName: '', email: '', password: '' });
                    setFormError('');
                  }}
                  className="app-btn-outline w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button type="submit" disabled={editSaving} className="app-btn-primary w-full sm:w-auto">
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain bg-black/50 p-4 sm:p-5">
          <div className="my-auto w-full min-w-0 max-w-md max-h-[min(90vh,40rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/10 sm:max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl text-slate-800">Delete Personnel</h3>
            </div>
            <p className="text-slate-600 mb-6">
              This permanently removes the guard account from the database. Related incident rows may lose a live user
              link depending on how they were stored. If you only need to block sign-in, cancel and use{' '}
              <strong>Disable</strong> instead so history stays tied to the same account.
            </p>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{formError}</div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                className="app-btn-outline min-h-11 w-full flex-1 sm:min-h-10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeletePersonnel(showDeleteModal)}
                className="min-h-11 w-full flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 sm:min-h-10"
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
