import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export function Unauthorized() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const goHome = async () => {
    try {
      await logout();
    } catch {
      // Still clear client state if the API session was never established.
    }
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-page flex items-center justify-center p-6">
      <div className="app-card w-full max-w-md p-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl mb-2">Unauthorized</h1>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">You do not have permission to access this page.</p>
        <button
          type="button"
          onClick={() => void goHome()}
          className="app-btn-primary w-full sm:w-auto"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
