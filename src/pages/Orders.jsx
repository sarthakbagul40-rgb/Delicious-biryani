import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, Clock, Loader2, MapPin, PackageSearch, Phone, 
  Receipt, ShoppingBag, RefreshCw, AlertCircle, ChefHat, 
  Truck, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, 
  Flame, Check, MessageCircle, ExternalLink, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, collection, query, where, onSnapshot, doc } from '../lib/firebase';
import useAuthStore from '../store/useAuthStore';
import useCartStore from '../store/useCartStore';
import {
  formatOrderId,
  formatOrderDate,
  getOrderCustomer,
  getOrderItems,
  getComputedOrderStatus,
  ORDER_STATUS_FLOW
} from '../lib/orderStatus';

const ADMIN_WHATSAPP_NUMBER = import.meta.env.VITE_ADMIN_WHATSAPP || "919769793452";

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.uid || user?.id;
  const { lastOrderId, addItem, openCart, showToast } = useCartStore();

  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('ongoing'); // 'ongoing' | 'past'
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedOngoingId, setSelectedOngoingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listenerError, setListenerError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch and sync user orders
  useEffect(() => {
    let unsubscribe;
    setListenerError(null);

    if (userId) {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('user_id', '==', userId)
        );
        unsubscribe = onSnapshot(q, (snapshot) => {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => {
            const timeA = a.created_at?.toMillis?.() || new Date(a.created_at || 0).getTime();
            const timeB = b.created_at?.toMillis?.() || new Date(b.created_at || 0).getTime();
            return timeB - timeA;
          });
          setOrders(list);
          setIsLoading(false);
          setListenerError(null);
        }, (err) => {
          console.warn('Orders listener error:', err);
          setListenerError('Could not sync with the live orders database. Check connection.');
          setIsLoading(false);
        });
      } catch (err) {
        console.warn('Orders query failed:', err);
        setListenerError('Failed to establish kitchen order link.');
        setIsLoading(false);
      }
    } else if (lastOrderId) {
      setIsLoading(true);
      try {
        unsubscribe = onSnapshot(doc(db, 'orders', String(lastOrderId)), (snap) => {
          if (snap.exists()) {
            const data = { id: snap.id, ...snap.data() };
            setOrders([data]);
            setListenerError(null);
          } else {
            setOrders([]);
          }
          setIsLoading(false);
        }, (err) => {
          console.warn('Guest order fetch error:', err);
          setListenerError('Could not sync live order updates.');
          setIsLoading(false);
        });
      } catch (err) {
        console.warn('Guest order query failed:', err);
        setListenerError('Failed to establish live order link.');
        setIsLoading(false);
      }
    } else {
      setOrders([]);
      setIsLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [userId, lastOrderId, retryCount]);

  // Categorize orders into Ongoing vs Past based on computed status
  const { ongoingOrders, pastOrders } = useMemo(() => {
    const ongoing = [];
    const past = [];

    orders.forEach(order => {
      const computed = getComputedOrderStatus(order);
      const enrichedOrder = { ...order, computed };

      if (computed.isOngoing) {
        ongoing.push(enrichedOrder);
      } else {
        past.push(enrichedOrder);
      }
    });

    return { ongoingOrders: ongoing, pastOrders: past };
  }, [orders]);

  // Auto select default tab based on whether ongoing orders exist
  useEffect(() => {
    if (!isLoading && orders.length > 0) {
      if (ongoingOrders.length > 0) {
        setActiveTab('ongoing');
        if (!selectedOngoingId) setSelectedOngoingId(ongoingOrders[0].id);
      } else {
        setActiveTab('past');
      }
    }
  }, [isLoading, orders.length, ongoingOrders.length]);

  const activeOngoingOrder = useMemo(() => {
    return ongoingOrders.find(o => o.id === selectedOngoingId) || ongoingOrders[0] || null;
  }, [ongoingOrders, selectedOngoingId]);

  // 1-Click Reorder handler
  const handleReorder = (order) => {
    const items = getOrderItems(order);
    if (!items || items.length === 0) return;

    items.forEach(item => {
      addItem({
        id: item.id || `dish_${Date.now()}`,
        title: item.title || item.name || 'Biryani Dish',
        price: Number(item.price) || 0,
        image: item.image || item.img || ''
      }, {
        portion: item.size || 'Standard',
        price: Number(item.price) || 0,
        spice: item.spice || 'Medium Spiced'
      });
    });

    showToast({
      type: 'success',
      title: 'Dishes Added to Cart',
      message: `${items.length} items from #${order.id.slice(-6).toUpperCase()} added to feast bag.`
    });

    openCart();
  };

  return (
    <div className="bg-[#F2F4F7] min-h-screen pb-36 font-sans">
      {/* Sleek Minimalist Sticky Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-sm transition-all">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center text-slate-700 hover:border-primary transition-colors active:scale-95"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">
                My Orders
              </h1>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                Palava & Taloja Kitchen Status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Kitchen Sync</span>
            </span>
          </div>
        </div>

        {/* Clean Segmented Tab Switcher */}
        {!isLoading && orders.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-3 pt-1">
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200/60 max-w-sm">
              <button
                onClick={() => setActiveTab('ongoing')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'ongoing'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Ongoing</span>
                {ongoingOrders.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === 'ongoing' ? 'bg-primary text-slate-950' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {ongoingOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('past')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'past'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Past Orders</span>
                {pastOrders.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === 'past' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {pastOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="animate-spin text-primary" size={36} />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Connecting to Kitchen Dispatch...
            </p>
          </div>
        ) : listenerError && orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-sm max-w-md mx-auto">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertCircle size={28} />
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1">Kitchen Sync Paused</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
              Could not fetch live updates. Your placed orders are safely stored in our kitchen queue.
            </p>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="w-full bg-primary text-slate-950 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <RefreshCw size={14} />
              <span>Retry Sync</span>
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-sm max-w-md mx-auto mt-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <PackageSearch size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1.5">No Orders Placed Yet</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
              When you order authentic dum biryani or thalis, your live handi preparation and receipt will appear here.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg active:scale-98 saffron-glow"
            >
              Explore Fresh Dum Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* TAB 1: ONGOING ORDERS */}
            {activeTab === 'ongoing' && (
              <AnimatePresence mode="wait">
                {ongoingOrders.length === 0 ? (
                  <motion.div
                    key="no-ongoing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-sm max-w-lg mx-auto"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                      <CheckCircle2 size={28} />
                    </div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">No Active Kitchen Orders</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 mb-5">
                      All your previous biryani feasts have been delivered. You can view past orders or start a new feast.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setActiveTab('past')}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-black uppercase hover:bg-slate-50 transition-colors"
                      >
                        View Past Orders
                      </button>
                      <button
                        onClick={() => navigate('/')}
                        className="px-5 py-2.5 rounded-xl bg-primary text-slate-950 text-xs font-black uppercase hover:scale-105 transition-transform saffron-glow"
                      >
                        Order Now
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ongoing-list"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Selector if multiple ongoing orders */}
                    {ongoingOrders.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {ongoingOrders.map(ord => (
                          <button
                            key={ord.id}
                            onClick={() => setSelectedOngoingId(ord.id)}
                            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                              activeOngoingOrder?.id === ord.id
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            Order {formatOrderId(ord.id)}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Active Order Live Tracker Terminal */}
                    {activeOngoingOrder && (() => {
                      const computed = activeOngoingOrder.computed;
                      const customer = getOrderCustomer(activeOngoingOrder);
                      const items = getOrderItems(activeOngoingOrder);
                      const StatusIcon = computed.meta.icon;
                      const waTrackUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                        `Hi Delicious Biryani Chef, I am checking status on my active order ${formatOrderId(activeOngoingOrder.id)}.`
                      )}`;

                      return (
                        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
                          {/* Live Tracker Header Banner */}
                          <div className="bg-slate-900 text-white p-6 sm:p-7 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    Live In Kitchen
                                  </span>
                                  <span className="text-xs font-mono font-bold text-slate-300">
                                    {formatOrderId(activeOngoingOrder.id)}
                                  </span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                  {computed.meta.title}
                                </h2>
                                <p className="text-xs text-slate-300 font-medium mt-1">
                                  {computed.meta.detail}
                                </p>
                                {computed.isDelayed && (
                                  <div className="mt-3 bg-amber-500/20 border border-amber-400/40 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-amber-200">
                                    <Flame size={14} className="text-amber-400 shrink-0" />
                                    <span>
                                      <strong>Chef's Update (+{computed.delayMinutes}m):</strong> {computed.delayReason || 'Peak Dum rush: slow simmering'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* ETA Badge */}
                              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 sm:text-right shrink-0">
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block leading-none mb-1">
                                  Estimated Delivery
                                </span>
                                <span className="text-lg font-black text-primary flex items-center sm:justify-end gap-1.5">
                                  <Clock size={16} />
                                  <span>~{computed.etaMinutes || 25} Mins</span>
                                </span>
                              </div>
                            </div>

                            {/* 4-Step Visual Timeline */}
                            <div className="mt-8 pt-6 border-t border-white/10">
                              <div className="grid grid-cols-4 gap-2 text-center">
                                {[
                                  { step: 1, label: 'Confirmed', sub: 'In Queue', icon: Clock },
                                  { step: 2, label: 'Dum Cooking', sub: 'Handi Sealed', icon: ChefHat },
                                  { step: 3, label: 'Out for Delivery', sub: 'To Gate', icon: Truck },
                                  { step: 4, label: 'Delivered', sub: 'Handover', icon: CheckCircle2 }
                                ].map((s) => {
                                  const isCurrent = computed.meta.stepNumber === s.step;
                                  const isComplete = computed.meta.stepNumber > s.step;

                                  return (
                                    <div key={s.step} className="flex flex-col items-center">
                                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all mb-2 ${
                                        isCurrent 
                                          ? 'bg-primary text-slate-950 ring-4 ring-primary/20 scale-105' 
                                          : isComplete 
                                          ? 'bg-emerald-500 text-white' 
                                          : 'bg-white/10 text-slate-400'
                                      }`}>
                                        {isComplete ? <Check size={16} strokeWidth={3} /> : <s.icon size={16} />}
                                      </div>
                                      <span className={`text-[10px] sm:text-xs font-black uppercase tracking-tight block ${
                                        isCurrent ? 'text-primary' : isComplete ? 'text-emerald-400' : 'text-slate-400'
                                      }`}>
                                        {s.label}
                                      </span>
                                      <span className="text-[8px] text-slate-400 font-medium hidden sm:block">
                                        {s.sub}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Order Details Body */}
                          <div className="p-6 sm:p-7 space-y-6">
                            {/* Destination & Rider Gate Notice */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                  Delivery Location
                                </span>
                                <p className="text-xs font-bold text-slate-800 leading-snug">
                                  {customer.address || 'Palava / Taloja Complex Gate'}
                                </p>
                              </div>

                              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                  Customer & Rider Call
                                </span>
                                <p className="text-xs font-bold text-slate-800">
                                  {customer.name} • +91 {customer.phone}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  Rider will call upon reaching gate
                                </span>
                              </div>
                            </div>

                            {/* Dishes in this Order */}
                            <div>
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                                Dishes in this Handi Feast
                              </h4>
                              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                                {items.map((it, idx) => (
                                  <div key={idx} className="p-3.5 bg-white flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2.5">
                                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-900 font-black text-[10px] flex items-center justify-center">
                                        {it.quantity || 1}
                                      </span>
                                      <span className="font-bold text-slate-800">
                                        {it.title || it.name}
                                      </span>
                                      {it.size && it.size !== 'Standard' && (
                                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                                          {it.size}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-black text-slate-900">
                                      ₹{(Number(it.price) || 0) * (Number(it.quantity) || 1)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Payment & Support Footer */}
                            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                  Payment Mode & Total
                                </span>
                                <p className="text-base font-black text-slate-900">
                                  ₹{activeOngoingOrder.total_amount || activeOngoingOrder.total}{' '}
                                  <span className="text-xs font-normal text-slate-500">
                                    ({String(activeOngoingOrder.payment_method || 'UPI').toUpperCase()})
                                  </span>
                                </p>
                              </div>

                              <a
                                href={waTrackUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full sm:w-auto bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
                              >
                                <MessageCircle size={14} className="text-emerald-600" />
                                <span>Message Kitchen Desk</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* TAB 2: PAST ORDERS */}
            {activeTab === 'past' && (
              <motion.div
                key="past-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {pastOrders.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-sm">
                    <p className="text-xs font-bold text-slate-500">No delivered orders yet.</p>
                  </div>
                ) : (
                  pastOrders.map((order) => {
                    const items = getOrderItems(order);
                    const customer = getOrderCustomer(order);
                    const isExpanded = expandedOrderId === order.id;

                    return (
                      <div 
                        key={order.id}
                        className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm transition-all hover:border-slate-300"
                      >
                        {/* Top Line: Ref + Date + Status Badge */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <span className="text-xs font-black font-mono text-slate-900">
                              {formatOrderId(order.id)}
                            </span>
                            <span className="text-slate-300 mx-2">•</span>
                            <span className="text-[11px] font-bold text-slate-400">
                              {formatOrderDate(order.created_at)}
                            </span>
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                            <Check size={10} strokeWidth={3} /> Delivered
                          </span>
                        </div>

                        {/* Middle Line: Items summary & Total */}
                        <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs text-slate-700 font-medium">
                            <p className="font-bold text-slate-900">
                              {items.map(it => `${it.quantity || 1}x ${it.title || it.name}`).join(' • ') || 'Delicious Biryani Feast'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Delivered to {customer.address ? customer.address.split(',')[0] : 'Palava / Taloja Gate'}
                            </p>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <span className="text-base font-black text-slate-900">
                              ₹{order.total_amount || order.total}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">
                              {String(order.payment_method || 'UPI').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: 1-Click Reorder + Receipt Accordion */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <span>{isExpanded ? 'Hide Invoice' : 'View Invoice'}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>

                          <button
                            onClick={() => handleReorder(order)}
                            className="bg-primary/10 hover:bg-primary text-slate-900 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <Sparkles size={12} className="text-[#ec6d13]" />
                            <span>Reorder Feast</span>
                          </button>
                        </div>

                        {/* Expandable Receipt Accordion */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-dashed border-slate-200 text-xs space-y-3"
                            >
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                  Itemized Receipt
                                </span>
                                {items.map((it, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-600">
                                    <span>{it.quantity || 1}x {it.title || it.name}</span>
                                    <span className="font-bold text-slate-800">
                                      ₹{(Number(it.price) || 0) * (Number(it.quantity) || 1)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                                <span>Grand Total</span>
                                <span className="text-primary font-black">₹{order.total_amount || order.total}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;
