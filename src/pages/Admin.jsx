import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChefHat, ShoppingBag, UtensilsCrossed, BarChart3, Tag, 
  Clock, MapPin, Phone, CheckCircle2, AlertCircle, ArrowUpRight, 
  Search, Plus, Edit2, Trash2, Power, RefreshCw, ChevronRight, 
  ExternalLink, MessageCircle, AlertTriangle, ShieldCheck, Flame, 
  Sparkles, DollarSign, Calendar, TrendingUp, Users, Eye, X, 
  Check, ArrowLeft, Volume2, VolumeX, Store, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  db, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc 
} from '../lib/firebase';
import useAuthStore from '../store/useAuthStore';
import useCartStore from '../store/useCartStore';
import { formatOrderId, formatOrderDate, getOrderItems, getOrderCustomer } from '../lib/orderStatus';
import { 
  getLiveProducts, 
  createProduct, 
  modifyProduct, 
  toggleStock, 
  removeProduct, 
  seedProductsIfEmpty,
  CATEGORIES 
} from '../lib/menuService';
import { 
  fetchCoupons, 
  saveCoupon, 
  toggleCouponStatus, 
  removeCoupon, 
  getSiteAnnouncement, 
  saveSiteAnnouncement,
  DEFAULT_COUPONS 
} from '../lib/promoService';

const ADMIN_WHATSAPP_NUMBER = import.meta.env.VITE_ADMIN_WHATSAPP || "919769793452";

const Admin = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut } = useAuthStore();
  const { showToast } = useCartStore();

  // Active Tab: 'orders' | 'menu' | 'analytics' | 'offers'
  const [activeTab, setActiveTab] = useState('orders');

  // Real-time Orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'active' | 'delivered' | 'cancelled'
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedOrderForDelay, setSelectedOrderForDelay] = useState(null);
  const [delayInputMinutes, setDelayInputMinutes] = useState(15);
  const [delayReasonInput, setDelayReasonInput] = useState('Kitchen peak Dum rush: slow simmering');

  // Sound chime for incoming orders
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevOrdersCountRef = useRef(0);

  // Menu Products State
  const [products, setProducts] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productFormData, setProductFormData] = useState({
    name: '',
    category: 'Thali',
    price: 250,
    portion_size: 'Full Thali',
    description: '',
    image_url: '/assets/thalis/chicken_biryani_thali.jpg',
    is_in_stock: true,
    is_special: false,
    spice_level: 'Medium Spiced'
  });

  // Offers & Promo State
  const [coupons, setCoupons] = useState(DEFAULT_COUPONS);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    discount_type: 'flat',
    discount_value: 50,
    min_order: 399,
    max_discount: 50,
    description: ''
  });
  const [announcementBanner, setAnnouncementBanner] = useState({
    enabled: true,
    badge: '🔥 SPECIAL OFFER',
    text: 'Use code BIRYANI50 for flat ₹50 OFF on orders above ₹399! Palava & Taloja Direct Dum Kitchen.',
    linkText: 'Order Now'
  });

  // 1. Real-time Orders Listener (Firestore onSnapshot)
  useEffect(() => {
    setOrdersLoading(true);
    let unsubscribe;
    try {
      const q = query(collection(db, 'orders'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const timeA = a.created_at?.toMillis?.() || new Date(a.created_at || 0).getTime();
          const timeB = b.created_at?.toMillis?.() || new Date(b.created_at || 0).getTime();
          return timeB - timeA;
        });

        // Detect new order arrival for chime notification
        if (prevOrdersCountRef.current > 0 && list.length > prevOrdersCountRef.current) {
          playOrderChime();
          showToast({
            type: 'info',
            title: '🚨 New Order Received!',
            message: `Order #${list[0].id.slice(-6).toUpperCase()} by ${list[0].customer_name || 'Customer'}`
          });
        }
        prevOrdersCountRef.current = list.length;

        setOrders(list);
        setOrdersLoading(false);
      }, (err) => {
        console.warn('Admin orders listener warning:', err);
        setOrdersLoading(false);
      });
    } catch (err) {
      console.warn('Admin orders setup error:', err);
      setOrdersLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // 2. Load Products & auto seed if needed
  useEffect(() => {
    loadProducts();
    const handleProductsUpdated = (e) => {
      if (e.detail) setProducts(e.detail);
    };
    window.addEventListener('products_updated', handleProductsUpdated);
    return () => window.removeEventListener('products_updated', handleProductsUpdated);
  }, []);

  const loadProducts = async () => {
    setMenuLoading(true);
    await seedProductsIfEmpty();
    const data = await getLiveProducts();
    setProducts(data);
    setMenuLoading(false);
  };

  // 3. Load Coupons & Announcement Banner
  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    setCouponsLoading(true);
    const cList = await fetchCoupons();
    setCoupons(cList);
    const ann = await getSiteAnnouncement();
    setAnnouncementBanner(ann);
    setCouponsLoading(false);
  };

  const playOrderChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (_) {}
  };

  // Status progression action
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Order marked as ${newStatus.replace('_', ' ').toUpperCase()}`
      });
    } catch (err) {
      console.warn('Update order status error:', err);
      showToast({ type: 'error', title: 'Update Failed', message: 'Could not update status in database.' });
    }
  };

  // Peak time delay handler
  const handleApplyDelay = async () => {
    if (!selectedOrderForDelay) return;
    try {
      await updateDoc(doc(db, 'orders', selectedOrderForDelay.id), {
        delay_minutes: Number(delayInputMinutes),
        delay_reason: delayReasonInput.trim(),
        extra_prep_time: Number(delayInputMinutes),
        updated_at: new Date().toISOString()
      });
      showToast({
        type: 'warning',
        title: 'Rush Delay Applied',
        message: `+${delayInputMinutes} mins delay added. Customer live ETA updated.`
      });
      setSelectedOrderForDelay(null);
    } catch (err) {
      console.warn('Delay apply error:', err);
      showToast({ type: 'error', title: 'Failed to Apply Delay', message: err.message });
    }
  };

  // 1-Click Toggle Paid Status
  const handleTogglePaymentStatus = async (order) => {
    const isCurrentlyPaid = order.payment_status === 'paid' || order.payment_method === 'upi';
    const newStatus = isCurrentlyPaid ? 'unpaid' : 'paid';
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        payment_status: newStatus,
        updated_at: new Date().toISOString()
      });
      showToast({
        type: 'success',
        title: newStatus === 'paid' ? 'Payment Verified' : 'Marked as Unpaid',
        message: `Order #${order.id.slice(-6).toUpperCase()} payment marked as ${newStatus.toUpperCase()}`
      });
    } catch (err) {
      console.warn('Toggle payment failed:', err);
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const status = String(o.status || 'placed').toLowerCase();
      const isActive = status === 'placed' || status === 'preparing' || status === 'out_for_delivery';
      
      if (orderFilter === 'active' && !isActive) return false;
      if (orderFilter === 'delivered' && status !== 'delivered') return false;
      if (orderFilter === 'cancelled' && status !== 'cancelled') return false;

      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const idMatch = o.id.toLowerCase().includes(q);
        const nameMatch = (o.customer_name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer_phone || '').includes(q);
        const addressMatch = (o.address_line || '').toLowerCase().includes(q);
        return idMatch || nameMatch || phoneMatch || addressMatch;
      }
      return true;
    });
  }, [orders, orderFilter, orderSearchQuery]);

  // Orders count KPIs
  const activeOrdersCount = useMemo(() => {
    return orders.filter(o => {
      const s = String(o.status || 'placed').toLowerCase();
      return s === 'placed' || s === 'preparing' || s === 'out_for_delivery';
    }).length;
  }, [orders]);

  // Analytics Computation
  const analyticsData = useMemo(() => {
    let totalRevenue = 0;
    let todayRevenue = 0;
    let todayOrdersCount = 0;
    const now = new Date();
    const todayDateStr = now.toDateString();

    const dayDistribution = {
      Sun: { count: 0, revenue: 0 },
      Mon: { count: 0, revenue: 0 },
      Tue: { count: 0, revenue: 0 },
      Wed: { count: 0, revenue: 0 },
      Thu: { count: 0, revenue: 0 },
      Fri: { count: 0, revenue: 0 },
      Sat: { count: 0, revenue: 0 },
    };

    const itemSalesMap = {};

    orders.forEach(o => {
      const amt = Number(o.total_amount || o.total || 0);
      if (o.status !== 'cancelled') {
        totalRevenue += amt;

        const orderDate = new Date(o.created_at?.toMillis?.() || o.created_at || Date.now());
        if (orderDate.toDateString() === todayDateStr) {
          todayRevenue += amt;
          todayOrdersCount += 1;
        }

        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][orderDate.getDay()];
        if (dayDistribution[dayName]) {
          dayDistribution[dayName].count += 1;
          dayDistribution[dayName].revenue += amt;
        }

        // Tally items
        const items = getOrderItems(o);
        items.forEach(it => {
          const name = it.title || it.name || 'Biryani Dish';
          const qty = Number(it.quantity) || 1;
          const price = Number(it.price) || 0;
          if (!itemSalesMap[name]) {
            itemSalesMap[name] = { name, count: 0, revenue: 0 };
          }
          itemSalesMap[name].count += qty;
          itemSalesMap[name].revenue += price * qty;
        });
      }
    });

    const bestSellers = Object.values(itemSalesMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Peak day
    const peakDayEntry = Object.entries(dayDistribution).reduce((max, curr) => {
      return curr[1].count > max.count ? { day: curr[0], ...curr[1] } : max;
    }, { day: 'Sun', count: 0, revenue: 0 });

    const aov = orders.length > 0 ? Math.round(totalRevenue / Math.max(1, orders.length)) : 0;

    return {
      totalRevenue,
      todayRevenue,
      todayOrdersCount,
      totalOrders: orders.length,
      aov,
      dayDistribution,
      peakDay: peakDayEntry.day,
      peakDayCount: peakDayEntry.count,
      bestSellers
    };
  }, [orders]);

  // Product Save / Edit Handler
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productFormData.name.trim() || !productFormData.price) {
      showToast({ type: 'error', title: 'Missing Details', message: 'Name and price are required.' });
      return;
    }

    try {
      if (editingProduct) {
        await modifyProduct(editingProduct.id, productFormData);
        showToast({ type: 'success', title: 'Dish Updated', message: `${productFormData.name} has been updated.` });
      } else {
        await createProduct(productFormData);
        showToast({ type: 'success', title: 'New Dish Added', message: `${productFormData.name} added to menu.` });
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      console.warn('Product save error:', err);
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductFormData({
      name: '',
      category: 'Thali',
      price: 250,
      portion_size: 'Full Thali',
      description: '',
      image_url: '/assets/thalis/chicken_biryani_thali.jpg',
      is_in_stock: true,
      is_special: false,
      spice_level: 'Medium Spiced'
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductFormData({
      name: prod.name || '',
      category: prod.category || 'Thali',
      price: prod.price || 0,
      portion_size: prod.portion_size || 'Full Thali',
      description: prod.description || '',
      image_url: prod.image_url || '/assets/thalis/chicken_biryani_thali.jpg',
      is_in_stock: prod.is_in_stock !== false,
      is_special: Boolean(prod.is_special),
      spice_level: prod.spice_level || 'Medium Spiced'
    });
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the menu?`)) {
      await removeProduct(id);
      showToast({ type: 'info', title: 'Dish Removed', message: `${name} has been removed.` });
      loadProducts();
    }
  };

  const handleToggleProductStock = async (id, currentStock, name) => {
    await toggleStock(id, !currentStock);
    showToast({
      type: 'info',
      title: !currentStock ? 'Dish In Stock' : 'Marked Sold Out',
      message: `${name} is now ${!currentStock ? 'available for order' : 'temporarily sold out'}.`
    });
    loadProducts();
  };

  // Coupon Creation Handler
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!couponFormData.code.trim() || !couponFormData.discount_value) {
      showToast({ type: 'error', title: 'Incomplete Offer', message: 'Coupon code and discount are required.' });
      return;
    }

    try {
      await saveCoupon(couponFormData);
      showToast({
        type: 'success',
        title: 'Offer Created',
        message: `Code ${couponFormData.code.toUpperCase()} is now live!`
      });
      setIsCouponModalOpen(false);
      setCouponFormData({
        code: '',
        discount_type: 'flat',
        discount_value: 50,
        min_order: 399,
        max_discount: 50,
        description: ''
      });
      loadPromos();
    } catch (err) {
      console.warn('Coupon save error:', err);
    }
  };

  const handleToggleCoupon = async (coupon) => {
    const updated = !coupon.is_active;
    await toggleCouponStatus(coupon.id, updated);
    showToast({
      type: 'info',
      title: updated ? 'Offer Enabled' : 'Offer Disabled',
      message: `Coupon ${coupon.code} is now ${updated ? 'active' : 'paused'}.`
    });
    loadPromos();
  };

  const handleDeleteCoupon = async (id, code) => {
    if (window.confirm(`Delete coupon "${code}"?`)) {
      await removeCoupon(id);
      showToast({ type: 'info', title: 'Offer Deleted', message: `Code ${code} removed.` });
      loadPromos();
    }
  };

  const handleSaveAnnouncement = async () => {
    await saveSiteAnnouncement(announcementBanner);
    showToast({
      type: 'success',
      title: 'Storefront Banner Updated',
      message: 'The new announcement is now visible on the customer app.'
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] font-sans pb-32 text-slate-900">
      {/* Top Professional Sticky Kitchen Bar */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
              <ChefHat size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black uppercase tracking-tight text-slate-900 leading-none">
                  Kitchen Admin Terminal
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Owner Desk
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span>Palava & Taloja Cloud Kitchen</span>
                <span>•</span>
                <span className="text-emerald-600 font-black flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio chime toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                soundEnabled 
                  ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' 
                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
              }`}
              title={soundEnabled ? 'Order sound alert enabled' : 'Order sound muted'}
              aria-label="Toggle order chime"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* View Storefront */}
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
            >
              <Store size={14} />
              <span>Storefront</span>
            </Link>

            {/* Sign Out */}
            <button
              onClick={() => {
                signOut();
                navigate('/');
              }}
              className="p-2 sm:px-3 sm:py-2 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-700 text-xs font-black uppercase tracking-wider hover:bg-rose-100 transition-colors flex items-center gap-1.5"
              title="Sign Out"
            >
              <Power size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Minimalist Segmented Tabs Switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 pt-1">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/70 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShoppingBag size={14} />
              <span>Orders</span>
              {activeOrdersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#ec6d13] text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeTab === 'menu'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UtensilsCrossed size={14} />
              <span>Menu Dishes</span>
              <span className="text-[10px] font-bold text-slate-400">({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 size={14} />
              <span>Analytics & Strategy</span>
            </button>

            <button
              onClick={() => setActiveTab('offers')}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                activeTab === 'offers'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Tag size={14} />
              <span>Offers & Promos</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: LIVE ORDERS TERMINAL
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Orders Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Active in Kitchen
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-600">{activeOrdersCount}</span>
                  <span className="text-xs text-slate-500 font-bold">orders in dum/transit</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Today's Orders
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{analyticsData.todayOrdersCount}</span>
                  <span className="text-xs text-slate-500 font-bold">completed & active</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Today's Revenue
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#ec6d13]">₹{analyticsData.todayRevenue}</span>
                  <span className="text-xs text-slate-500 font-bold">gross</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Avg Feast Value (AOV)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">₹{analyticsData.aov}</span>
                  <span className="text-xs text-slate-500 font-bold">per order</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: `All (${orders.length})` },
                  { id: 'active', label: `Active (${activeOrdersCount})` },
                  { id: 'delivered', label: 'Delivered' },
                  { id: 'cancelled', label: 'Cancelled' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setOrderFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      orderFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search by customer, phone, or order ID..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#ec6d13] transition-colors"
                />
              </div>
            </div>

            {/* Orders Feed */}
            {ordersLoading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-[#ec6d13] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Syncing live kitchen order stream...
                </p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag size={28} />
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">No Orders Found</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  {orderSearchQuery ? 'No orders match your search criteria.' : 'No orders in this status category.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredOrders.map(order => {
                  const items = getOrderItems(order);
                  const cust = getOrderCustomer(order);
                  const status = String(order.status || 'placed').toLowerCase();
                  const total = Number(order.total_amount || order.total || 0);
                  const isPaid = order.payment_status === 'paid' || order.payment_method === 'upi';
                  const isCOD = order.payment_method === 'cod';
                  const orderDate = formatOrderDate(order.created_at);
                  const delayMins = Number(order.delay_minutes || 0);

                  return (
                    <div 
                      key={order.id}
                      className={`bg-white rounded-3xl p-5 border transition-all shadow-sm space-y-4 ${
                        status === 'placed' 
                          ? 'border-amber-300 ring-2 ring-amber-400/20' 
                          : status === 'preparing'
                          ? 'border-orange-300'
                          : 'border-slate-200/80'
                      }`}
                    >
                      {/* Top Order Card Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-sm">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            {/* Status Badge */}
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              status === 'placed' 
                                ? 'bg-amber-100 text-amber-900 border border-amber-200 animate-pulse'
                                : status === 'preparing'
                                ? 'bg-orange-100 text-orange-900 border border-orange-200'
                                : status === 'out_for_delivery'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : 'bg-rose-100 text-rose-900 border border-rose-200'
                            }`}>
                              {status === 'placed' ? 'Confirmed & Queued' : status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            <span>{orderDate}</span>
                          </p>
                        </div>

                        {/* Amount & Payment Status */}
                        <div className="text-right">
                          <p className="text-lg font-black text-slate-900">₹{total}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isPaid 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isPaid ? '✓ Paid Online' : 'Collect Cash ₹' + total}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Customer Info & Contact Actions */}
                      <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-900">
                            {cust.name || 'Patron'}
                          </p>
                          <div className="flex items-center gap-2">
                            {cust.phone && (
                              <>
                                <a
                                  href={`tel:${cust.phone}`}
                                  className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-emerald-600 transition-colors shadow-sm"
                                  title="Call customer"
                                >
                                  <Phone size={13} />
                                </a>
                                <a
                                  href={`https://wa.me/91${cust.phone}?text=${encodeURIComponent(`Hello ${cust.name || ''}, this is Delicious Biryani Palava kitchen regarding order #${order.id.slice(-6).toUpperCase()}.`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm"
                                  title="WhatsApp customer"
                                >
                                  <MessageCircle size={13} />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                          <Phone size={11} className="text-slate-400" />
                          <span>+91 {cust.phone || 'No phone'}</span>
                        </p>

                        <p className="text-[11px] font-medium text-slate-600 flex items-start gap-1.5 leading-snug">
                          <MapPin size={12} className="text-[#ec6d13] shrink-0 mt-0.5" />
                          <span>{cust.address || 'Address not specified'}</span>
                        </p>

                        {order.utr_number && (
                          <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-400">UPI Ref / UTR:</span>
                            <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {order.utr_number}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Items Ordered List */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Dishes in Feast ({items.length} items):
                        </p>
                        <div className="space-y-1">
                          {items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                              <span className="font-bold text-slate-800">
                                {it.quantity || 1}x {it.title || it.name}
                                {it.size && it.size !== 'Standard' && (
                                  <span className="text-[10px] text-slate-400 font-medium ml-1">({it.size})</span>
                                )}
                              </span>
                              <span className="font-bold text-slate-500">₹{(Number(it.price) || 0) * (Number(it.quantity) || 1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delay / Rush Warning Banner if any */}
                      {delayMins > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-900">
                          <div className="flex items-center gap-1.5 font-bold">
                            <Flame size={14} className="text-amber-600" />
                            <span>Rush Delay: +{delayMins} mins applied</span>
                          </div>
                          <span className="text-[10px] text-amber-700 italic">
                            "{order.delay_reason || 'Peak rush'}"
                          </span>
                        </div>
                      )}

                      {/* Action Controls */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        {/* Status Transition Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {status === 'placed' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                              className="px-3 py-1.5 bg-[#ec6d13] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-colors shadow-sm"
                            >
                              👨‍🍳 Start Dum Cooking
                            </button>
                          )}
                          {status === 'preparing' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              🛵 Hand to Rider
                            </button>
                          )}
                          {status === 'out_for_delivery' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                              ✓ Mark Delivered
                            </button>
                          )}
                          {status !== 'delivered' && status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setSelectedOrderForDelay(order);
                                setDelayInputMinutes(order.delay_minutes || 15);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold hover:bg-slate-200 transition-colors"
                              title="Add peak rush delay time"
                            >
                              ⏱️ Adjust ETA
                            </button>
                          )}
                        </div>

                        {/* Payment Toggle & Cancel */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTogglePaymentStatus(order)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-colors"
                          >
                            {isPaid ? 'Mark Unpaid' : '✓ Mark Paid'}
                          </button>

                          {status !== 'delivered' && status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                if (window.confirm('Cancel this order?')) {
                                  handleUpdateOrderStatus(order.id, 'cancelled');
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Cancel order"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: MENU & DISH MANAGER
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Menu Header with Add Dish button */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Restaurant Menu Catalog
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Live menu syncing across Palava & Taloja customer apps in real time.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={loadProducts}
                  className="p-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-200 transition-colors"
                  title="Reload from database"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={handleOpenAddProduct}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#ec6d13] text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-md active:scale-95"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Add New Dish</span>
                </button>
              </div>
            </div>

            {/* Category Filter and Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['All', ...CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedMenuCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      selectedMenuCategory === cat
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  placeholder="Filter dishes..."
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#ec6d13]"
                />
              </div>
            </div>

            {/* Menu Items Grid */}
            {menuLoading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-[#ec6d13] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Loading menu catalog...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products
                  .filter(p => selectedMenuCategory === 'All' || p.category === selectedMenuCategory)
                  .filter(p => !menuSearchQuery || p.name.toLowerCase().includes(menuSearchQuery.toLowerCase()))
                  .map(prod => {
                    const inStock = prod.is_in_stock !== false;
                    return (
                      <div 
                        key={prod.id}
                        className={`bg-white rounded-3xl p-4 border transition-all shadow-sm flex flex-col justify-between ${
                          inStock ? 'border-slate-200/80' : 'border-slate-200 opacity-60 bg-slate-50'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Dish Image */}
                          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 relative">
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/assets/thalis/chicken_biryani_thali.jpg';
                              }}
                            />
                            {!inStock && (
                              <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                                <span className="text-[9px] font-black text-white uppercase tracking-wider">
                                  Sold Out
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {prod.category}
                              </span>
                              {prod.is_special && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                  ★ Special
                                </span>
                              )}
                            </div>
                            <h3 className="font-black text-slate-900 text-sm mt-1 truncate">
                              {prod.name}
                            </h3>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {prod.description || 'Authentic kitchen preparation.'}
                            </p>
                            <p className="text-sm font-black text-slate-900 mt-1">
                              ₹{prod.price}
                              {prod.portion_size && (
                                <span className="text-[10px] font-normal text-slate-400 ml-1">
                                  / {prod.portion_size}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          {/* Stock Toggle */}
                          <button
                            onClick={() => handleToggleProductStock(prod.id, inStock, prod.name)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                              inStock 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{inStock ? 'In Stock' : 'Mark In Stock'}</span>
                          </button>

                          {/* Edit & Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditProduct(prod)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                              title="Edit dish"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Delete dish"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 3: ANALYTICS & STRATEGY
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Big Revenue Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-1">
                    Store Performance Overview
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                    ₹{analyticsData.totalRevenue.toLocaleString('en-IN')}
                  </h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Cumulative gross revenue from {analyticsData.totalOrders} total orders
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                    Peak Volume Day
                  </span>
                  <span className="text-base font-black text-primary">
                    {analyticsData.peakDay} ({analyticsData.peakDayCount} orders)
                  </span>
                </div>
              </div>

              {/* Day of Week Breakdown Bar Chart */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>Orders By Day of Week (Volume Analysis)</span>
                </p>
                <div className="grid grid-cols-7 gap-2 h-36 items-end pt-4 border-b border-white/10 pb-2">
                  {Object.entries(analyticsData.dayDistribution).map(([day, val]) => {
                    const maxVal = Math.max(1, ...Object.values(analyticsData.dayDistribution).map(v => v.count));
                    const heightPercent = Math.max(12, Math.round((val.count / maxVal) * 100));
                    const isPeak = day === analyticsData.peakDay;

                    return (
                      <div key={day} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">
                          {val.count}
                        </span>
                        <div 
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[36px] rounded-xl transition-all ${
                            isPeak 
                              ? 'bg-gradient-to-t from-[#ec6d13] to-amber-400 shadow-md shadow-amber-500/30' 
                              : 'bg-white/20 group-hover:bg-white/30'
                          }`}
                        />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isPeak ? 'text-primary' : 'text-slate-400'}`}>
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Best Sellers & Strategy Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Best Sellers */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                      ★
                    </div>
                    <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">
                      Best Selling Dishes
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">By Volume</span>
                </div>

                {analyticsData.bestSellers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center font-medium">
                    Order history will populate best-seller rankings automatically.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {analyticsData.bestSellers.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.count} portions sold</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-[#ec6d13]">
                          ₹{item.revenue}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weekly Strategic Recommendations */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">
                      Strategic Growth Playbook for Next Week
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold">Automated Kitchen Insights</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1">
                    <p className="font-black text-amber-900 flex items-center gap-1.5">
                      <span>🔥 Weekend Dum Rush Preparedness</span>
                    </p>
                    <p className="text-amber-800 text-[11px]">
                      Historical data highlights peak surges on <strong>{analyticsData.peakDay}</strong>. Start slow-steaming your clay handis 40 minutes before 8:00 PM to eliminate late-delivery bottlenecks.
                    </p>
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-1">
                    <p className="font-black text-emerald-900 flex items-center gap-1.5">
                      <span>💰 Upsell Bundle for Higher AOV</span>
                    </p>
                    <p className="text-emerald-800 text-[11px]">
                      Current average feast value is <strong>₹{analyticsData.aov}</strong>. Introduce an Add-on combo (e.g. Extra Raita + Mirchi Pakoda for ₹69) at checkout to drive AOV above ₹500.
                    </p>
                  </div>

                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-1">
                    <p className="font-black text-blue-900 flex items-center gap-1.5">
                      <span>📍 Palava & Taloja Rider Routing</span>
                    </p>
                    <p className="text-blue-800 text-[11px]">
                      Casa Bella & Downtown orders dominate evening deliveries. Maintain a dedicated rider for Palava Phase 1 gates between 8:30 PM – 10:00 PM for sub-25 minute turnaround.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 4: OFFERS & PROMOS
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            {/* Top Storefront Announcement Control */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">
                    Storefront Announcement Banner
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Broadcast promo alerts and seasonal discount announcements live on the customer home page.
                  </p>
                </div>
                <button
                  onClick={() => setAnnouncementBanner(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                    announcementBanner.enabled 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${announcementBanner.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>{announcementBanner.enabled ? 'Live Banner ON' : 'Banner OFF'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Badge Title
                  </label>
                  <input
                    type="text"
                    value={announcementBanner.badge}
                    onChange={(e) => setAnnouncementBanner({ ...announcementBanner, badge: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                    placeholder="🔥 SPECIAL OFFER"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Announcement Message
                  </label>
                  <input
                    type="text"
                    value={announcementBanner.text}
                    onChange={(e) => setAnnouncementBanner({ ...announcementBanner, text: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-900"
                    placeholder="e.g. Use code BIRYANI50 for flat ₹50 OFF on orders above ₹399!"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveAnnouncement}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Save & Publish Announcement
                </button>
              </div>
            </div>

            {/* Coupons Management Header */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">
                  Active Discount Coupons
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Customers can enter these codes at checkout for instant discounts.
                </p>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(true)}
                className="px-4 py-2.5 bg-[#ec6d13] text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-orange-600 transition-all shadow-md active:scale-95"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Create Offer</span>
              </button>
            </div>

            {/* Coupons Grid */}
            {couponsLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                Loading promo codes...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map(coupon => {
                  const isActive = coupon.is_active !== false;
                  return (
                    <div 
                      key={coupon.id}
                      className={`bg-white rounded-3xl p-5 border transition-all shadow-sm space-y-3 ${
                        isActive ? 'border-slate-200/80' : 'border-slate-200 opacity-60 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono font-black text-base tracking-wider text-slate-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                            {coupon.code}
                          </span>
                          <p className="text-[11px] text-slate-500 font-medium mt-2">
                            {coupon.description || 'Promotional discount on all feast items.'}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400">Discount:</span>
                        <span className="font-black text-[#ec6d13]">
                          {coupon.discount_type === 'percentage' 
                            ? `${coupon.discount_value}% OFF` 
                            : `Flat ₹${coupon.discount_value} OFF`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400">Min Order:</span>
                        <span className="font-bold text-slate-700">₹{coupon.min_order || 0}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => handleToggleCoupon(coupon)}
                          className="text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-900"
                        >
                          {isActive ? 'Pause Offer' : 'Activate Offer'}
                        </button>

                        <button
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                          title="Delete coupon"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 1: ADD / EDIT DISH
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">
                  {editingProduct ? 'Edit Dish Details' : 'Add New Menu Item'}
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ec6d13]"
                    placeholder="e.g. Hyderabadi Dum Mutton Thali"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Category *
                    </label>
                    <select
                      value={productFormData.category}
                      onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-900"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={productFormData.price}
                      onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ec6d13]"
                      placeholder="290"
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Portion Size
                    </label>
                    <input
                      type="text"
                      value={productFormData.portion_size}
                      onChange={(e) => setProductFormData({ ...productFormData, portion_size: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 font-medium"
                      placeholder="Full Thali / 750gm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Spice Level
                    </label>
                    <select
                      value={productFormData.spice_level}
                      onChange={(e) => setProductFormData({ ...productFormData, spice_level: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs text-slate-900 font-medium"
                    >
                      <option value="Mild & Aromatic">Mild & Aromatic</option>
                      <option value="Medium Spiced">Medium Spiced</option>
                      <option value="Spicy & Robust">Spicy & Robust (Kolhapuri)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Photo URL or Local Asset Path
                  </label>
                  <input
                    type="text"
                    value={productFormData.image_url}
                    onChange={(e) => setProductFormData({ ...productFormData, image_url: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 font-mono"
                    placeholder="/assets/thalis/chicken_biryani_thali.jpg"
                  />
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setProductFormData({ ...productFormData, image_url: '/assets/thalis/chicken_biryani_thali.jpg' })}
                      className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      Biryani Thali
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductFormData({ ...productFormData, image_url: '/assets/thalis/fish_thali.jpg' })}
                      className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      Fish Thali
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductFormData({ ...productFormData, image_url: '/assets/thalis/veg_thali.jpg' })}
                      className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      Veg Thali
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={productFormData.description}
                    onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#ec6d13]"
                    placeholder="Short description of whole spices, gravy, or preparation."
                  />
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={productFormData.is_in_stock}
                      onChange={(e) => setProductFormData({ ...productFormData, is_in_stock: e.target.checked })}
                      className="rounded accent-[#ec6d13]"
                    />
                    <span>Available in Stock</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={productFormData.is_special}
                      onChange={(e) => setProductFormData({ ...productFormData, is_special: e.target.checked })}
                      className="rounded accent-[#ec6d13]"
                    />
                    <span>Chef's Special Badge</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-wider hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#ec6d13] text-white font-black text-xs uppercase tracking-wider hover:bg-orange-600 shadow-md"
                  >
                    {editingProduct ? 'Save Dish' : 'Publish Dish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 2: PEAK TIME / RUSH DELAY CONTROLLER
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedOrderForDelay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-amber-500" />
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                    Peak Dum Rush Delay: #{selectedOrderForDelay.id.slice(-6).toUpperCase()}
                  </h3>
                </div>
                <button onClick={() => setSelectedOrderForDelay(null)} className="p-1 text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                If the kitchen is experiencing heavy dinner rush or Dum simmering needs extra time, add extra minutes to the customer's live ETA tracker.
              </p>

              <div className="space-y-4">
                {/* Delay Presets */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                    Extra Preparation Time
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 20, 30].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDelayInputMinutes(mins)}
                        className={`py-2 rounded-xl text-xs font-black transition-all ${
                          delayInputMinutes === mins
                            ? 'bg-[#ec6d13] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        +{mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                    Rush Note Displayed to Customer
                  </label>
                  <select
                    value={delayReasonInput}
                    onChange={(e) => setDelayReasonInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-xs font-medium text-slate-900 mb-2"
                  >
                    <option value="Kitchen peak Dum rush: slow simmering">Kitchen peak Dum rush: slow simmering</option>
                    <option value="Heavy gate clearance / security line at Palava">Heavy gate clearance / security line at Palava</option>
                    <option value="Fresh Handi batch being sealed">Fresh Handi batch being sealed</option>
                    <option value="Monsoon rain rider caution">Monsoon rain rider caution</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDelayInputMinutes(0);
                      setDelayReasonInput('');
                      handleApplyDelay();
                    }}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Clear Delay
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyDelay}
                    className="flex-1 py-2.5 bg-[#ec6d13] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 shadow-md"
                  >
                    Update Customer ETA
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 3: CREATE NEW COUPON / OFFER
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isCouponModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                  Create Promotional Offer
                </h3>
                <button onClick={() => setIsCouponModalOpen(false)} className="p-1 text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveCoupon} className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={couponFormData.code}
                    onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono font-black text-slate-900 uppercase"
                    placeholder="e.g. WEEKEND100"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Discount Type
                    </label>
                    <select
                      value={couponFormData.discount_type}
                      onChange={(e) => setCouponFormData({ ...couponFormData, discount_type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-xs font-bold text-slate-900"
                    >
                      <option value="flat">Flat Rupee (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      value={couponFormData.discount_value}
                      onChange={(e) => setCouponFormData({ ...couponFormData, discount_value: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                      placeholder="50"
                      min={1}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Min Order Value (₹)
                    </label>
                    <input
                      type="number"
                      value={couponFormData.min_order}
                      onChange={(e) => setCouponFormData({ ...couponFormData, min_order: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                      placeholder="399"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Max Discount Cap (₹)
                    </label>
                    <input
                      type="number"
                      value={couponFormData.max_discount}
                      onChange={(e) => setCouponFormData({ ...couponFormData, max_discount: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                      placeholder="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Description for Customer
                  </label>
                  <input
                    type="text"
                    value={couponFormData.description}
                    onChange={(e) => setCouponFormData({ ...couponFormData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-medium"
                    placeholder="Flat ₹50 off on weekend Biryani feasts above ₹399"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCouponModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#ec6d13] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 shadow-md"
                  >
                    Publish Offer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;
