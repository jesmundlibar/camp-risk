import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth, type UserRole } from '../../context/AuthContext';

interface ProtectedRouteProps {
  role?: UserRole;
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { user, isAuthenticated, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        Checking session...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
