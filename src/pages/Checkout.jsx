import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, Ticket, ChevronRight, Loader2, Plus, MapPin, AlertTriangle, CheckCircle2, ShoppingBag, Trash2, Lock, ChefHat, CreditCard, Truck, Smartphone, Copy, Check, RefreshCw, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import useAddressStore from '../store/useAddressStore';
import { supabase } from '../lib/supabase';
import AddAddressModal from '../components/AddAddressModal';

const ADMIN_WHATSAPP_NUMBER = import.meta.env.VITE_ADMIN_WHATSAPP || "";
const UPI_ID = import.meta.env.VITE_UPI_ID || "";
const UPI_NAME = import.meta.env.VITE_UPI_NAME || "Delicious Biryani";

const Checkout = () => {
  const navigate = useNavigate();
  const cart = useCartStore((state) => state.cart);
  const clearCart = useCartStore((state) => state.clearCart);
  const { user } = useAuthStore();
  const { addresses, fetchAddresses, deleteAddress } = useAddressStore();
  
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState(null);
  
  const [step, setStep] = useState('address'); // 'address' -> 'contact' -> 'payment'
  const [paymentMethod, setPaymentMethod] = useState(null); // 'upi' | 'cod'
  const [upiPhase, setUpiPhase] = useState('select'); // 'select' | 'paying' | 'confirm'
  const [upiCopied, setUpiCopied] = useState(false);
  const [tempName, setTempName] = useState(user?.user_metadata?.full_name || '');
  const [tempPhone, setTempPhone] = useState(user?.user_metadata?.phone || user?.phone || '');
  const [guestAddress, setGuestAddress] = useState('');
  
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal;

  useEffect(() => {
    if (user) {
      fetchAddresses(user.id);
    }
  }, [user, fetchAddresses]);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const firstValid = addresses.find(a => a.is_serviceable);
      if (firstValid) setSelectedAddressId(firstValid.id);
    }
  }, [addresses, selectedAddressId]);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  // UPI Deep Link trigger
  const triggerUpiPayment = useCallback(() => {
    setUpiPhase('paying');
    const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${total}&cu=INR&tn=${encodeURIComponent('Order Payment - Delicious Biryani')}`;
    
    const onReturn = () => {
      if (document.visibilityState === 'visible') {
        setUpiPhase('confirm');
        document.removeEventListener('visibilitychange', onReturn);
      }
    };
    document.addEventListener('visibilitychange', onReturn);
    
    // Fallback: if user doesn't leave (desktop), show confirm after 3s
    setTimeout(() => setUpiPhase('confirm'), 3000);
    
    window.location.href = upiUrl;
  }, [total]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2000);
    });
  };

  const handleContinueToPayment = () => {
    if (!tempName || !tempPhone || tempPhone.length < 10) {
      setError('Please provide a valid Name and Phone Number.');
      return;
    }
    setError(null);
    setStep('payment');
  };

  const insertOrder = async (orderPayload) => {
    const fullPayload = {
      user_id: user?.id || null,
      total_amount: total,
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
    };

    const fullResult = await supabase
      .from('orders')
      .insert(fullPayload)
      .select()
      .single();

    if (!fullResult.error) return fullResult.data;

    // Backward-compatible fallback for older orders tables with only minimal columns.
    const fallbackResult = await supabase
      .from('orders')
      .insert({
        user_id: user?.id || null,
        total_amount: total,
        items: {
          cart,
          customer: {
            name: orderPayload.customer_name,
            phone: orderPayload.customer_phone,
            address: orderPayload.address_line,
          },
        },
        status: 'placed',
      })
      .select()
      .single();

    if (fallbackResult.error) throw fallbackResult.error;
    return fallbackResult.data;
  };

  const handlePlaceOrder = async () => {
    // 1. DATA VALIDATION
    if (!tempName || !tempPhone || tempPhone.length < 10) {
      setError("Please provide a valid Name and Phone Number to continue.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Guest Address Validation (Since we dropped the pinned address requirement for guests)
    if (!user && !guestAddress) {
      setError("Tell us where the feast is headed (Full Address).");
      return;
    }

    // Final Order Logic
    setIsPlacingOrder(true);
    setError(null);

    try {
      const finalAddress = user ? (addresses.find(a => a.id === selectedAddressId)?.address_line) : guestAddress;
      
      // Try to save to DB — only for logged-in users (orders table requires non-null user_id)
      let savedOrder = null;
      if (user) {
        try {
          const orderPayload = {
            customer_name: tempName,
            customer_phone: tempPhone,
            address_line: finalAddress,
          };
          savedOrder = await insertOrder(orderPayload);
        } catch (dbErr) {
          console.warn('DB order save failed, proceeding to WhatsApp:', dbErr);
        }
      }

      // Payment line for WhatsApp
      const paymentLine = paymentMethod === 'upi'
        ? '✅ *Payment:* Paid via UPI'
        : '🚚 *Payment:* Cash on Delivery';

      const waMessage = `🚨🔔 *URGENT NEW ORDER* 🔔🚨\n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 *Customer:* ${tempName}\n` +
        `📞 *Phone:* ${tempPhone}\n` +
        `📍 *Address:* ${finalAddress}\n\n` +
        `🍱 *Items:*\n${cart.map(i => `   • ${i.quantity}x ${i.title}`).join('\n')}\n\n` +
        `💰 *Total:* ₹${total}\n` +
        `${paymentLine}\n\n` +
        `🚀 *Please start preparing!*`;

      const waLink = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;
      
      if (savedOrder?.id) useCartStore.getState().persistOrderTime(savedOrder.id);
      clearCart();
      window.location.href = waLink;
    } catch (err) {
      console.error('Order failed:', err);
      setError("Sync failed. Check connection.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleContinue = () => {
    if (!user && !guestAddress) {
        setError("Please enter your delivery address first.");
        return;
    }
    if (user && !selectedAddressId) {
        setError("Please select a pinned location.");
        return;
    }
    setError(null);
    setStep('contact');
  };

  const handleDeleteAddress = async (e, id) => {
    e.stopPropagation(); 
    if (confirm("Delete this address?")) {
      await deleteAddress(id);
    }
  };


  return (
    <div className="bg-[#F8F9FB] min-h-screen pb-40">
      {/* Premium Header */}
      <div className="bg-white px-6 pt-12 pb-6 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-[18px] flex items-center justify-center text-slate-800"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
            <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">Complete Order</h1>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">AES-256 Encrypted</p>
        </div>
        <div className="w-12 h-12 flex items-center justify-center text-emerald-500">
          <ShieldCheck size={28} />
        </div>
      </div>

      <div className="px-6 py-10">
        {/* GEOGRAPHIC CORRECTION BANNER */}
        <div className="mb-8 p-5 bg-primary/5 border border-primary/10 rounded-[28px] overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <MapPin size={40} className="text-primary rotate-12" />
            </div>
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                    <ShoppingBag size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Serviceable Zones</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">
                     Taloja Bypass Road, Badlapur Highway, <br/>
                     Pipeline Road & Lodha Crown
                   </p>
                </div>
            </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-5 bg-red-50 border border-red-100 text-red-600 rounded-[28px] text-xs font-black uppercase tracking-widest leading-relaxed flex gap-4 items-center"
          >
            <AlertTriangle size={24} className="shrink-0" />
            {error}
          </motion.div>
        )}

        {/* STEPPER CONTENT */}
        <AnimatePresence mode="wait">
            {step === 'address' ? (
                <motion.div 
                    key="step-address"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                >
                    {/* 1. ADDRESS SELECTION */}
                    <div className="mb-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] ml-1">Pin Location</h3>
                            {user && (
                                <button onClick={() => setIsAddModalOpen(true)} className="bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full">New Address</button>
                            )}
                        </div>

                        {user ? (
                            addresses.length === 0 ? (
                                <div onClick={() => setIsAddModalOpen(true)} className="bg-white border-2 border-dashed border-slate-100 rounded-[40px] p-12 text-center cursor-pointer">
                                    <p className="text-slate-400 font-black text-[10px] uppercase">No pinned locations</p>
                                </div>
                            ) : (
                                <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6">
                                    {addresses.map(addr => (
                                        <div 
                                            key={addr.id} 
                                            onClick={() => setSelectedAddressId(addr.id)}
                                            className={`min-w-[280px] p-6 rounded-[32px] border-2 transition-all ${selectedAddressId === addr.id ? 'bg-white border-primary shadow-xl' : 'bg-white border-white'}`}
                                        >
                                            <h4 className="text-[10px] font-black uppercase mb-3 text-primary">{addr.label}</h4>
                                            <p className="text-sm font-black italic text-slate-900 line-clamp-2">{addr.address_line}</p>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                             <div className="bg-white rounded-[40px] p-8 border border-white shadow-sm">
                                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                                    <MapPin size={12} className="text-primary" /> Delivery Area
                                </h3>
                                <textarea 
                                    value={guestAddress}
                                    onChange={(e) => setGuestAddress(e.target.value)}
                                    placeholder="Enter your full address (Society, Building, Road)"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-tighter text-slate-800 focus:outline-none focus:border-primary transition-all min-h-[120px] shadow-inner"
                                />
                                <p className="mt-4 text-[8px] font-black text-slate-300 uppercase tracking-widest text-center">Serving Taloja Bypass, Badlapur Highway & Pipeline Road only</p>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleContinue}
                        className="w-full bg-slate-900 text-white p-6 rounded-[32px] font-black uppercase tracking-[0.2em] flex justify-between items-center shadow-2xl active:scale-95 transition-all shadow-black/10"
                    >
                        <span>Continue to Identity</span>
                        <ChevronRight size={20} strokeWidth={4} />
                    </button>
                </motion.div>
            ) : (
                <motion.div 
                    key="step-contact"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    <div className="bg-white rounded-[40px] p-8 border border-white mb-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                        <button onClick={() => setStep('address')} className="absolute top-6 left-6 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-all"><ChevronLeft size={20}/></button>
                        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-8 mb-6 text-center">Contact Protocol</h3>
                        <div className="space-y-6 relative z-10">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Name</label>
                                <input 
                                    type="text" 
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    placeholder="e.g., Sarthak Bagul"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase text-slate-800 focus:outline-none focus:border-primary tracking-tighter"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Contact</label>
                                <input 
                                    type="tel" 
                                    value={tempPhone}
                                    onChange={(e) => setTempPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="10-digit number"
                                    maxLength={10}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase text-slate-800 focus:outline-none focus:border-primary tracking-[0.2em]"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleContinueToPayment}
                        disabled={!tempName || tempPhone.length < 10}
                        className="w-full bg-slate-900 text-white p-6 rounded-[32px] font-black uppercase tracking-[0.2em] flex justify-between items-center shadow-2xl disabled:opacity-50 active:scale-95 transition-all shadow-black/10"
                    >
                        <span>Continue to Payment</span>
                        <ChevronRight size={20} strokeWidth={4} />
                    </button>
                    <p className="text-center text-[8px] text-slate-300 font-black uppercase mt-10 tracking-[0.4em] flex items-center justify-center gap-2">
                         <ShieldCheck size={10} /> Secure Node ✦ Established 1994
                    </p>
                </motion.div>
            )}

            {/* STEP 3: PAYMENT */}
            {step === 'payment' && (
                <motion.div
                    key="step-payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    {/* Back button */}
                    <button onClick={() => { setStep('contact'); setPaymentMethod(null); setUpiPhase('select'); }} className="mb-6 flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <ChevronLeft size={14} /> Back to Contact
                    </button>

                    {/* Order Summary Mini */}
                    <div className="bg-white rounded-[28px] p-6 border border-slate-100 mb-6 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">Order Summary</h3>
                        {cart.map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-2">
                                <span className="text-xs font-bold text-slate-700">{item.quantity}x {item.title}</span>
                                <span className="text-xs font-black text-slate-900">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                        <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between">
                            <span className="text-sm font-black text-slate-900 uppercase">Total</span>
                            <span className="text-lg font-black text-primary">₹{total}</span>
                        </div>
                    </div>

                    {/* Payment Method Selection */}
                    {!paymentMethod && (
                        <div className="space-y-4 mb-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">Choose Payment</h3>
                            
                            <button
                                onClick={() => setPaymentMethod('upi')}
                                className="w-full bg-white rounded-[28px] p-6 border-2 border-slate-100 hover:border-primary/40 transition-all flex items-center gap-5 group active:scale-[0.98]"
                            >
                                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                    <Smartphone size={24} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Pay via UPI</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">GPay • PhonePe • Paytm • Any UPI</p>
                                </div>
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                            </button>

                            <button
                                onClick={() => setPaymentMethod('cod')}
                                className="w-full bg-white rounded-[28px] p-6 border-2 border-slate-100 hover:border-primary/40 transition-all flex items-center gap-5 group active:scale-[0.98]"
                            >
                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
                                    <Truck size={24} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Cash on Delivery</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pay when your order arrives</p>
                                </div>
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                            </button>
                        </div>
                    )}

                    {/* UPI Payment Flow */}
                    {paymentMethod === 'upi' && (
                        <div className="space-y-6">
                            {upiPhase === 'select' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm text-center">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-6">
                                        <IndianRupee size={28} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">₹{total}</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Amount to Pay</p>

                                    {/* UPI ID + Copy */}
                                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center justify-between">
                                        <div className="text-left">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UPI ID</p>
                                            <p className="text-sm font-black text-slate-900 tracking-tight mt-1">{UPI_ID}</p>
                                        </div>
                                        <button onClick={copyUpiId} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 text-slate-500 hover:text-primary transition-colors">
                                            {upiCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                        </button>
                                    </div>

                                    {/* Pay via UPI App Button (Mobile) */}
                                    <button
                                        onClick={triggerUpiPayment}
                                        className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Smartphone size={18} />
                                        Pay ₹{total} via UPI App
                                    </button>
                                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-4">Opens your UPI app with amount pre-filled</p>

                                    {/* OR Divider */}
                                    <div className="flex items-center gap-4 my-6">
                                        <div className="flex-1 h-px bg-slate-200" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Or scan QR</span>
                                        <div className="flex-1 h-px bg-slate-200" />
                                    </div>

                                    {/* QR Code for Desktop */}
                                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${total}&cu=INR&tn=Order Payment`)}`}
                                            alt="UPI QR Code"
                                            className="w-48 h-48 rounded-xl"
                                        />
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-4">Scan with any UPI app</p>
                                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">For desktop users or paying from another device</p>
                                    </div>
                                </motion.div>
                            )}

                            {(upiPhase === 'paying' || upiPhase === 'confirm') && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm text-center">
                                    {upiPhase === 'paying' ? (
                                        <>
                                            <Loader2 size={40} className="animate-spin text-emerald-500 mx-auto mb-4" />
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Waiting for Payment</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Complete payment in your UPI app</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <CheckCircle2 size={32} className="text-emerald-500" />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Have you completed the payment?</h3>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-8">Amount: ₹{total} to {UPI_ID}</p>

                                            <div className="space-y-3">
                                                <button
                                                    onClick={handlePlaceOrder}
                                                    disabled={isPlacingOrder}
                                                    className="w-full bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {isPlacingOrder ? <><Loader2 className="animate-spin" size={18} /> Processing...</> : <><CheckCircle2 size={18} /> Yes, I have paid</>}
                                                </button>
                                                <button
                                                    onClick={() => setUpiPhase('select')}
                                                    className="w-full bg-slate-50 text-slate-600 p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                                                >
                                                    <RefreshCw size={14} /> No, let me retry
                                                </button>
                                            </div>

                                            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                                <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                                                    🔒 Note: The restaurant owner will verify your payment before preparing your order. Please ensure payment is completed to avoid delays.
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}

                            <button onClick={() => { setPaymentMethod(null); setUpiPhase('select'); }} className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
                                ← Choose different method
                            </button>
                        </div>
                    )}

                    {/* COD Flow */}
                    {paymentMethod === 'cod' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm text-center">
                                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-6">
                                    <Truck size={28} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Cash on Delivery</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pay ₹{total} when your order arrives</p>
                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Please keep exact change ready</p>
                            </div>

                            <button
                                onClick={handlePlaceOrder}
                                disabled={isPlacingOrder}
                                className="w-full bg-primary text-white p-6 rounded-[32px] font-black uppercase tracking-[0.15em] flex justify-between items-center shadow-2xl saffron-glow disabled:opacity-50 active:scale-95 transition-all"
                            >
                                {isPlacingOrder ? (
                                    <div className="flex items-center gap-3 mx-auto"><Loader2 className="animate-spin" size={24} /><span>Placing Order...</span></div>
                                ) : (
                                    <><span className="text-xl">₹{total}</span><div className="flex items-center gap-2"><span className="text-[10px]">Place Order (COD)</span><div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><ChevronRight size={24} strokeWidth={3} /></div></div></>
                                )}
                            </button>

                            <button onClick={() => setPaymentMethod(null)} className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
                                ← Choose different method
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <AddAddressModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
    </div>
  );
};


export default Checkout;
