import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, type UserRole } from '../context/AuthContext';
import { Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('guard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const u = await login(username, password, role);
      if (u.role === 'guard') {
        navigate('/guard/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-page flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="app-card p-5 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <img src={xuLogo} alt="Xavier University" className="h-24 sm:h-32 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-2xl sm:text-3xl mb-1 font-semibold tracking-tight text-[var(--xu-blue)]">CAMP-RISK</h1>
            <p className="text-sm text-slate-500">Risk Management System</p>
          </div>

          {/* Security Notice */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
            <Shield className="h-5 w-5 text-[var(--xu-blue)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">
              Choose Security or SSIO below so we open the correct portal for your account.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm mb-2 text-slate-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="w-full min-h-11 px-4 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white disabled:bg-slate-100 text-base touch-manipulation"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full min-h-11 px-4 py-2.5 pr-11 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white disabled:bg-slate-100 text-base touch-manipulation"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] disabled:opacity-50 touch-manipulation"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm mb-2 text-slate-700">
                Sign in as
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isLoading}
                className="w-full min-h-11 px-4 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white disabled:bg-slate-100 text-base touch-manipulation"
              >
                <option value="guard">Security Guard</option>
                <option value="admin">SSIO Officer / Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-12 rounded-lg bg-[var(--xu-blue)] text-white py-3 text-base font-medium shadow-sm transition-colors hover:bg-blue-800 disabled:bg-slate-400 disabled:cursor-not-allowed touch-manipulation"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
            {(import.meta.env.VITE_FEEDBACK_URL as string | undefined)?.trim() ? (
              <p className="text-center text-sm">
                <a
                  href={(import.meta.env.VITE_FEEDBACK_URL as string).trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--xu-blue)] hover:underline font-medium"
                >
                  Beta feedback form
                </a>
                <span className="text-slate-500"> — opens in a new tab</span>
              </p>
            ) : null}
            <div className="text-center text-sm text-slate-500">
              © 2026 Xavier University SSIO
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

