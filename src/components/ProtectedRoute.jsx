import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

/**
 * Frontend Navigation Middleware: ProtectedRoute
 * Intercepts unauthenticated users trying to access private pages (Profile, Orders, Checkout)
 * and redirects them cleanly to /auth with return history.
 */
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#ec6d13] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Verifying Credentials...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect to login while preserving the page they were trying to access
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;
