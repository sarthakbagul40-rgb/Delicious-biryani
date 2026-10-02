import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ShieldCheck, 
  ShieldAlert,
  Clock,
  ArrowRight, 
  Loader2, 
  ChevronLeft, 
  Sparkles, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import BrandLogo from '../components/BrandLogo';
import PasswordResetModal from '../components/PasswordResetModal';
import { isAdminEmail } from '../lib/adminConfig';
import { 
  checkRateLimit, 
  recordRateLimitAttempt, 
  formatTimeRemaining 
} from '../lib/rateLimiter';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    sendPasswordReset 
  } = useAuthStore();
  
  const from = location.state?.from?.pathname || location.state?.from || "/";

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [urlEmail, setUrlEmail] = useState('');
  const [urlOtp, setUrlOtp] = useState('');

  // Auto-detect 1-Click Reset action from email links (?action=reset&email=...&otp=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    const emailParam = params.get('email');
    const otpParam = params.get('otp');

    if (action === 'reset' && (emailParam || otpParam)) {
      if (emailParam) {
        setUrlEmail(emailParam);
        setFormData(prev => ({ ...prev, email: emailParam }));
      }
      if (otpParam) setUrlOtp(otpParam);
      setShowForgotModal(true);
    }
  }, [location.search]);

  // Live lockout countdown timer
  useEffect(() => {
    let timer;
    if (lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining(prev => {
          if (prev <= 1) {
            setError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: ''
  });

  const getCleanErrorMessage = (err) => {
    console.error('FULL AUTH ERROR:', err);
    const code = err?.code || '';
    const msg = err?.message || err?.toString() || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return 'Incorrect email or password. Please verify and try again.';
    }
    if (code === 'auth/user-not-found') {
      return 'No account found with this email. Create an account to join!';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email is already registered. Please sign in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Access is temporarily paused for security. Please try again later.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'This sign-in method is currently paused. Please use email or 1-Click Demo.';
    }
    if (code === 'auth/user-disabled') {
      return 'This account has been suspended. Please contact customer support.';
    }
    return msg || 'Authentication error. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = (formData.email || '').trim().toLowerCase();

    // 1. Sign In Flow
    if (activeTab === 'login') {
      if (!cleanEmail || !formData.password) {
        setError('Please fill in your email and password.');
        return;
      }

      // Pre-check login rate limit
      const rateCheck = checkRateLimit('LOGIN', cleanEmail);
      if (!rateCheck.allowed) {
        setLockoutRemaining(rateCheck.retryAfterSeconds);
        setError(rateCheck.error);
        return;
      }

      setIsLoading(true);
      try {
        await signInWithEmail(cleanEmail, formData.password);
        recordRateLimitAttempt('LOGIN', cleanEmail, true);
        setLockoutRemaining(0);
        if (isAdminEmail(cleanEmail)) {
          navigate('/admin', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      } catch (err) {
        recordRateLimitAttempt('LOGIN', cleanEmail, false);
        const postCheck = checkRateLimit('LOGIN', cleanEmail);
        if (!postCheck.allowed) {
          setLockoutRemaining(postCheck.retryAfterSeconds);
          setError(postCheck.error);
        } else {
          const cleanMsg = getCleanErrorMessage(err);
          if (postCheck.remainingAttempts <= 2) {
            setError(`${cleanMsg} (${postCheck.remainingAttempts} attempt${postCheck.remainingAttempts === 1 ? '' : 's'} remaining before security lockout)`);
          } else {
            setError(cleanMsg);
          }
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. Sign Up Flow
    if (!formData.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setError('Please enter a valid 10-digit phone number for delivery.');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter a valid email.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Pre-check signup rate limit
    const rateCheck = checkRateLimit('SIGNUP', cleanEmail);
    if (!rateCheck.allowed) {
      setLockoutRemaining(rateCheck.retryAfterSeconds);
      setError(rateCheck.error);
      return;
    }

    setIsLoading(true);
    try {
      await signUpWithEmail(cleanEmail, formData.password, formData.fullName, formData.phone);
      recordRateLimitAttempt('SIGNUP', cleanEmail, true);
      setLockoutRemaining(0);
      navigate(from, { replace: true });
    } catch (err) {
      recordRateLimitAttempt('SIGNUP', cleanEmail, false);
      const postCheck = checkRateLimit('SIGNUP', cleanEmail);
      if (!postCheck.allowed) {
        setLockoutRemaining(postCheck.retryAfterSeconds);
        setError(postCheck.error);
      } else {
        setError(getCleanErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);

    // Pre-check Google auth rate limit
    const rateCheck = checkRateLimit('GOOGLE_LOGIN', 'client');
    if (!rateCheck.allowed) {
      setLockoutRemaining(rateCheck.retryAfterSeconds);
      setError(rateCheck.error);
      return;
    }

    setIsLoading(true);
    try {
      await signInWithGoogle();
      recordRateLimitAttempt('GOOGLE_LOGIN', 'client', true);
      setLockoutRemaining(0);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Google Sign In Error Object:', err);
      recordRateLimitAttempt('GOOGLE_LOGIN', 'client', false);
      const postCheck = checkRateLimit('GOOGLE_LOGIN', 'client');
      if (!postCheck.allowed) {
        setLockoutRemaining(postCheck.retryAfterSeconds);
        setError(postCheck.error);
      } else {
        setError(getCleanErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="relative min-h-[92vh] bg-[#F2F4F7] flex flex-col justify-center items-center px-4 py-8 sm:py-12 font-sans overflow-hidden">
      {/* Ambient Saffron Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#ec6d13]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#f4c430]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top back button */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 z-10">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
          title="Return to Menu"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
          <ShieldCheck size={12} className="text-[#ec6d13]" />
          <span className="text-[10px] font-black text-[#ec6d13] uppercase tracking-wider">Heritage Vault</span>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-100/80 rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-slate-900/5">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo size="lg" showSparkle={true} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Delicious <span className="text-[#ec6d13]">Biryani</span>
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            {activeTab === 'login' ? 'Sign in to access your saved addresses & orders' : 'Join the culinary club for instant delivery'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === 'login' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setError(null); }}
            className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === 'signup' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert with Rate Limiting Lockout Support */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-bold ${
              lockoutRemaining > 0 
                ? 'bg-rose-50 border border-rose-300 text-rose-900 shadow-sm' 
                : 'bg-rose-50 border border-rose-200 text-rose-600'
            }`}
          >
            {lockoutRemaining > 0 ? (
              <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            )}
            <div className="flex-1">
              {lockoutRemaining > 0 ? (
                <div>
                  <div className="flex items-center gap-1.5 font-black text-rose-950 mb-0.5">
                    <span>Security Lockout Active</span>
                  </div>
                  <p className="text-rose-700 font-medium leading-relaxed">
                    Too many rapid or failed attempts. Access is paused for safety.
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100/90 rounded-xl text-[11px] font-black text-rose-950 border border-rose-300/80">
                    <Clock size={12} className="animate-pulse text-rose-600" />
                    <span>Cooldown remaining: {formatTimeRemaining(lockoutRemaining)}</span>
                  </div>
                </div>
              ) : (
                <span>{error}</span>
              )}
            </div>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {activeTab === 'signup' && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarthak Bagul"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ec6d13] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Phone Number (For Delivery Rider & WhatsApp)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3 pl-14 pr-4 text-xs font-bold text-slate-900 tracking-wider focus:outline-none focus:border-[#ec6d13] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="name@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ec6d13] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Password
              </label>
              {activeTab === 'login' && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[10px] font-black uppercase tracking-wider text-[#ec6d13] hover:underline"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3 pl-11 pr-11 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ec6d13] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || lockoutRemaining > 0}
            className="w-full mt-2 bg-gradient-to-r from-[#ec6d13] to-[#d35400] text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#ec6d13]/25 saffron-glow hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : lockoutRemaining > 0 ? (
              <span className="flex items-center gap-1.5 text-amber-200">
                <Clock size={14} className="animate-spin text-amber-300" />
                <span>Security Pause ({formatTimeRemaining(lockoutRemaining)})</span>
              </span>
            ) : (
              <>
                <span>{activeTab === 'login' ? 'Sign In & Feast' : 'Create Free Account'}</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200/70" />
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-slate-200/70" />
        </div>

        {/* Fast OAuth Actions */}
        <div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || lockoutRemaining > 0}
            className="w-full bg-white border border-slate-200/90 text-slate-700 py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Kitchen Owner Portal Shortcut */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setFormData(prev => ({ ...prev, email: 'sarthakbagul40@gmail.com' }));
            }}
            className="text-[11px] font-bold text-slate-400 hover:text-[#ec6d13] transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <span>👨‍🍳 Restaurant Owner Login</span>
          </button>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-400 font-medium text-center mt-3">
          By signing in, you agree to our Terms and Kitchen Service Standards.
        </p>
      </div>

      {/* Enhanced Password Reset Modal with 2 Options (Old Password & Email OTP with Database Check) */}
      <PasswordResetModal
        isOpen={showForgotModal}
        onClose={() => {
          setShowForgotModal(false);
          setUrlOtp('');
        }}
        initialEmail={urlEmail || formData.email}
        initialOtp={urlOtp}
        isLoggedIn={false}
        onSuccess={() => {
          setSuccessMsg('Password updated successfully! You can now log in with your new password.');
        }}
      />
    </div>
  );
};

export default Auth;
