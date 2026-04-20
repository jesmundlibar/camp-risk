import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, UserRole } from '../context/AuthContext';
import { Shield, AlertCircle } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('guard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password, role);

      // Route based on role
      if (role === 'guard') {
        navigate('/guard/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <img src={xuLogo} alt="Xavier University" className="h-32 mx-auto mb-4" />
            <h1 className="text-3xl mb-1 text-[var(--xu-blue)]">CAMP-RISK</h1>
            <p className="text-slate-600">Risk Management System</p>
          </div>

          {/* Security Notice */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
            <Shield className="h-5 w-5 text-[var(--xu-blue)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">
              Secure authentication with role-based access control
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
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white disabled:bg-slate-100"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white disabled:bg-slate-100"
                placeholder="Enter your password"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm mb-2 text-slate-700">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white disabled:bg-slate-100"
              >
                <option value="guard">Security Guard (Regular User)</option>
                <option value="admin">Administrator (SSIO Officer)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--xu-blue)] text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="text-center text-sm text-slate-500 mb-4">
              © 2026 Xavier University SSIO
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p>🔒 Password: Bcrypt hashing with salt</p>
              <p>🔑 Session: JWT token-based authentication</p>
              <p>📋 Audit: All actions logged for compliance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

