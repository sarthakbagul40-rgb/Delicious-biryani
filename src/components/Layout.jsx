import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, WifiOff, Zap, MapPin, ChevronRight, Check, AlertCircle, AlertTriangle, Info, X, ChefHat, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import { useNetworkStatus } from '../lib/networkUtils';
import { isAdminUser } from '../lib/adminConfig';
import { getSiteAnnouncement } from '../lib/promoService';
import CartDrawer from './CartDrawer';
import BrandLogo from './BrandLogo';
import CookieConsentBanner from './CookieConsentBanner';

const Layout = () => {
  const location = useLocation();
  const { cart, openCart, toastMessage, clearToast } = useCartStore();
  const { user, userProfile } = useAuthStore();
  const { isOnline, isSlow } = useNetworkStatus();
  const [isBumping, setIsBumping] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(false);

  const isOwner = isAdminUser(user, userProfile);

  useEffect(() => {
    getSiteAnnouncement().then(ann => {
      if (ann && ann.enabled) setAnnouncement(ann);
    });

    const handleUpdate = (e) => {
      if (e.detail && e.detail.enabled) {
        setAnnouncement(e.detail);
        setIsAnnouncementDismissed(false);
      } else {
        setAnnouncement(null);
      }
    };
    window.addEventListener('site_announcement_updated', handleUpdate);
    return () => window.removeEventListener('site_announcement_updated', handleUpdate);
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  const cartTotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  useEffect(() => {
    if (toastMessage) {
      if (toastMessage.type === 'cart') {
        setIsBumping(true);
        const bumpTimer = setTimeout(() => setIsBumping(false), 700);
      }
      const duration = toastMessage.duration || 3200;
      const toastTimer = setTimeout(() => clearToast(), duration);
      return () => {
        clearTimeout(toastTimer);
      };
    }
  }, [toastMessage, clearToast]);

  // Orders tab is exclusively for order history and tracking — cart count is not mixed with Orders
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: ShoppingBag, label: 'Orders', path: '/orders' },
    { icon: User, label: 'Profile', path: '/profile', isProfile: true }
  ];

  return (
    <div className="min-h-screen bg-[#F2F4F7] font-sans text-slate-900 flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Low-connection / Offline Indicator */}
      {(!isOnline || isSlow) && (
        <div className="bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2 text-center flex items-center justify-center gap-2 sticky top-0 z-[60] shadow-sm">
          {!isOnline ? <WifiOff size={14} /> : <Zap size={14} />}
          <span>
            {!isOnline 
              ? 'Offline mode active — Instant local menu loaded. WhatsApp checkout is ready!' 
              : 'Slow connection detected — Instant lightweight mode enabled for lightning speed.'}
          </span>
        </div>
      )}

      {/* Dynamic Storefront Announcement Banner (Controlled from Admin) */}
      {announcement && announcement.enabled && !isAnnouncementDismissed && (
        <div className="bg-gradient-to-r from-amber-500 via-[#ec6d13] to-orange-600 text-slate-950 px-4 py-2 text-xs font-bold shadow-sm relative flex items-center justify-center gap-2">
          <span className="bg-slate-950 text-amber-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0">
            {announcement.badge || '🔥 OFFER'}
          </span>
          <span className="text-white font-bold truncate max-w-xl text-center">
            {announcement.text}
          </span>
          <button
            onClick={() => setIsAnnouncementDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-1"
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Desktop Navigation (Visible on Tablet / Laptop / Desktop / 4K) - Hidden on /admin */}
      {location.pathname !== '/admin' && (
        <header className="hidden md:block bg-white/95 backdrop-blur-xl border-b border-slate-200/70 sticky top-0 z-40 transition-all shadow-sm">
        <div className="max-w-7xl 2xl:max-w-[1920px] mx-auto px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <BrandLogo size="md" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase leading-none">
                Delicious Biryani
              </h1>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1 flex items-center gap-1">
                <MapPin size={10} /> Palava & Taloja Direct Kitchen
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                    isActive 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-100' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action */}
          <div className="flex items-center gap-3">
            {isOwner && (
              <Link
                to="/admin"
                className="px-3.5 py-2 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200/90 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-amber-100 transition-colors shadow-sm"
                title="Open Kitchen Admin Terminal"
              >
                <ChefHat size={15} className="text-[#ec6d13]" />
                <span>Kitchen Admin</span>
              </Link>
            )}
            <motion.button
              animate={isBumping ? { scale: [1, 1.15, 0.95, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              onClick={openCart}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 shadow-lg transition-all active:scale-95 ${
                isBumping 
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
                  : 'bg-slate-900 text-white shadow-black/10 hover:bg-slate-800'
              }`}
            >
              {isBumping ? (
                <Check size={16} strokeWidth={3} className="text-emerald-300" />
              ) : (
                <ShoppingBag size={16} />
              )}
              <span>Cart ({cartCount})</span>
            </motion.button>
            {user ? (
              <Link to="/profile" className="w-10 h-10 rounded-2xl border-2 border-primary/20 overflow-hidden hover:border-primary transition-colors">
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'biryani'}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=biryani';
                  }}
                />
              </Link>
            ) : (
              <Link 
                to="/auth" 
                className="bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Universal Multi-Type Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <div className="fixed top-16 sm:top-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <motion.div
              key={toastMessage.id}
              initial={{ y: -40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              className={`pointer-events-auto backdrop-blur-xl text-white px-4 sm:px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
                toastMessage.type === 'error'
                  ? 'bg-rose-950/95 border-rose-500/40 shadow-rose-950/30'
                  : toastMessage.type === 'warning'
                  ? 'bg-amber-950/95 border-amber-500/40 shadow-amber-950/30'
                  : toastMessage.type === 'info'
                  ? 'bg-slate-900/95 border-primary/40 shadow-slate-950/40'
                  : 'bg-slate-900/95 border-emerald-500/30 shadow-slate-950/40'
              }`}
            >
              {/* Toast Icon */}
              {toastMessage.type === 'error' ? (
                <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center font-black shadow-sm shrink-0">
                  <AlertCircle size={14} strokeWidth={2.5} />
                </div>
              ) : toastMessage.type === 'warning' ? (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm shrink-0">
                  <AlertTriangle size={14} strokeWidth={2.5} />
                </div>
              ) : toastMessage.type === 'info' ? (
                <div className="w-6 h-6 rounded-full bg-primary text-slate-950 flex items-center justify-center font-black shadow-sm shrink-0">
                  <Info size={14} strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-sm shrink-0">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}

              {/* Toast Text Content */}
              <div className="text-left text-xs max-w-xs sm:max-w-md">
                {toastMessage.type === 'cart' ? (
                  <p className="font-bold text-slate-200">
                    Added <span className="text-white font-black">{toastMessage.title}</span> to cart
                  </p>
                ) : (
                  <div>
                    {toastMessage.title && (
                      <p className="font-black text-white leading-tight">
                        {toastMessage.title}
                      </p>
                    )}
                    {toastMessage.message && (
                      <p className="text-[11px] text-slate-300 font-medium">
                        {toastMessage.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button for Cart Toast */}
              {toastMessage.type === 'cart' && (
                <button
                  onClick={openCart}
                  className="ml-2 bg-primary text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full hover:scale-105 active:scale-95 transition-transform shadow-sm shrink-0"
                >
                  View Cart
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={clearToast}
                className="ml-1 text-slate-400 hover:text-white p-1 rounded-full transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X size={13} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Outlet */}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex-1 w-full max-w-7xl 2xl:max-w-[1920px] mx-auto pb-24 md:pb-12 overflow-x-hidden"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      {/* Brand & Compliance Footer */}
      {location.pathname !== '/auth' && (
        <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-md py-8 px-6 text-slate-500 text-xs mb-20 md:mb-0 transition-colors">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="font-black text-slate-800 uppercase tracking-tight">Delicious Biryani • Palava & Taloja Kitchen</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Authentic Handi Dum Cooking • Direct to Society Gates</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3.5 text-[11px] font-bold text-slate-600">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <span className="text-slate-300">•</span>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <span className="text-slate-300">•</span>
              <Link to="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link>
              <span className="text-slate-300">•</span>
              <a href="https://wa.me/919769793452" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors text-emerald-600">Kitchen WhatsApp</a>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] text-slate-400 max-w-4xl mx-auto">
            <span>© {new Date().getFullYear()} Delicious Biryani. All rights reserved.</span>
            <span className="flex items-center gap-1.5 font-medium text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              DPDPA 2023 Compliant • FSSAI Kitchen Standards
            </span>
          </div>
        </footer>
      )}

      {/* Floating Bottom Cart Bar (Mobile only — avoids overlapping navbar on desktop) */}
      <AnimatePresence>
        {cartCount > 0 && location.pathname !== '/checkout' && location.pathname !== '/auth' && location.pathname !== '/admin' && (
          <div className="md:hidden fixed bottom-24 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
            <motion.button
              initial={{ y: 30, opacity: 0, scale: 0.95 }}
              animate={isBumping ? { y: 0, opacity: 1, scale: [1, 1.05, 0.98, 1.02, 1] } : { y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              whileTap={{ scale: 0.98 }}
              onClick={openCart}
              className="pointer-events-auto w-full max-w-md bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl shadow-slate-900/30 flex items-center justify-between saffron-glow transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-slate-950 flex items-center justify-center font-black">
                  <ShoppingBag size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-wider text-white">
                    {cartCount} {cartCount === 1 ? 'Dish' : 'Dishes'} in Cart
                  </p>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">
                    ₹{cartTotal} • View Cart
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary pr-1">
                <span>View Cart</span>
                <ChevronRight size={16} strokeWidth={3} />
              </div>
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Navigation Bar (Centered dock on Mobile, Tablet & Desktop) - hidden on /auth & /admin */}
      {location.pathname !== '/auth' && location.pathname !== '/admin' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-4 sm:pb-6 px-4 safe-bottom">
          <nav className="pointer-events-auto w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 rounded-3xl py-3 px-6 flex justify-between items-center">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.label} 
                  to={item.path} 
                  className={`relative flex flex-col items-center gap-1 transition-all active:scale-95 ${
                    isActive ? 'text-primary font-bold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {item.isProfile && user ? (
                    <div className={`w-6 h-6 rounded-full border-2 overflow-hidden ${isActive ? 'border-primary' : 'border-slate-200'}`}>
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'biryani'}`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=biryani';
                        }}
                      />
                    </div>
                  ) : (
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Universal Cart Drawer Component */}
      <CartDrawer />

      {/* Cookie & Storage Transparency Banner */}
      <CookieConsentBanner />
    </div>
  );
};

export default Layout;
