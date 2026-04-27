import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider, useAuth } from './context/AuthContext';

function AuthBootstrapGuard() {
  const { authReady } = useAuth();

  // Block route rendering until session check completes to avoid protected-page flicker.
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthBootstrapGuard />
    </AuthProvider>
  );
}