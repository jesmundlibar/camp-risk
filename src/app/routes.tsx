import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { GuardDashboard } from './pages/GuardDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { IncidentReport } from './pages/IncidentReport';
import { RiskAssessment } from './pages/RiskAssessment';
import { ManagePersonnel } from './pages/ManagePersonnel';
import { ViewRiskDetails } from './pages/ViewRiskDetails';
import { UpdateMitigation } from './pages/UpdateMitigation';
import { RequestMoreInfo } from './pages/RequestMoreInfo';
import { ExtendDeadline } from './pages/ExtendDeadline';
import { Unauthorized } from './pages/Unauthorized';
import { ProtectedRoute } from './components/routing/ProtectedRoute';

function RootRedirect() {
  const { user, authReady } = useAuth();
  if (!authReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/guard/dashboard" replace />;
}

function AdminLayout() {
  return <Outlet />;
}

function GuardLayout() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootRedirect,
  },
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/unauthorized',
    Component: Unauthorized,
  },
  {
    path: '/guard',
    element: <ProtectedRoute role="guard" />,
    children: [
      {
        element: <GuardLayout />,
        children: [
          { path: 'dashboard', Component: GuardDashboard },
          { path: 'report', Component: IncidentReport },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute role="admin" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: 'dashboard', Component: AdminDashboard },
          { path: 'assess/:reportId', Component: RiskAssessment },
          { path: 'manage-personnel', Component: ManagePersonnel },
          { path: 'view-risk/:riskId', Component: ViewRiskDetails },
          { path: 'update-mitigation/:riskId', Component: UpdateMitigation },
          { path: 'request-info/:reportId', Component: RequestMoreInfo },
          { path: 'extend-deadline/:actionId', Component: ExtendDeadline },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
