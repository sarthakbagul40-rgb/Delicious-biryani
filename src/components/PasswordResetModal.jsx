import { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  ShieldCheck, 
  ShieldAlert,
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RotateCcw, 
  ArrowRight, 
  Loader2, 
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  checkUserExistsInDatabase, 
  sendPasswordResetOTP, 
  verifyPasswordResetOTP, 
  completePasswordResetWithOTP, 
  changePasswordWithOldPassword 
} from '../lib/passwordResetService';
import { 
  checkRateLimit, 
  formatTimeRemaining 
} from '../lib/rateLimiter';

const PasswordResetModal = ({ 
  isOpen, 
  onClose, 
  initialEmail = '', 
  initialOtp = '',
  isLoggedIn = false, 
  onSuccess 
}) => {
  // Tabs: 'oldPassword' | 'emailOtp'
  const [activeTab, setActiveTab] = useState(isLoggedIn ? 'oldPassword' : 'emailOtp');

  // Shared Email State
  const [email, setEmail] = useState(initialEmail);
  const [emailStatus, setEmailStatus] = useState(null); // 'checking' | 'verified' | 'not_found' | null
  const [userRecord, setUserRecord] = useState(null);

  // Form State: Old Password Tab
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State: Email OTP Tab (steps: 1 = email, 2 = otp, 3 = newPassword, 4 = done)
  const [otpStep, setOtpStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Global UX state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [successMsg, setSuccessMsg] = useState(null);

  // Live lockout countdown timer
  useEffect(() => {
    let timer;
    if (lockoutRemaining > 0) {
      timer = setInterval(() => {
        setLockoutRemaining(prev => {
          if (prev <= 1) {
            setErrorMsg(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  // Initialize or reset when modal opens (and handle 1-Click link auto-verification)
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setErrorMsg(null);
      setSuccessMsg(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setEmailStatus(null);

      if (initialOtp && initialOtp.length === 6) {
        setOtpCode(initialOtp);
        setActiveTab('emailOtp');
        setOtpStep(2);
        setIsProcessing(true);
        verifyPasswordResetOTP(initialEmail || '', initialOtp)
          .then(() => {
            setOtpStep(3); // Jump straight to Set New Password screen!
            setIsProcessing(false);
          })
          .catch((err) => {
            setIsProcessing(false);
            setErrorMsg(err.message || '1-Click link invalid or expired. Please request a new code.');
          });
      } else {
        setOtpCode('');
        setOtpStep(1);
        if (!isLoggedIn) {
          setActiveTab('emailOtp');
        }
      }
    }
  }, [isOpen, initialEmail, initialOtp, isLoggedIn]);

  // Resend Countdown Timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  // 1. Handle Tab 1: Change with Old Password
  const handleSubmitOldPassword = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetEmail = (email || initialEmail || '').trim().toLowerCase();
    if (!targetEmail) {
      setErrorMsg('Please enter your account email address.');
      return;
    }
    if (!oldPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match. Please verify.');
      return;
    }

    // Pre-check rate limit
    const rateCheck = checkRateLimit('OLD_PASSWORD_CHANGE', targetEmail);
    if (!rateCheck.allowed) {
      setLockoutRemaining(rateCheck.retryAfterSeconds);
      setErrorMsg(rateCheck.error);
      return;
    }

    setIsProcessing(true);
    try {
      // First verify user existence in database if not logged in
      if (!isLoggedIn) {
        const existence = await checkUserExistsInDatabase(targetEmail);
        if (!existence.exists) {
          setErrorMsg(existence.reason || 'No account found with this email in our database.');
          setIsProcessing(false);
          return;
        }
      }

      await changePasswordWithOldPassword(targetEmail, oldPassword, newPassword);
      setLockoutRemaining(0);
      setSuccessMsg('Your password has been changed successfully! Your account is secured.');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Password change error:', err);
      if (err.code === 'RATE_LIMIT_EXCEEDED' || err.retryAfterSeconds) {
        setLockoutRemaining(err.retryAfterSeconds || 300);
      } else {
        const postCheck = checkRateLimit('OLD_PASSWORD_CHANGE', targetEmail);
        if (!postCheck.allowed) {
          setLockoutRemaining(postCheck.retryAfterSeconds);
        }
      }
      setErrorMsg(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Handle Tab 2 Step 1: Send OTP to Email
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const targetEmail = (email || initialEmail || '').trim().toLowerCase();
    if (!targetEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    // Pre-check OTP request rate limit
    const rateCheck = checkRateLimit('PASSWORD_RESET_REQUEST', targetEmail);
    if (!rateCheck.allowed) {
      setLockoutRemaining(rateCheck.retryAfterSeconds);
      setErrorMsg(rateCheck.error);
      return;
    }

    setIsProcessing(true);
    setEmailStatus('checking');

    try {
      // Step A: Check if user exists in database
      const check = await checkUserExistsInDatabase(targetEmail);
      if (!check.exists) {
        setEmailStatus('not_found');
        setErrorMsg(check.reason || 'No account found with this email in our database. Please check your spelling or sign up.');
        setIsProcessing(false);
        return;
      }

      setEmailStatus('verified');
      setUserRecord(check.user);

      // Step B: Send OTP & official reset link
      await sendPasswordResetOTP(targetEmail);
      setCountdown(60);
      setLockoutRemaining(0);
      setOtpStep(2);
    } catch (err) {
      console.error('Send OTP error:', err);
      if (err.code === 'RATE_LIMIT_EXCEEDED' || err.retryAfterSeconds) {
        setLockoutRemaining(err.retryAfterSeconds || 600);
      }
      setErrorMsg(err.message || 'Failed to send OTP. Please check your email.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Handle Tab 2 Step 2: Verify 6-digit OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP code.');
      return;
    }

    const cleanEmail = (email || initialEmail || '').trim().toLowerCase();

    // Pre-check OTP verification rate limit
    const rateCheck = checkRateLimit('OTP_VERIFY', cleanEmail);
    if (!rateCheck.allowed) {
      setLockoutRemaining(rateCheck.retryAfterSeconds);
      setErrorMsg(rateCheck.error);
      return;
    }

    setIsProcessing(true);
    try {
      await verifyPasswordResetOTP(cleanEmail, cleanOtp);
      setLockoutRemaining(0);
      setOtpStep(3); // Proceed to setting new password
    } catch (err) {
      console.error('Verify OTP error:', err);
      if (err.code === 'RATE_LIMIT_EXCEEDED' || err.retryAfterSeconds) {
        setLockoutRemaining(err.retryAfterSeconds || 900);
      } else {
        const postCheck = checkRateLimit('OTP_VERIFY', cleanEmail);
        if (!postCheck.allowed) {
          setLockoutRemaining(postCheck.retryAfterSeconds);
        }
      }
      setErrorMsg(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Handle Tab 2 Step 3: Complete Reset with New Password
  const handleSaveNewPasswordWithOTP = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setIsProcessing(true);
    try {
      await completePasswordResetWithOTP(email, newPassword);
      setOtpStep(4); // Success screen
      setSuccessMsg('Your password has been reset successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Complete OTP reset error:', err);
      if (err.code === 'NO_ADMIN_CREDENTIALS') {
        setErrorMsg(`Action Required: Firebase requires server credentials (serviceAccountKey.json) to directly overwrite passwords for unauthenticated sessions. Please check your Gmail inbox (${email}) for the official Firebase reset link, or sign in with Google.`);
      } else {
        setErrorMsg(err.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-lg bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-hidden my-6"
        >
          {/* Ambient Royal Flare */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-[#f4c430]/20 to-[#ec6d13]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors z-20"
            title="Close"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-[#f4c430] to-[#ec6d13] p-2.5 text-slate-950 flex items-center justify-center shadow-lg saffron-glow shrink-0">
              <ShieldCheck size={26} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Reset Account Password
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Two-tier safe credentials update for your account
              </p>
            </div>
          </div>

          {/* Method Selection Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 rounded-2xl mb-6 relative z-10">
            <button
              type="button"
              onClick={() => {
                setActiveTab('oldPassword');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeTab === 'oldPassword'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound size={14} className={activeTab === 'oldPassword' ? 'text-[#ec6d13]' : ''} />
              <span>Old Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('emailOtp');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeTab === 'emailOtp'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail size={14} className={activeTab === 'emailOtp' ? 'text-[#ec6d13]' : ''} />
              <span>Email OTP Reset</span>
            </button>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 mb-5 rounded-2xl border text-xs font-bold flex items-start gap-2.5 ${
                lockoutRemaining > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm'
                  : 'bg-rose-50 border border-rose-200/80 text-rose-700'
              }`}
            >
              {lockoutRemaining > 0 ? (
                <ShieldAlert size={18} className="shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              )}
              <div className="flex-1 leading-relaxed">
                {lockoutRemaining > 0 ? (
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-rose-950 mb-0.5">
                      <span>Security Lockout Active</span>
                    </div>
                    <p className="text-rose-700 font-medium">
                      {errorMsg}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100/90 rounded-xl text-[11px] font-black text-rose-950 border border-rose-300/80">
                      <Clock size={12} className="animate-pulse text-rose-600" />
                      <span>Cooldown remaining: {formatTimeRemaining(lockoutRemaining)}</span>
                    </div>
                  </div>
                ) : (
                  <span>{errorMsg}</span>
                )}
              </div>
            </motion.div>
          )}

          {/* Success Message Box */}
          {successMsg && activeTab === 'oldPassword' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 mb-5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold flex items-center gap-2.5"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <div>{successMsg}</div>
            </motion.div>
          )}

          {/* TAB 1: OLD PASSWORD FLOW */}
          {activeTab === 'oldPassword' && (
            <form onSubmit={handleSubmitOldPassword} className="space-y-4 relative z-10">
              {/* Account Email (Readonly if logged in, editable if not logged in) */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    readOnly={isLoggedIn}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patron@gmail.com"
                    required
                    className={`w-full border rounded-2xl py-3 pl-11 pr-4 text-xs font-bold transition-all ${
                      isLoggedIn 
                        ? 'bg-slate-100/70 border-slate-200 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-[#ec6d13] focus:outline-none'
                    }`}
                  />
                </div>
              </div>

              {/* Current Password Field */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                  Current / Old Password (For Safety)
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-11 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#ec6d13] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                  New Password (Min. 6 Characters)
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    minLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-11 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#ec6d13] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <CheckCircle2 size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                    confirmPassword && confirmPassword === newPassword ? 'text-emerald-500' : 'text-slate-400'
                  }`} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-11 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#ec6d13] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing || lockoutRemaining > 0}
                className="w-full bg-gradient-to-r from-[#ec6d13] to-[#f4c430] text-slate-950 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#ec6d13]/25 hover:scale-[1.01] active:scale-[0.99] transition-all saffron-glow mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying & Updating...</span>
                  </>
                ) : lockoutRemaining > 0 ? (
                  <span className="flex items-center gap-1.5 text-rose-950">
                    <Clock size={14} className="animate-spin text-rose-600" />
                    <span>Security Pause ({formatTimeRemaining(lockoutRemaining)})</span>
                  </span>
                ) : (
                  <>
                    <span>Confirm & Change Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center pt-1 font-medium">
                Don't remember your old password? Switch to the{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('emailOtp')}
                  className="text-[#ec6d13] font-bold hover:underline"
                >
                  Email OTP Reset
                </button>
              </p>
            </form>
          )}

          {/* TAB 2: EMAIL OTP FLOW */}
          {activeTab === 'emailOtp' && (
            <div className="relative z-10">
              {/* STEP 1: Enter Email & Verify in Database */}
              {otpStep === 1 && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <Sparkles size={14} className="text-[#ec6d13]" />
                      <span>Instant Email Verification</span>
                    </p>
                    <p className="text-slate-600 font-medium">
                      Enter your account email. If present in our database, we will immediately generate and send a 6-digit OTP code to verify your identity.
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                      Your Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your-email@gmail.com"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#ec6d13] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || lockoutRemaining > 0}
                    className="w-full bg-gradient-to-r from-[#ec6d13] to-[#f4c430] text-slate-950 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#ec6d13]/25 hover:scale-[1.01] active:scale-[0.99] transition-all saffron-glow mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verifying Database...</span>
                      </>
                    ) : lockoutRemaining > 0 ? (
                      <span className="flex items-center gap-1.5 text-rose-950">
                        <Clock size={14} className="animate-spin text-rose-600" />
                        <span>Security Pause ({formatTimeRemaining(lockoutRemaining)})</span>
                      </span>
                    ) : (
                      <>
                        <span>Send 6-Digit OTP Code</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Enter 6-Digit OTP */}
              {otpStep === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="text-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <p className="text-xs font-bold text-slate-600">
                      We sent a 6-digit OTP code to:
                    </p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">
                      {email}
                    </p>
                    <button
                      type="button"
                      onClick={() => setOtpStep(1)}
                      className="text-[11px] font-bold text-[#ec6d13] hover:underline mt-1 inline-block"
                    >
                      Change Email Address
                    </button>
                  </div>

                  {/* Real Email Dispatch Delivery Confirmation */}
                  <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-xs">
                    <div className="flex items-start gap-2.5">
                      <Mail size={16} className="text-[#ec6d13] shrink-0 mt-0.5" />
                      <div className="text-slate-700 leading-relaxed">
                        <strong className="text-slate-900 block font-bold mb-0.5">Check your inbox & spam folder:</strong>
                        A 6-digit verification code and reset instructions have been sent to your email address from Delicious Biryani. Enter your 6-digit code below to proceed.
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 text-center">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      required
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 text-center font-mono text-xl tracking-[0.5em] font-black text-slate-900 focus:bg-white focus:border-[#ec6d13] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                    <span>Didn't receive code?</span>
                    {countdown > 0 ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock size={12} /> Resend in {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={isProcessing}
                        className="text-[#ec6d13] hover:underline flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Resend Code
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || otpCode.length !== 6 || lockoutRemaining > 0}
                    className="w-full bg-gradient-to-r from-[#ec6d13] to-[#f4c430] text-slate-950 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#ec6d13]/25 hover:scale-[1.01] active:scale-[0.99] transition-all saffron-glow disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : lockoutRemaining > 0 ? (
                      <span className="flex items-center gap-1.5 text-rose-950">
                        <Clock size={14} className="animate-spin text-rose-600" />
                        <span>Security Pause ({formatTimeRemaining(lockoutRemaining)})</span>
                      </span>
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 3: Enter New Password */}
              {otpStep === 3 && (
                <form onSubmit={handleSaveNewPasswordWithOTP} className="space-y-4">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Identity Verified! Set your new password below.</span>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                      New Password (Min. 6 Characters)
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Create new password"
                        required
                        minLength={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-11 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#ec6d13] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <CheckCircle2 size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                        confirmPassword && confirmPassword === newPassword ? 'text-emerald-500' : 'text-slate-400'
                      }`} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-11 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#ec6d13] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-[#ec6d13] to-[#f4c430] text-slate-950 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#ec6d13]/25 hover:scale-[1.01] active:scale-[0.99] transition-all saffron-glow mt-4"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Save & Complete Reset</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 4: Success Screen */}
              {otpStep === 4 && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Password Reset Successfully!
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1 max-w-xs mx-auto">
                      Your credentials have been securely updated. You can now use your new password.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-md"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PasswordResetModal;
