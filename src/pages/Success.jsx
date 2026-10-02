import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  CheckCircle2, ChevronRight, Package, Truck, Star, Heart, 
  MessageCircle, Clock, MapPin, ChefHat, Copy, Check, 
  Phone, ArrowRight, ShieldCheck, Flame 
} from 'lucide-react';
import { motion } from 'framer-motion';
import useCartStore from '../store/useCartStore';

const Success = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const clearCart = useCartStore((state) => state.clearCart);
  const lastOrderId = useCartStore((state) => state.lastOrderId);

  const [copied, setCopied] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(30);

  // Grab data passed via navigation state or fallback to persisted lastOrderId
  const orderId = location.state?.orderId || lastOrderId || 'ORD-' + Date.now().toString(36).slice(-6).toUpperCase();
  const customerName = location.state?.customerName || 'Biryani Patron';
  const total = location.state?.total;
  const paymentMethod = location.state?.paymentMethod || 'upi';
  const waLink = location.state?.waLink || `https://wa.me/919769793452?text=${encodeURIComponent(`Hello Delicious Biryani, tracking my order #${orderId.slice(-6).toUpperCase()}`)}`;

  useEffect(() => {
    // Ensure cart is cleared upon entering success page
    clearCart();
    
    // Live countdown simulation: slowly decreases ETA between 35 and 20 mins
    const timer = setInterval(() => {
      setEtaMinutes(prev => (prev > 20 ? prev - 1 : 25));
    }, 60000);
    return () => clearInterval(timer);
  }, [clearCart]);

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] px-4 sm:px-6 py-8 pb-28 font-sans flex flex-col items-center justify-center">
      <div className="w-full max-w-xl mx-auto space-y-6">
        {/* Celebration Hero Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 220 }}
          className="text-center space-y-3"
        >
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
              <CheckCircle2 size={54} strokeWidth={2.5} />
            </div>
            {/* Dum steam badge */}
            <motion.div 
              animate={{ y: [-2, -8, -2], opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-primary text-slate-950 flex items-center justify-center font-black shadow-lg"
            >
              <Flame size={18} />
            </motion.div>
          </div>

          <div className="pt-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Order Confirmed & Dum Cooking Started
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">
              Feast is in the Handi!
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium max-w-md mx-auto mt-1">
              Thank you, <strong className="text-slate-900">{customerName}</strong>! Our kitchen chef has sealed your authentic dum handi with fresh dough.
            </p>
          </div>
        </motion.div>

        {/* Order Reference Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Official Order Reference
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 tracking-wider">
                #{orderId.slice(-6).toUpperCase()}
              </span>
            </div>
            <button
              onClick={copyOrderId}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy Ref'}</span>
            </button>
          </div>

          {/* Delivery ETA & Gate Guarantee */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
              <div className="flex items-center gap-1.5 text-[#ec6d13] mb-1">
                <Clock size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">Estimated Time</span>
              </div>
              <p className="text-lg font-black text-slate-900 leading-none">25–35 Mins</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Authentic Slow Dum Steaming</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center gap-1.5 text-slate-700 mb-1">
                <MapPin size={16} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-wider">Delivery Zone</span>
              </div>
              <p className="text-xs font-black text-slate-900 leading-snug">Palava & Taloja Gate</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Rider will call upon arrival</p>
            </div>
          </div>
        </motion.div>

        {/* Live Stepper Status Bridge */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-3.5 text-left"
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
              <ChefHat size={16} className="text-primary" />
              <span>Kitchen Dum Progress</span>
            </h3>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              Step 2 of 3 Active
            </span>
          </div>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Check size={16} strokeWidth={3} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 leading-none">Order Received & Payment Logged</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Recorded in kitchen ledger ({paymentMethod.toUpperCase()})</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary text-slate-950 flex items-center justify-center shrink-0 animate-pulse">
                <Flame size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 leading-none">Handi Sealed & Slow-Dum Steaming</p>
                <p className="text-[10px] text-primary font-bold mt-0.5">Whole spices infusing aroma in natural clay</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 opacity-60">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                <Truck size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 leading-none">Rider Gate Dispatch & Delivery Call</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Dispatched to your building entrance with hot bag</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Primary Action Buttons: The Live Tracking Bridge */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          {/* Track Order Live Button */}
          <button 
            onClick={() => navigate('/orders')}
            className="w-full bg-slate-900 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-between hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-98 saffron-glow"
          >
            <span>Track Handi Status Live in Orders</span>
            <ArrowRight size={18} strokeWidth={3} />
          </button>

          {/* Kitchen WhatsApp Button */}
          <a 
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-white text-emerald-700 border-2 border-emerald-200 py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors shadow-sm"
          >
            <MessageCircle size={16} className="text-emerald-600" />
            <span>Open Kitchen WhatsApp Receipt</span>
          </a>

          {/* Explore Menu Link */}
          <div className="pt-2 text-center">
            <Link 
              to="/" 
              className="text-xs font-bold text-slate-500 hover:text-primary transition-colors underline"
            >
              ← Return to Delicious Biryani Menu
            </Link>
          </div>
        </motion.div>

        {/* Kitchen Desk Reassurance */}
        <div className="text-center text-[10px] text-slate-400 pt-2 flex items-center justify-center gap-2">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>FSSAI Compliant • Direct Kitchen Desk: +91 9769793452</span>
        </div>
      </div>
    </div>
  );
};

export default Success;
