import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookie_consent_accepted');
      if (!consent) {
        // Show after a brief delay so page loads smoothly
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (_) {}
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('cookie_consent_accepted', 'true');
    } catch (_) {}
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none">
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="pointer-events-auto w-full max-w-xl bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-[28px] p-4 sm:p-5 shadow-2xl shadow-slate-900/10 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            {/* Left: Icon & Description */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 text-[#ec6d13] flex items-center justify-center shrink-0">
                <Cookie size={20} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    Essential Storage & Transparency
                  </h4>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Zero Ad Trackers
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
                  We use secure local storage strictly to keep your biryani cart active, authenticate your session, and verify delivery zones in Palava & Taloja.
                </p>
                <div className="flex gap-2 text-[10px] font-bold text-slate-400 mt-1.5">
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  <span>•</span>
                  <Link to="/cookies" className="text-primary hover:underline">Storage Policy</Link>
                  <span>•</span>
                  <Link to="/terms" className="text-primary hover:underline">Terms</Link>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#ec6d13] to-[#f4c430] text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md shadow-[#ec6d13]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 saffron-glow"
              >
                <Check size={14} strokeWidth={3} />
                <span>Accept & Feast</span>
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsentBanner;
