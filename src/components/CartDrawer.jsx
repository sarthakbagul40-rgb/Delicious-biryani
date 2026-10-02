import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  LogIn, 
  ShieldCheck, 
  Sparkles,
  UtensilsCrossed
} from 'lucide-react';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';

const CartDrawer = () => {
  const navigate = useNavigate();
  const { cart, isCartOpen, closeCart, updateQuantity, removeFromCart, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const totalCount = cart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  const totalAmount = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  const handleCheckoutClick = () => {
    closeCart();
    navigate('/checkout');
  };

  const handleLoginClick = () => {
    closeCart();
    navigate('/auth');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-over Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full sm:w-[480px] max-w-full bg-[#F2F4F7] h-full shadow-2xl flex flex-col z-10 overflow-hidden font-sans border-l border-slate-200/80"
          >
            {/* Header */}
            <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">
                    Your Cart
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {totalCount} {totalCount === 1 ? 'Dish Selected' : 'Dishes Selected'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all items from your cart?')) {
                        clearCart();
                      }
                    }}
                    title="Empty Cart"
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  onClick={closeCart}
                  className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Cart Items or Empty State */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-300 mb-5">
                    <UtensilsCrossed size={36} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
                    Your Cart is Empty
                  </h3>
                  <p className="text-xs font-medium text-slate-400 max-w-xs mb-8 leading-relaxed">
                    You haven't added any fresh Dum Biryani or starters yet. Browse our menu to fill your cart!
                  </p>
                  <button
                    onClick={() => {
                      closeCart();
                      navigate('/');
                    }}
                    className="bg-primary text-slate-950 px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all"
                  >
                    Explore Menu
                  </button>
                </div>
              ) : (
                <>
                  {/* Items List */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">
                      Selected Items
                    </p>
                    {cart.map((item) => (
                      <div
                        key={`${item.id}-${item.size || 'Standard'}`}
                        className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-sm flex gap-3.5 items-center transition-all"
                      >
                        {/* Dish Image */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={item.image || item.image_url || '/assets/main_course/chicken_curry.png'}
                            alt={item.title || item.name}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/assets/main_course/chicken_curry.png';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight truncate leading-snug">
                              {item.title || item.name}
                            </h4>
                            <button
                              onClick={() => removeFromCart(item.id, item.size)}
                              className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                              title="Remove item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            {item.size && item.size !== 'Standard' && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                                {item.size}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400">
                              ₹{item.price} each
                            </span>
                          </div>

                          {/* Stepper + Subtotal */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl p-1">
                              <button
                                onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                                className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-700 hover:text-primary transition-colors active:scale-95"
                              >
                                <Minus size={12} strokeWidth={2.5} />
                              </button>
                              <span className="font-black text-xs w-5 text-center text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                                className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-700 hover:text-primary transition-colors active:scale-95"
                              >
                                <Plus size={12} strokeWidth={2.5} />
                              </button>
                            </div>

                            <p className="text-sm font-black text-slate-900">
                              ₹{(Number(item.price) || 0) * (Number(item.quantity) || 1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bill Details */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Bill Summary
                    </p>
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>Item Subtotal</span>
                      <span className="font-bold text-slate-900">₹{totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>Delivery Partner Fee</span>
                      <span className="font-bold text-emerald-600 uppercase text-[10px] tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                        FREE
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>Restaurant Packaging</span>
                      <span className="font-bold text-emerald-600 uppercase text-[10px] tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                        FREE
                      </span>
                    </div>
                    <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Total Amount
                      </span>
                      <span className="text-lg font-black text-slate-900 leading-none">
                        ₹{totalAmount}
                      </span>
                    </div>
                  </div>

                  {/* Trust Banner */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center gap-3">
                    <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                    <p className="text-[10px] font-bold text-emerald-950 leading-relaxed uppercase tracking-wider">
                      Direct Kitchen Order • Pure Hyderabadi Dum Recipe
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Action Footer */}
            {cart.length > 0 && (
              <div className="bg-white p-5 border-t border-slate-100 shrink-0 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                {/* When User is NOT Logged In */}
                {!user ? (
                  <div className="space-y-3">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center gap-2.5">
                      <LogIn size={18} className="text-amber-600 shrink-0" />
                      <p className="text-[10px] font-bold text-amber-900 leading-snug">
                        <strong className="uppercase">Sign In Required:</strong> Please log in or sign up first so our kitchen can verify delivery to your address.
                      </p>
                    </div>

                    <button
                      onClick={handleLoginClick}
                      className="w-full bg-primary text-slate-950 p-4 rounded-2xl font-black uppercase tracking-[0.15em] text-xs flex justify-between items-center shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all"
                    >
                      <span>Login / Sign Up to Checkout</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                ) : (
                  /* When User IS Logged In */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                      <span>Ready to order</span>
                      <span className="text-emerald-600 font-bold">Logged in as {user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
                    </div>

                    <button
                      onClick={handleCheckoutClick}
                      className="w-full bg-slate-900 text-white p-4 sm:p-5 rounded-2xl font-black uppercase tracking-[0.15em] text-xs flex justify-between items-center shadow-xl shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black">₹{totalAmount}</span>
                        <span className="text-slate-400 text-[10px]">|</span>
                        <span>Proceed to Checkout</span>
                      </div>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
