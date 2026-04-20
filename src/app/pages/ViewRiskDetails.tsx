import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';

export function ViewRiskDetails() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { riskId } = useParams<{ riskId: string }>();

  const handleLogout = () => {
    logout();
    navigate('/');
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
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl text-slate-800 mb-2">No risk record</h2>
        <p className="text-slate-600 mb-2">
          {riskId ? (
            <>
              No saved risk details for <span className="font-mono text-slate-800">{riskId}</span>.
            </>
          ) : (
            'No risk selected.'
          )}
        </p>
        <p className="text-slate-500 text-sm mb-6">
          Risk records will appear here after assessments are stored in the system.
        </p>
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="px-6 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700"
        >
          Return to dashboard
        </button>
      </main>
    </div>
  );
}
