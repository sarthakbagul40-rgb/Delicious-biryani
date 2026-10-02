import { Cookie, Shield, CheckCircle2, Trash2, Database, ChevronLeft, ArrowRight, Info, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const CookiePolicy = () => {
  const navigate = useNavigate();

  const storageItems = [
    {
      key: 'cart-storage',
      type: 'Local Storage',
      category: 'Strictly Functional',
      duration: 'Persistent until cleared',
      desc: 'Stores the biryani and side dishes currently in your shopping bag, including quantities and portion choices, so your cart is not lost when refreshing the page.'
    },
    {
      key: 'firebase:authUser:[apiKey]',
      type: 'IndexedDB / Session',
      category: 'Strictly Necessary',
      duration: 'Session / 30 Days',
      desc: 'Stores your cryptographically signed Firebase Authentication token so you remain logged in securely between page navigations without re-entering passwords.'
    },
    {
      key: 'pwd_reset_[email]',
      type: 'Local Storage',
      category: 'Security & Verification',
      duration: '10 Minutes',
      desc: 'Temporarily tracks the client-side state of your 6-digit OTP code and rate-limiting cooldown timers during password reset. Auto-erased upon completion.'
    },
    {
      key: 'cookie_consent_accepted',
      type: 'Local Storage',
      category: 'Preferences',
      duration: '1 Year',
      desc: 'Remembers that you have reviewed and acknowledged our privacy, terms, and storage policies, preventing the consent banner from repeatedly interrupting your browsing.'
    }
  ];

  const handleClearLocalStorage = () => {
    if (window.confirm('Clear all local app storage? This will empty your cart and sign you out.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen pb-24 font-sans max-w-4xl mx-auto px-4 sm:px-6 pt-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 border border-slate-200/80 rounded-2xl flex items-center justify-center text-slate-800 hover:border-primary transition-colors bg-white shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Transparent Browser Storage
        </span>
      </div>

      {/* Hero Banner */}
      <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/70 shadow-sm relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider mb-4">
          <Cookie size={12} />
          <span>Storage & Cookies</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight">
          Cookie & Storage Policy
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2 max-w-2xl leading-relaxed">
          Delicious Biryani utilizes standard browser storage (Cookies & LocalStorage) exclusively to provide basic shopping cart and authentication functions. We do not use third-party advertising trackers or sell your browsing history.
        </p>
      </div>

      {/* Zero Ads Notice */}
      <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-3 mb-8">
        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed font-medium">
          <strong className="font-bold text-emerald-950 block mb-0.5">Zero Third-Party Advertising Trackers:</strong>
          We do not deploy Facebook Meta Pixels, Google AdSense trackers, or cross-site tracking beacons. The storage used on this site exists solely to make food ordering fast and secure.
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="space-y-4 mb-8">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
          Exact Storage Keys & Functional Purposes
        </h2>
        <div className="space-y-3">
          {storageItems.map((item, idx) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4"
            >
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-lg text-slate-800">
                    {item.key}
                  </code>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    {item.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {item.desc}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">
                  {item.category}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {item.duration}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Storage Management Controls */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/70 shadow-sm space-y-4 mb-8">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
          How to Manage or Clear Your Local Storage
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          You can clear your local storage at any time using your browser settings (under Settings → Privacy & Security → Clear Browsing Data) or click the reset button below:
        </p>
        <button
          onClick={handleClearLocalStorage}
          className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
        >
          <Trash2 size={14} />
          <span>Clear Local Biryani Storage</span>
        </button>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-slate-400 pt-4 border-t border-slate-200/80">
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
          <span>•</span>
          <Link to="/" className="hover:text-primary transition-colors">Back to Menu</Link>
        </div>
        <p>© {new Date().getFullYear()} Delicious Biryani Kitchen. All rights reserved.</p>
      </div>
    </div>
  );
};

export default CookiePolicy;
