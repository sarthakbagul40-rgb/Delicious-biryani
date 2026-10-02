import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, ChevronRight, Loader2, ArrowLeft, KeyRound, ChefHat } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { isAdminUser, DEFAULT_ADMIN_EMAIL } from '../lib/adminConfig';

const AdminProtectedRoute = ({ children }) => {
  const { user, userProfile, isLoading, signInWithEmail } = useAuthStore();
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-4 border-[#ec6d13] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Verifying Kitchen Security Clearances...
        </p>
      </div>
    );
  }

  // Check if current user is an authorized admin
  const hasAccess = isAdminUser(user, userProfile);

  if (hasAccess) {
    return children;
  }

  // Handle direct inline login for restaurant owner
  const handleOwnerLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    if (!emailInput.trim() || !passwordInput) {
      setLoginError('Please enter both owner email and password.');
      return;
    }

    setLoginLoading(true);
    try {
      await signInWithEmail(emailInput.trim(), passwordInput);
    } catch (err) {
      console.warn('Owner admin sign in error:', err);
      setLoginError(err.message || 'Invalid credentials. Please verify your admin password.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 text-center relative overflow-hidden">
        {/* Subtle top saffron accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-[#ec6d13] to-orange-600" />

        <div className="w-16 h-16 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-center mx-auto text-[#ec6d13] mb-4 shadow-sm">
          <ChefHat size={32} strokeWidth={2.2} />
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-[#ec6d13] bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full">
          Restaurant Owner Portal
        </span>

        <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-3 mb-1">
          Kitchen Admin Access
        </h1>
        <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto mb-6">
          This portal is reserved strictly for the Delicious Biryani restaurant owner and kitchen management team.
        </p>

        {user ? (
          // Logged in as non-admin user
          <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 text-left mb-6 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
              <ShieldAlert size={16} className="shrink-0" />
              <span>Unauthorized Account</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed">
              Logged in as <strong className="font-mono text-slate-900">{user.email}</strong>, which does not have restaurant administrative credentials.
            </p>
            <div className="flex gap-2 pt-1">
              <Link
                to="/"
                className="flex-1 py-2 text-center text-xs font-black uppercase tracking-wider bg-white border border-rose-200 rounded-xl text-slate-700 hover:bg-rose-50/50 transition-colors"
              >
                Return to Store
              </Link>
              <Link
                to="/auth"
                className="flex-1 py-2 text-center text-xs font-black uppercase tracking-wider bg-[#ec6d13] text-white rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
              >
                Switch Account
              </Link>
            </div>
          </div>
        ) : (
          // Owner Login Form
          <form onSubmit={handleOwnerLogin} className="space-y-4 text-left">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-700 font-medium flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                Admin Email ID
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={DEFAULT_ADMIN_EMAIL}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#ec6d13] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#ec6d13] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Restaurant Owner</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
          <Link to="/" className="hover:text-slate-700 flex items-center gap-1 transition-colors">
            <ArrowLeft size={13} />
            <span>Back to Storefront</span>
          </Link>
          <span className="text-[10px] text-slate-400">Palava Cloud Kitchen</span>
        </div>
      </div>
    </div>
  );
};

export default AdminProtectedRoute;
