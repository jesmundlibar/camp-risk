import { Link } from 'react-router';

export function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 text-center">
        <h1 className="text-2xl text-slate-900 mb-2">Unauthorized</h1>
        <p className="text-slate-600 mb-6">You do not have permission to access this page.</p>
        <Link
          to="/"
          className="inline-flex px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
