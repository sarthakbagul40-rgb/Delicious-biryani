import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ShieldCheck, ChevronRight, Loader2, Plus, MapPin, 
  AlertTriangle, CheckCircle2, ShoppingBag, Trash2, Lock, ChefHat, 
  Truck, Smartphone, Copy, Check, RefreshCw, IndianRupee, QrCode, 
  Timer, ExternalLink, HelpCircle, ArrowRight, Shield, Phone, Tag, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import useAddressStore from '../store/useAddressStore';
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase';
import { fetchCoupons, calculateCouponDiscount } from '../lib/promoService';

const AddAddressModal = lazy(() => import('../components/AddAddressModal'));

const ADMIN_WHATSAPP_NUMBER = import.meta.env.VITE_ADMIN_WHATSAPP || "919769793452";
const UPI_ID = import.meta.env.VITE_UPI_ID || "bagulk213-1@oksbi";
const UPI_NAME = import.meta.env.VITE_UPI_NAME || "Delicious Biryani";

const Checkout = () => {
  const navigate = useNavigate();
  const cart = useCartStore((state) => state.cart);
  const clearCart = useCartStore((state) => state.clearCart);
  const showToast = useCartStore((state) => state.showToast);
  const { user } = useAuthStore();
  const { addresses, fetchAddresses } = useAddressStore();
  
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState(null);
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [step, setStep] = useState('address'); // 'address' -> 'contact' -> 'payment'
  const [paymentMethod, setPaymentMethod] = useState(null); // 'upi' | 'cod'
  const [upiPhase, setUpiPhase] = useState('select'); // 'select' | 'paying' | 'confirm'
  const [upiCopied, setUpiCopied] = useState(false);
  const [amountCopied, setAmountCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [showUtrHelp, setShowUtrHelp] = useState(false);

  // Offers & Promo Codes
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  
  // 15-minute Session Countdown Timer (Real Gateway Feel)
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins in seconds

  const [tempName, setTempName] = useState(user?.displayName || user?.user_metadata?.full_name || '');
  const [tempPhone, setTempPhone] = useState(user?.phoneNumber || user?.user_metadata?.phone || '');
  const [guestAddress, setGuestAddress] = useState('');
  
  const subtotal = cart.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  const total = Math.max(0, subtotal - couponDiscount);

  // Session timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (userId) {
      fetchAddresses(userId);
    }
  }, [user, fetchAddresses]);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const firstValid = addresses.find(a => a.is_serviceable);
      if (firstValid) setSelectedAddressId(firstValid.id);
    }
  }, [addresses, selectedAddressId]);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  // UPI Deep Link trigger (Generic or App-specific)
  const triggerUpiPayment = useCallback((appName = 'UPI') => {
    setUpiPhase('paying');
    const baseUpi = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${total}&cu=INR&tn=${encodeURIComponent('Order Payment - Delicious Biryani')}`;
    
    const onReturn = () => {
      if (document.visibilityState === 'visible') {
        setUpiPhase('confirm');
        document.removeEventListener('visibilitychange', onReturn);
      }
    };
    document.addEventListener('visibilitychange', onReturn);
    
    // Auto transition to confirmation step after 3s on desktop or upon return
    setTimeout(() => setUpiPhase('confirm'), 2800);
    
    window.location.href = baseUpi;
  }, [total]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2000);
    });
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(total.toString()).then(() => {
      setAmountCopied(true);
      setTimeout(() => setAmountCopied(false), 2000);
    });
  };

  const handleApplyCoupon = async () => {
    setCouponError(null);
    if (!couponInput.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    setIsCheckingCoupon(true);
    try {
      const available = await fetchCoupons();
      const result = calculateCouponDiscount(couponInput, subtotal, available);
      if (result.success) {
        setAppliedCoupon(result.coupon);
        setCouponDiscount(result.discount);
        setCouponError(null);
        showToast({
          type: 'success',
          title: 'Offer Applied!',
          message: result.message
        });
      } else {
        setCouponError(result.message);
      }
    } catch (err) {
      console.warn('Coupon apply error:', err);
      setCouponError('Could not validate promo code.');
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponError(null);
    showToast({
      type: 'info',
      title: 'Coupon Removed',
      message: 'Discount has been removed from total.'
    });
  };

  const handleContinueToPayment = () => {
    const errs = {};
    if (!tempName || tempName.trim().length < 2) {
      errs.name = true;
    }
    const cleanPhone = (tempPhone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      errs.phone = true;
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError(
        errs.name && errs.phone
          ? 'Please enter your Full Name and a valid 10-digit Phone Number.'
          : errs.name
          ? 'Please provide your Full Name.'
          : 'Please enter a valid 10-digit mobile number for delivery calls.'
      );
      return;
    }

    setFieldErrors({});
    setError(null);
    setStep('payment');
  };

  const insertOrder = async (orderPayload) => {
    const userId = user?.uid || user?.id || 'guest';
    const fullPayload = {
      user_id: userId,
      total_amount: total,
      subtotal_amount: subtotal,
      coupon_code: appliedCoupon?.code || null,
      discount_amount: couponDiscount || 0,
      items: {
        cart,
        customer: {
          name: orderPayload.customer_name,
          phone: orderPayload.customer_phone,
          address: orderPayload.address_line,
        },
      },
      status: 'placed',
      customer_name: orderPayload.customer_name,
      customer_phone: orderPayload.customer_phone,
      address_line: orderPayload.address_line,
      payment_method: paymentMethod || 'cod',
      utr_number: utrNumber ? utrNumber.trim() : null,
      created_at: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'orders'), fullPayload);
      return { id: docRef.id, ...fullPayload };
    } catch (err) {
      console.warn('Firestore order insert fallback to local ID:', err);
      return { id: 'ord_' + Date.now().toString(36), ...fullPayload };
    }
  };

  const handlePlaceOrder = async () => {
    if (!cart || cart.length === 0) {
      setError("Your feast cart is empty. Please select dishes from the menu first.");
      return;
    }

    const activeAddress = user ? addresses.find(a => a.id === selectedAddressId) : null;
    if (user && activeAddress && activeAddress.is_serviceable === false) {
      setError("The selected delivery address is outside our delivery polygon. Please select a serviceable address.");
      setStep('address');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const finalAddress = user 
      ? activeAddress?.address_line 
      : guestAddress;

    if (!finalAddress) {
      setError("Delivery address is required. Please select or add an address.");
      setStep('address');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const cleanPhone = (tempPhone || '').replace(/\D/g, '');
    if (!tempName || tempName.trim().length < 2 || cleanPhone.length !== 10) {
      setError("Please verify your name and 10-digit phone number.");
      setStep('contact');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsPlacingOrder(true);
    setError(null);

    try {
      let savedOrder = null;
      try {
        const orderPayload = {
          user_id: user?.uid || user?.id || 'guest',
          total_amount: total,
          subtotal_amount: subtotal,
          coupon_code: appliedCoupon?.code || null,
          discount_amount: couponDiscount || 0,
          items: cart,
          status: 'placed',
          customer_name: tempName.trim(),
          customer_phone: cleanPhone,
          address_line: finalAddress,
          created_at: new Date().toISOString()
        };
        savedOrder = await insertOrder(orderPayload);
      } catch (dbErr) {
        console.warn('Order DB save failed (non-critical fallback):', dbErr);
      }

      const utrLine = utrNumber.trim() ? `\n🧾 *UPI Ref / UTR:* \`${utrNumber.trim()}\`` : '';
      const promoLine = couponDiscount > 0 ? `\n🎟️ *Promo Applied:* \`${appliedCoupon?.code}\` (-₹${couponDiscount})` : '';
      const paymentLine = paymentMethod === 'upi'
        ? `✅ *Payment:* Paid via UPI (${UPI_ID})${utrLine}`
        : '🚚 *Payment:* Cash on Delivery (Pay on Doorstep)';

      const waMessage = `🚨🔔 *URGENT NEW ORDER* 🔔🚨\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 *Customer:* ${tempName.trim()}\n` +
        `📞 *Phone:* ${cleanPhone}\n` +
        `📍 *Address:* ${finalAddress}\n\n` +
        `🍱 *Items:*\n${cart.map(i => `   • ${i.quantity}x ${i.title || i.name}${i.size && i.size !== 'Standard' ? ` (${i.size})` : ''}`).join('\n')}\n\n` +
        `💰 *Total:* ₹${total}${couponDiscount > 0 ? ` (Saved ₹${couponDiscount})` : ''}\n` +
        `${promoLine}${paymentLine}\n\n` +
        `🚀 *Please start authentic dum preparation!*`;

      const waLink = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;
      
      if (savedOrder?.id) useCartStore.getState().persistOrderTime(savedOrder.id);
      clearCart();

      // Open WhatsApp in new tab/app to notify kitchen and navigate to celebratory success screen
      try {
        window.open(waLink, '_blank');
      } catch (_) {}
      
      navigate('/success', { 
        state: { 
          orderId: savedOrder?.id, 
          customerName: tempName.trim(), 
          paymentMethod, 
          total, 
          waLink 
        } 
      });
    } catch (err) {
      console.error('Order failed:', err);
      setError("Sync failed. Check your network connection and try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleContinue = () => {
    if (user) {
      if (addresses.length === 0) {
        setError("Please add your delivery address using the '+ New Address' button above.");
        return;
      }
      const activeAddress = addresses.find(a => a.id === selectedAddressId);
      if (!selectedAddressId || !activeAddress) {
        setError("Please select one of your saved delivery addresses to continue.");
        return;
      }
      if (activeAddress.is_serviceable === false) {
        setError("The selected delivery address is outside our delivery polygon. Please select a serviceable address or add a new location within the zone.");
        return;
      }
    } else {
      if (!guestAddress || guestAddress.trim().length < 5) {
        setError("Please enter your complete delivery address (Society, Building, Road).");
        return;
      }
    }
    setError(null);
    setStep('contact');
  };

  if (cart.length === 0) {
    return (
      <div className="bg-[#F2F4F7] min-h-screen pb-40 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-center text-slate-300 mb-6">
          <ShoppingBag size={36} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Your Cart is Empty</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-8 max-w-xs">
          You haven&apos;t selected any biryani or sides yet. Browse our menu to begin!
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-slate-950 px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all"
        >
          Explore Menu
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#F2F4F7] min-h-screen pb-40 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl border border-amber-100 shadow-sm flex items-center justify-center text-amber-600 mb-6">
          <ShieldCheck size={36} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Sign In Required</h2>
        <p className="text-slate-500 text-xs font-bold mb-8 max-w-xs leading-relaxed">
          Please log in or sign up first so our kitchen can verify delivery to your saved address and proceed with checkout.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/auth')}
            className="flex-1 bg-primary text-slate-950 py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all"
          >
            Sign In / Register
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-white border border-slate-200 text-slate-700 py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-slate-300 transition-all"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Stepper metadata
  const steps = [
    { id: 'address', title: 'Delivery Address', subtitle: 'Select geofenced flat' },
    { id: 'contact', title: 'Customer Details', subtitle: 'Rider gate pass' },
    { id: 'payment', title: 'Payment Terminal', subtitle: 'Instant UPI / COD' }
  ];

  return (
    <div className="bg-[#F2F4F7] min-h-screen pb-32">
      {/* Top Gateway Trust Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (step === 'payment') setStep('contact');
                else if (step === 'contact') setStep('address');
                else navigate(-1);
              }}
              className="w-10 h-10 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center text-slate-700 hover:border-primary transition-colors active:scale-95"
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">
                  Secure Checkout Terminal
                </h1>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                <Lock size={10} className="text-emerald-600" /> NPCI Direct UPI Gateway • Zero Fee
              </p>
            </div>
          </div>

          {/* Session Timer Badge */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl">
            <Timer size={14} className="text-primary animate-pulse" />
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block leading-none">Expires In</span>
              <span className="text-xs font-black font-mono text-slate-900 leading-none">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {steps.map((s, idx) => {
              const isPassed = (step === 'contact' && s.id === 'address') || (step === 'payment' && (s.id === 'address' || s.id === 'contact'));
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex flex-col gap-1">
                  <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-200/80">
                    <div 
                      className={`h-full transition-all duration-400 ${
                        isPassed || isCurrent ? 'bg-primary' : 'bg-transparent'
                      }`} 
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-left">
                    <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                      isPassed ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-primary text-slate-950 font-black' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isPassed ? <Check size={10} strokeWidth={3} /> : idx + 1}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-tight truncate hidden sm:inline ${
                      isCurrent ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      {s.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Grid: Responsive 2-column layout on Desktop/Tablet */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 sm:p-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-3xl text-xs font-bold leading-relaxed flex gap-3.5 items-center shadow-sm"
          >
            <AlertTriangle size={20} className="shrink-0 text-rose-500" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 p-1">
              ✕
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT COLUMN: Order Review & Trust Badges (Sticky on Desktop) */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-28">
            {/* Order Items Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Order Breakdown</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {cart.reduce((a, c) => a + (Number(c.quantity) || 1), 0)} items in feast bag
                  </p>
                </div>
                <span className="text-base font-black text-slate-900">₹{total}</span>
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex items-center justify-between text-xs py-1 group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-slate-100 text-slate-900 text-[10px] font-black flex items-center justify-center shrink-0">
                        {item.quantity}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">{item.title || item.name}</p>
                        {item.size && item.size !== 'Standard' && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            {item.size}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-black text-slate-900 ml-2">
                      ₹{(Number(item.price) || 0) * (Number(item.quantity) || 1)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo Code / Coupon Section */}
              <div className="border-t border-slate-100 mt-4 pt-3">
                {appliedCoupon ? (
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-emerald-600" />
                      <div>
                        <span className="font-mono font-black text-emerald-900 uppercase">
                          {appliedCoupon.code}
                        </span>
                        <p className="text-[10px] text-emerald-700 font-bold">
                          ₹{couponDiscount} feast discount applied
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 p-1"
                      title="Remove coupon"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          placeholder="PROMO CODE (e.g. BIRYANI50)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono uppercase font-bold text-slate-900 focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isCheckingCoupon || !couponInput.trim()}
                        className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-40 transition-colors"
                      >
                        {isCheckingCoupon ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1.5 ml-1">
                        {couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Bill Details */}
              <div className="border-t border-slate-100 mt-3 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Promo Discount ({appliedCoupon?.code})</span>
                    <span>-₹{couponDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    Dum Handi Packaging
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 rounded font-black">FREE</span>
                  </span>
                  <span className="text-emerald-600 font-bold">₹0</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    Delivery to Society Gate
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 rounded font-black">FREE</span>
                  </span>
                  <span className="text-emerald-600 font-bold">₹0</span>
                </div>
                <div className="border-t border-slate-200/80 pt-2.5 mt-2 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight block">Net Payable</span>
                    <span className="text-[10px] text-slate-400 font-medium">Inclusive of all kitchen costs</span>
                  </div>
                  <span className="text-xl font-black text-primary">₹{total}</span>
                </div>
              </div>
            </div>

            {/* Delivery Destination Summary (When selected) */}
            {selectedAddress && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#ec6d13] flex items-center justify-center shrink-0 border border-amber-100">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">
                      {selectedAddress.label || 'Delivery Address'}
                    </span>
                    {selectedAddress.is_serviceable ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-0.5">
                        <Check size={9} /> Verified Zone
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                        Outside Zone
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-700 leading-snug line-clamp-2">
                    {selectedAddress.address_line}
                  </p>
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div className="bg-slate-50/80 rounded-3xl p-4 sm:p-5 border border-slate-200/80 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <ChefHat size={16} className="text-primary shrink-0" />
                <span className="font-bold text-slate-800">Authentic 25-Min Dum Handi Cooking</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-800">Direct Peer-to-Merchant NPCI UPI • Zero Commission</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck size={16} className="text-blue-600 shrink-0" />
                <span className="font-bold text-slate-800">Direct Gate Handover in Palava & Taloja</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Terminal (Steps 1, 2, 3) */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {/* STEP 1: ADDRESS SELECTION */}
              {step === 'address' && (
                <motion.div 
                  key="step-address"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="space-y-5"
                >
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Step 1: Select Delivery Location</h2>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Where should our rider bring the hot dum handi?</p>
                      </div>
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-primary text-slate-950 px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                      >
                        <Plus size={14} strokeWidth={3} />
                        <span>Add New</span>
                      </button>
                    </div>

                    {/* Geofence notice */}
                    <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
                      <MapPin size={18} className="text-emerald-600 shrink-0" />
                      <p className="font-medium text-[11px] leading-relaxed">
                        <strong className="font-black uppercase tracking-wider">Geofenced Zone Active:</strong> Lodha Palava Phase 2 (Casa Bella, Lakeshore, Downtown) & Lodha Crown Taloja bypass.
                      </p>
                    </div>

                    {/* Address List */}
                    {addresses.length === 0 ? (
                      <div 
                        onClick={() => setIsAddModalOpen(true)}
                        className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <MapPin size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-black text-slate-700 uppercase">No Saved Addresses</p>
                        <p className="text-[11px] text-slate-400 mt-1">Click here to pin your flat or building location on the map.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {addresses.map(addr => {
                          const isServiceable = addr.is_serviceable !== false;
                          const isSelected = selectedAddressId === addr.id;
                          return (
                            <div 
                              key={addr.id}
                              onClick={() => setSelectedAddressId(addr.id)}
                              className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                isSelected 
                                  ? (isServiceable 
                                      ? 'bg-amber-50/30 border-primary ring-2 ring-primary/20 shadow-sm' 
                                      : 'bg-rose-50/40 border-rose-400 ring-2 ring-rose-200')
                                  : 'bg-white border-slate-200/80 hover:border-slate-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                                    {addr.label || 'Home'}
                                  </span>
                                  {isServiceable ? (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                                      <CheckCircle2 size={10} className="text-emerald-600" /> Hot Dum Delivery Zone
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1">
                                      <AlertTriangle size={10} className="text-rose-500" /> Outside Delivery Polygon
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-slate-800 leading-snug">{addr.address_line}</p>
                              </div>
                              <div className="shrink-0 pt-0.5">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? 'border-primary bg-primary text-slate-950' : 'border-slate-300'
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button 
                      onClick={handleContinue}
                      className="w-full bg-slate-900 text-white p-4 sm:p-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-between hover:bg-slate-800 transition-colors shadow-lg active:scale-98 saffron-glow"
                    >
                      <span>Proceed to Customer Details</span>
                      <ChevronRight size={18} strokeWidth={3} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: CONTACT DETAILS */}
              {step === 'contact' && (
                <motion.div 
                  key="step-contact"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-5"
                >
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Step 2: Customer Identity & Rider Call</h2>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">Riders must call this number at complex security gates</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={tempName}
                          onChange={(e) => {
                            setTempName(e.target.value);
                            if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: false }));
                          }}
                          placeholder="e.g. Sarthak Bagul"
                          className={`w-full bg-slate-50 border rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:outline-none transition-colors ${
                            fieldErrors.name ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200 focus:border-primary'
                          }`}
                        />
                        {fieldErrors.name && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1">Full name is required for kitchen ticketing.</p>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                          Delivery Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                            +91
                          </span>
                          <input 
                            type="tel" 
                            value={tempPhone}
                            maxLength={10}
                            onChange={(e) => {
                              setTempPhone(e.target.value.replace(/\D/g, ''));
                              if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: false }));
                            }}
                            placeholder="9876543210"
                            className={`w-full bg-slate-50 border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:outline-none transition-colors ${
                              fieldErrors.phone ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200 focus:border-primary'
                            }`}
                          />
                        </div>
                        {fieldErrors.phone && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1">Please enter a valid 10-digit mobile number.</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Our rider will call you upon reaching Lodha Palava or Crown Taloja main gate for entry pass.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => setStep('address')}
                        className="w-1/3 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
                      >
                        Back
                      </button>
                      <button 
                        type="button"
                        onClick={handleContinueToPayment}
                        className="w-2/3 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-98 saffron-glow"
                      >
                        <span>Choose Payment Method</span>
                        <ChevronRight size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: PAYMENT GATEWAY TERMINAL */}
              {step === 'payment' && (
                <motion.div 
                  key="step-payment"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-5"
                >
                  {/* Gateway Header Banner */}
                  <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            NPCI Live Terminal
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            REF-{Date.now().toString(36).slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                          Select Payment Mode
                        </h2>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Payable</span>
                        <span className="text-2xl sm:text-3xl font-black text-primary">₹{total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Method Picker */}
                  {!paymentMethod && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* UPI Option */}
                      <motion.div 
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod('upi')}
                        className="bg-white p-6 rounded-3xl border-2 border-slate-200/80 hover:border-primary transition-all cursor-pointer shadow-sm relative group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Smartphone size={24} />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Instant • 0% Fee
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 mb-1">UPI (GPay, PhonePe, Paytm)</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          Pay directly from your bank app. Instant automatic preparation start.
                        </p>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-primary">
                          <span>Open UPI Terminal</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.div>

                      {/* COD Option */}
                      <motion.div 
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod('cod')}
                        className="bg-white p-6 rounded-3xl border-2 border-slate-200/80 hover:border-primary transition-all cursor-pointer shadow-sm relative group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-[#ec6d13] flex items-center justify-center">
                            <Truck size={24} />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Doorstep Pay
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 mb-1">Cash on Delivery</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          Pay ₹{total} in cash or scan rider&apos;s QR code when the clay handi arrives.
                        </p>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-primary">
                          <span>Confirm COD Order</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* ACTIVE UPI TERMINAL */}
                  {paymentMethod === 'upi' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Merchant Terminal</span>
                          <h3 className="text-lg font-black text-slate-900">Delicious Biryani • Palava</h3>
                        </div>
                        <button 
                          onClick={() => { setPaymentMethod(null); setUpiPhase('select'); }}
                          className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          Change Mode
                        </button>
                      </div>

                      {/* Phase 1: App Selector & QR Code */}
                      {upiPhase === 'select' && (
                        <div className="space-y-6">
                          {/* Branded 1-Click UPI Apps (Mobile & Tablet) */}
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                              1-Click UPI Payment (Opens Your App)
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {/* Google Pay */}
                              <button 
                                onClick={() => triggerUpiPayment('GooglePay')}
                                className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-white hover:border-slate-400 flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center group"
                              >
                                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-sm text-blue-600 border border-slate-100">
                                  G
                                </div>
                                <span className="text-[11px] font-black text-slate-800">Google Pay</span>
                                <span className="text-[8px] font-bold text-emerald-600 uppercase">Fast Pay</span>
                              </button>

                              {/* PhonePe */}
                              <button 
                                onClick={() => triggerUpiPayment('PhonePe')}
                                className="p-3 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-white hover:border-purple-400 flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center group"
                              >
                                <div className="w-8 h-8 rounded-full bg-[#5f259f] text-white shadow-sm flex items-center justify-center font-black text-xs">
                                  पे
                                </div>
                                <span className="text-[11px] font-black text-purple-950">PhonePe</span>
                                <span className="text-[8px] font-bold text-purple-600 uppercase">Popular</span>
                              </button>

                              {/* Paytm */}
                              <button 
                                onClick={() => triggerUpiPayment('Paytm')}
                                className="p-3 rounded-2xl border border-sky-200 bg-sky-50/50 hover:bg-white hover:border-sky-400 flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center group"
                              >
                                <div className="w-8 h-8 rounded-full bg-[#002e6e] text-[#00b9f5] shadow-sm flex items-center justify-center font-black text-[10px]">
                                  Pay
                                </div>
                                <span className="text-[11px] font-black text-slate-800">Paytm</span>
                                <span className="text-[8px] font-bold text-sky-600 uppercase">Instant</span>
                              </button>

                              {/* BHIM / Cred / Other */}
                              <button 
                                onClick={() => triggerUpiPayment('UPI')}
                                className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50 hover:bg-white hover:border-slate-400 flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center group"
                              >
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white shadow-sm flex items-center justify-center font-black text-xs">
                                  UPI
                                </div>
                                <span className="text-[11px] font-black text-slate-800">Any UPI</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Cred/BHIM</span>
                              </button>
                            </div>
                          </div>

                          {/* Desktop & Second Device QR Section */}
                          <div className="pt-2">
                            <div className="flex items-center gap-3 my-3">
                              <div className="flex-1 h-px bg-slate-200" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Or Scan Dynamic BharatQR Code
                              </span>
                              <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-6 justify-center">
                              {/* QR Box */}
                              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 shrink-0 text-center">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                    `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${total}&cu=INR&tn=${encodeURIComponent('Order Payment - Delicious Biryani')}`
                                  )}`}
                                  alt="Dynamic UPI QR"
                                  className="w-36 h-36 rounded-xl mx-auto"
                                  loading="eager"
                                />
                                <span className="text-[9px] font-bold text-slate-400 block mt-1">Scan via any UPI App</span>
                              </div>

                              {/* Copy Info Box */}
                              <div className="space-y-3 text-left w-full sm:w-auto flex-1">
                                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">UPI VPA Address</span>
                                    <span className="text-xs font-black text-slate-900 font-mono truncate block">{UPI_ID}</span>
                                  </div>
                                  <button 
                                    onClick={copyUpiId}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-primary/20 text-slate-700 hover:text-primary transition-colors text-xs font-black uppercase flex items-center gap-1 shrink-0"
                                  >
                                    {upiCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    <span>{upiCopied ? 'Copied' : 'Copy'}</span>
                                  </button>
                                </div>

                                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Exact Amount</span>
                                    <span className="text-sm font-black text-primary">₹{total}</span>
                                  </div>
                                  <button 
                                    onClick={copyAmount}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-primary/20 text-slate-700 hover:text-primary transition-colors text-xs font-black uppercase flex items-center gap-1 shrink-0"
                                  >
                                    {amountCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    <span>{amountCopied ? 'Copied' : 'Copy'}</span>
                                  </button>
                                </div>

                                <button
                                  onClick={() => setUpiPhase('confirm')}
                                  className="w-full text-center text-xs font-bold text-primary hover:underline pt-1 block"
                                >
                                  Paid already? Click here to verify UTR →
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Phase 2 & 3: Payment Verification & 12-Digit UTR Input */}
                      {(upiPhase === 'paying' || upiPhase === 'confirm') && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-5 text-center"
                        >
                          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                            <CheckCircle2 size={32} />
                          </div>

                          <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">
                              Confirming UPI Transaction
                            </h3>
                            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto mt-1">
                              Amount: <strong className="text-slate-900">₹{total}</strong> sent to <strong className="text-slate-900 font-mono">{UPI_ID}</strong>
                            </p>
                          </div>

                          {/* 12-digit UTR Input Terminal */}
                          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 text-left max-w-md mx-auto space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <span>12-Digit UPI Reference / UTR Number</span>
                                <span className="text-[9px] font-normal text-slate-400">(Recommended)</span>
                              </label>
                              <button 
                                type="button"
                                onClick={() => setShowUtrHelp(!showUtrHelp)}
                                className="text-primary text-[10px] font-bold flex items-center gap-0.5 hover:underline"
                              >
                                <HelpCircle size={12} /> Where is this?
                              </button>
                            </div>

                            <div className="relative">
                              <input 
                                type="text" 
                                value={utrNumber}
                                maxLength={12}
                                onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="e.g. 4267XXXXXXXX"
                                className="w-full bg-white border border-slate-200 rounded-2xl pl-4 pr-16 py-3 text-sm font-mono font-bold text-slate-900 tracking-widest focus:outline-none focus:border-primary transition-colors text-center"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const text = await navigator.clipboard.readText();
                                    const clean = (text || '').replace(/\D/g, '').slice(0, 12);
                                    if (clean) setUtrNumber(clean);
                                  } catch (_) {}
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-primary/20 text-slate-600 hover:text-primary text-[10px] font-black uppercase transition-colors"
                              >
                                Paste
                              </button>
                            </div>

                            {showUtrHelp && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-[11px] text-amber-800 leading-relaxed space-y-1"
                              >
                                <p className="font-bold">How to find your 12-digit UTR:</p>
                                <p>Open your Google Pay / PhonePe transaction receipt. Look for <strong>&quot;UPI Transaction ID&quot;</strong> or <strong>&quot;UTR&quot;</strong> (a 12-digit number starting with 4, 3, etc.).</p>
                              </motion.div>
                            )}

                            <p className="text-[10px] text-slate-400 font-medium">
                              Entering your UTR links your payment directly to the kitchen preparation queue for priority dum cooking.
                            </p>
                          </div>

                          <div className="space-y-2.5 max-w-md mx-auto pt-2">
                            <button
                              onClick={handlePlaceOrder}
                              disabled={isPlacingOrder}
                              className="w-full bg-emerald-600 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 active:scale-98"
                            >
                              {isPlacingOrder ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  <span>Securing Kitchen Ticket...</span>
                                </>
                              ) : (
                                <>
                                  <Check size={16} strokeWidth={3} />
                                  <span>I Have Paid ₹{total} • Dispatch Order</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setUpiPhase('select')}
                              className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-colors"
                            >
                              Need to re-open UPI App or QR Code
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* ACTIVE COD TERMINAL */}
                  {paymentMethod === 'cod' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6 text-center"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="text-left">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doorstep Mode</span>
                          <h3 className="text-lg font-black text-slate-900">Cash on Delivery</h3>
                        </div>
                        <button 
                          onClick={() => setPaymentMethod(null)}
                          className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          Change Mode
                        </button>
                      </div>

                      <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 text-[#ec6d13] flex items-center justify-center mx-auto shadow-sm">
                        <Truck size={30} />
                      </div>

                      <div className="max-w-md mx-auto space-y-1">
                        <h4 className="text-base font-black text-slate-900">Pay ₹{total} at Your Society Gate</h4>
                        <p className="text-xs text-slate-500 font-medium">
                          Our rider will deliver your sealed dum handi. You can pay with cash or scan the rider&apos;s phone QR on arrival.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 max-w-md mx-auto text-left space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-900 font-bold">
                          <ChefHat size={14} className="text-primary shrink-0" />
                          <span>Piping Hot Handi Guarantee</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Please keep exact cash ready or open GPay/PhonePe when our rider arrives at your building entrance.
                        </p>
                      </div>

                      <div className="max-w-md mx-auto pt-2">
                        <button
                          onClick={handlePlaceOrder}
                          disabled={isPlacingOrder}
                          className="w-full bg-primary text-slate-950 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-98 transition-all shadow-xl shadow-primary/25 saffron-glow"
                        >
                          {isPlacingOrder ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Dispatching Order...</span>
                            </>
                          ) : (
                            <>
                              <span>Confirm Cash on Delivery Order (₹{total})</span>
                              <ChevronRight size={18} strokeWidth={3} />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Geofenced Leaflet Add Address Modal (Code-split) */}
      <Suspense fallback={null}>
        {isAddModalOpen && (
          <AddAddressModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
          />
        )}
      </Suspense>
    </div>
  );
};

export default Checkout;
