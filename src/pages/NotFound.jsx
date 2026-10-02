import { useNavigate } from 'react-router-dom';
import { ChefHat, Home, Search, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-6 py-12 text-center font-sans relative overflow-hidden">
      {/* Warm Saffron Glow */}
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[#ec6d13]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-[#f4c430]/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[36px] p-8 sm:p-10 shadow-xl shadow-slate-900/5 space-y-6"
      >
        <div className="w-20 h-20 bg-gradient-to-tr from-[#ec6d13] to-[#f4c430] rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl saffron-glow">
          <ChefHat size={40} />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.25em] bg-primary/10 border border-primary/20 px-3 py-1 rounded-full inline-block">
            404 Error
          </span>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
            Recipe Not Found
          </h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
            The page you are looking for has been retired or moved. Let's guide you back to our freshly prepared menu.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#ec6d13] text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 saffron-glow hover:bg-[#d35400] transition-colors active:scale-95 shadow-lg shadow-[#ec6d13]/25"
          >
            <Home size={16} />
            <span>Return to Menu</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/search')}
              className="bg-slate-50 border border-slate-200/80 text-slate-700 py-3 px-4 rounded-2xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors active:scale-95"
            >
              <Search size={14} />
              <span>Search Dishes</span>
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="bg-slate-50 border border-slate-200/80 text-slate-700 py-3 px-4 rounded-2xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors active:scale-95"
            >
              <ShoppingBag size={14} />
              <span>My Orders</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
