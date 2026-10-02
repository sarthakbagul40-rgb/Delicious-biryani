import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Plus, Minus, Check, ShoppingCart, Filter, Flame, Clock, Loader2, ChevronRight, Sparkles, X, RefreshCw, ChefHat, UtensilsCrossed, CookingPot, PlusCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, collection, getDocs } from '../lib/firebase';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { getInitialProducts, cacheProducts, withTimeout } from '../lib/networkUtils';

const CATEGORY_ITEMS = [
  { id: 'All', label: 'All', icon: ChefHat },
  { id: 'Thali', label: 'Thali', icon: UtensilsCrossed },
  { id: 'Main Course', label: 'Main Course', icon: CookingPot },
  { id: 'Starter', label: 'Starter', icon: Flame },
  { id: 'Add-ons', label: 'Add-ons', icon: PlusCircle },
];

const CATEGORIES = CATEGORY_ITEMS.map((c) => c.id);


const MOOD_CONFIG = {
  spicy: {
    id: 'spicy',
    label: 'Spicy & Robust',
    icon: '🌶️',
    desc: 'Fiery, bold & authentic Kolhapuri heat',
    activeStyle: 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/30',
    idleStyle: 'bg-orange-50 text-orange-700 border-orange-200/80 hover:bg-orange-100',
    badgeText: '🌶️ Spicy & Robust Pick',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
    filter: (item) => {
      const text = `${item.name} ${item.description || ''}`.toLowerCase();
      if (text.includes('mutton')) return false;
      return (
        text.includes('kharda') ||
        text.includes('masala thali') ||
        text.includes('fish thali') ||
        text.includes('chicken fry') ||
        text.includes('tawa fry') ||
        text.includes('fish curry') ||
        text.includes('mirchi pakoda') ||
        text.includes('biryani (750gm)') ||
        text.includes('spicy')
      );
    }
  },
  mild: {
    id: 'mild',
    label: 'Comforting & Traditional',
    icon: '🍲',
    desc: 'Wholesome royal thalis & homestyle curries',
    activeStyle: 'bg-amber-500 text-slate-950 border-amber-600 shadow-md shadow-amber-500/30',
    idleStyle: 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100',
    badgeText: '🍲 Comforting Pick',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    filter: (item) => {
      const text = `${item.name} ${item.description || ''}`.toLowerCase();
      if (text.includes('mutton') || text.includes('kharda')) return false;
      return (
        text.includes('biryani thali') ||
        text.includes('veg thali') ||
        text.includes('chicken curry') ||
        text.includes('kheema') ||
        text.includes('green chicken') ||
        text.includes('eggs masala') ||
        text.includes('egg curry') ||
        text.includes('egg burji') ||
        text.includes('biryani (450gm)')
      );
    }
  },
  light: {
    id: 'light',
    label: 'Quick & Crispy',
    icon: '🥗',
    desc: 'Sizzling starters, crunchy bites & quick snacks',
    activeStyle: 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/30',
    idleStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100',
    badgeText: '🥗 Quick & Crispy Pick',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    filter: (item) => {
      const text = `${item.name} ${item.description || ''}`.toLowerCase();
      if (text.includes('mutton')) return false;
      return (
        text.includes('fish fry') ||
        text.includes('chicken fry') ||
        text.includes('tandoori') ||
        text.includes('tawa fry') ||
        text.includes('pakoda') ||
        text.includes('maggie') ||
        text.includes('omelette') ||
        (item.category === 'Starter' && !text.includes('thali'))
      );
    }
  }
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { cart, addToCart, updateQuantity } = useCartStore();

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  // Instant render from local cache or fallback for 0ms initial paint on slow 3G/4G
  const [menuItems, setMenuItems] = useState(getInitialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodResult, setMoodResult] = useState(null);
  const [isCrunching, setIsCrunching] = useState(false);
  const [lastSuggestedIds, setLastSuggestedIds] = useState({});
  const [justAddedMoodItem, setJustAddedMoodItem] = useState(false);

  useEffect(() => {
    fetchMenu();
    const handleProductsUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setMenuItems(e.detail.filter(item => item.category !== 'ARCHIVED'));
      }
    };
    window.addEventListener('products_updated', handleProductsUpdated);
    return () => window.removeEventListener('products_updated', handleProductsUpdated);
  }, []);

  const fetchMenu = async () => {
    // If no items, show spinner, otherwise revalidate in background
    if (!menuItems || menuItems.length === 0) setIsLoading(true);

    try {
      // 2.5s network timeout ensures slow 3G won't hang the UI
      const fetchPromise = getDocs(collection(db, 'products'));
      const snap = await withTimeout(fetchPromise, 2500);
      
      if (!snap.empty) {
        const rawList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Deduplicate by name, preferring local assets for thalis
        const uniqueItems = rawList.reduce((acc, current) => {
          const x = acc.find(item => item.name === current.name);
          if (!x) {
            return acc.concat([current]);
          } else {
            if (current.image_url?.startsWith('/assets/') && !x.image_url?.startsWith('/assets/')) {
              const index = acc.indexOf(x);
              acc[index] = current;
            }
            return acc;
          }
        }, []);
        const clean = uniqueItems.filter(item => item.category !== 'ARCHIVED');
        if (clean.length > 0) {
          setMenuItems(clean);
          cacheProducts(clean);
        }
      } else {
        if (!menuItems || menuItems.length === 0) {
          setMenuItems(FALLBACK_PRODUCTS);
        }
      }
    } catch (err) {
      console.warn('Firestore products fetch warning (using cached/fallback menu):', err);
      // Keep existing menuItems (from initial fallback/cache)
      if (!menuItems || menuItems.length === 0) {
        setMenuItems(FALLBACK_PRODUCTS);
      }
    } finally {
      setIsLoading(false);
    }
  };


  const filteredItems = menuItems.filter(item => {
    // 1. HARD CATEGORY BLOCK
    if (['Mutton', 'Signature', 'Chicken', 'Egg', 'Veg'].includes(item.category)) return false;
    if (item.name.toLowerCase().includes('mutton')) return false;

    // 2. SEARCH & CATEGORY FILTER
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handleMoodSelect = (moodKey, isShuffle = false) => {
    setSelectedMood(moodKey);
    setIsCrunching(true);
    setJustAddedMoodItem(false);
    
    // Snappy animation: 350ms for shuffle, 550ms for initial click
    const delay = isShuffle ? 350 : 550;
    
    setTimeout(() => {
      const config = MOOD_CONFIG[moodKey];
      if (!config) {
        setIsCrunching(false);
        return;
      }

      // Filter available candidates matching mood criteria
      let candidates = menuItems.filter(item => {
        if (item.is_in_stock === false) return false;
        return config.filter(item);
      });

      // Safe fallback if filter somehow returns empty
      if (candidates.length === 0) {
        if (moodKey === 'spicy') {
          candidates = menuItems.filter(item => item.name.toLowerCase().includes('masala') || item.name.toLowerCase().includes('fry'));
        } else if (moodKey === 'mild') {
          candidates = menuItems.filter(item => item.category === 'Thali' || item.name.toLowerCase().includes('curry'));
        } else {
          candidates = menuItems.filter(item => item.category === 'Starter' || item.category === 'Add-ons');
        }
      }
      if (candidates.length === 0) {
        candidates = menuItems;
      }

      // Exclude previous suggestion to ensure fresh rotation across clicks
      const previousId = lastSuggestedIds[moodKey];
      const eligiblePool = candidates.length > 1 
        ? candidates.filter(item => item.id !== previousId)
        : candidates;

      const poolToPickFrom = eligiblePool.length > 0 ? eligiblePool : candidates;
      const picked = poolToPickFrom[Math.floor(Math.random() * poolToPickFrom.length)];

      setLastSuggestedIds(prev => ({ ...prev, [moodKey]: picked?.id }));
      setMoodResult(picked);
      setIsCrunching(false);
    }, delay);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen pb-32">
      {/* Mobile-only Top Bar (Scrolls naturally with content - not fixed, freeing screen space on mobile) */}
      <div className="md:hidden bg-white px-5 pt-6 pb-3 border-b border-slate-100">
        <header className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f4c430] rounded-full flex items-center justify-center saffron-glow overflow-hidden border-2 border-white">
               <img 
                src={user?.photoURL || user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.email || 'guest'}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=guest';
                }}
               />

            </div>
            <div>
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-primary fill-primary" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Palava & Taloja</p>
                <ChevronRight size={10} className="text-slate-300" />
              </div>
              <h1 className="text-base font-black text-slate-900 tracking-tight uppercase mt-0.5">
                {user?.user_metadata?.full_name?.split(' ')[0] || 'Delicious'} Biryani
              </h1>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/checkout')}
            className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg relative active:scale-95 transition-transform"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-slate-950 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        {/* Search Input on Mobile */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search biryani, starters, thalis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100/70 border border-slate-200/50 rounded-full py-3 pl-11 pr-11 text-sm font-medium text-slate-800 transition-all focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
             <Sparkles size={18} onClick={() => setIsMoodModalOpen(true)} className="cursor-pointer hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 max-w-7xl 2xl:max-w-[1920px] mx-auto">
        {/* Desktop Search Bar (Hidden on Mobile) */}
        <div className="hidden md:flex items-center justify-between gap-6 mb-8 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="relative flex-1">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search dishes, thalis, starters, or add-ons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3.5 pl-14 pr-12 text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600">
                Clear
              </button>
            )}
          </div>
          <button
            onClick={() => setIsMoodModalOpen(true)}
            className="bg-primary/10 border border-primary/20 text-slate-900 px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-primary hover:text-slate-950 transition-all active:scale-95"
          >
            <Sparkles size={16} className="text-primary" />
            <span>AI Mood Selector</span>
          </button>
        </div>

        {/* Categories (Adaptive 5-column grid: eliminates side-scrolling on all devices) */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-6 py-2 mb-8 items-start justify-items-center max-w-2xl mx-auto w-full">
          {CATEGORY_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeCategory === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveCategory(item.id)}
                className="flex flex-col items-center gap-1.5 sm:gap-2 group w-full transition-transform active:scale-95"
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                  isActive 
                    ? 'bg-primary border-primary shadow-lg shadow-primary/30 scale-105 text-slate-950 saffron-glow' 
                    : 'bg-white border-slate-100 shadow-sm text-slate-600 group-hover:border-primary/40 group-hover:text-primary group-hover:shadow-md'
                }`}>
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2.2} 
                    className="transition-transform duration-300 group-hover:scale-110" 
                  />
                </div>
                <span className={`text-[9px] sm:text-xs font-black uppercase tracking-wider text-center leading-tight break-words px-0.5 w-full transition-colors ${
                  isActive ? 'text-primary font-black' : 'text-slate-500 font-bold group-hover:text-slate-800'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>


        {/* Luxury Hero Banner (Adaptive 2-column layout: rich culinary visuals + trust markers) */}
        {activeCategory === 'All' && !searchQuery && (
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-[#1b120c] rounded-[32px] sm:rounded-[44px] p-6 sm:p-10 lg:p-12 mb-12 relative overflow-hidden text-white shadow-2xl shadow-slate-900/10 border border-amber-500/20">
            {/* Ambient Heritage Light Flares */}
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#f4c430]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#ec6d13]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Headline, Trust Metrics & CTA */}
              <div className="lg:col-span-7 space-y-6 text-left">
                {/* Top Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 backdrop-blur-md">
                  <Flame size={12} className="text-primary fill-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                    Master Kitchen Special • Since 1994
                  </span>
                </div>

                {/* Main Heading */}
                <div className="space-y-1">
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-[1.08] text-white">
                    Authentic Royal
                  </h3>
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-[1.08] bg-gradient-to-r from-[#f4c430] via-amber-200 to-[#ec6d13] bg-clip-text text-transparent italic">
                    Dum Biryani Feast
                  </h3>
                </div>

                {/* Subtitle */}
                <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                  Slow-cooked in authentic clay handis with 24 secret heritage spices. Pure Basmati grains, tender cuts, and aromatic dum sealed fresh for Palava & Taloja.
                </p>

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-1">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-bold text-slate-200">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span>4.9★ (2.4k+ Reviews)</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-bold text-slate-200">
                    <Clock size={12} className="text-primary" />
                    <span>25–30 Min Fresh Prep</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-bold text-slate-200">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    <span>100% Dum Cooked</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3.5 pt-2 items-center">
                  <button 
                    onClick={() => {
                      const element = document.getElementById('menu-heading');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-gradient-to-r from-[#ec6d13] to-[#f4c430] text-slate-950 px-7 sm:px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2.5 shadow-xl shadow-[#ec6d13]/25 hover:scale-105 active:scale-95 transition-all saffron-glow"
                  >
                    <span>Explore Royal Menu</span>
                    <ChevronRight size={16} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={() => setIsMoodModalOpen(true)}
                    className="bg-white/10 hover:bg-white/15 border border-white/15 text-white px-5 sm:px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md transition-all active:scale-95"
                  >
                    <Sparkles size={14} className="text-primary" />
                    <span>AI Mood Matcher</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Hero Dish Showcase */}
              <div className="lg:col-span-5 flex justify-center items-center relative">
                <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md aspect-[4/3] sm:aspect-square flex items-center justify-center">
                  {/* Outer Golden Ambient Glow */}
                  <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-tr from-[#ec6d13]/25 via-[#f4c430]/20 to-transparent blur-xl pointer-events-none" />

                  {/* Framed Dish Showcase */}
                  <div className="relative w-full h-full rounded-[28px] overflow-hidden border border-amber-500/30 shadow-2xl shadow-black/60 group">
                    <img 
                      src="/assets/main_course/chicken_biryani_full.png"
                      alt="Signature Royal Chicken Dum Biryani"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/assets/main_course/chicken_curry.png';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
                      onClick={() => {
                        const element = document.getElementById('menu-heading');
                        element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    />
                    {/* Subtle Vignette Overlay for rich contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/15 pointer-events-none" />
                  </div>

                  {/* Floating Micro-Badge Top Right */}
                  <div className="absolute top-3 right-3 z-20 bg-slate-950/90 backdrop-blur-md border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Clay Handi Dum
                    </p>
                  </div>

                  {/* Floating Micro-Badge Bottom Left */}
                  <div className="absolute bottom-3 left-3 z-20 bg-slate-950/90 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs">
                      👑
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        Bestseller
                      </p>
                      <p className="text-xs font-black text-white leading-none mt-0.5">
                        Chef's #1 Pick
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Section Heading */}
        <h2 id="menu-heading" className="text-xl sm:text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight flex items-center justify-between">
          <span>{searchQuery ? `Searching for "${searchQuery}"` : activeCategory === 'All' ? 'Sensational Picks' : `${activeCategory} Creations`}</span>
          {isLoading && <Loader2 className="animate-spin text-primary" size={20} />}
        </h2>

        {/* Responsive Product Grid: 1 col on mobile, 2 on tablet, 3 on laptop, 4 on desktop/4K */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => navigate(`/details/${item.id}`)}
                className={`flex flex-col sm:flex-row lg:flex-col bg-white rounded-[24px] sm:rounded-[28px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-200/70 transition-all hover:shadow-xl hover:border-primary/30 active:scale-[0.98] cursor-pointer relative gap-4 ${
                  !item.is_in_stock ? 'opacity-60 grayscale cursor-not-allowed' : ''
                }`}
              >
                {/* Image Container with Low-Connection Lazy Loading */}
                <div className="relative w-full sm:w-32 lg:w-full aspect-[4/3] sm:aspect-square lg:aspect-[4/3] rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/assets/main_course/chicken_curry.png';
                    }}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  {!item.is_in_stock && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-[9px] text-white font-black uppercase tracking-widest text-center px-2">
                       Sold Out
                    </div>
                  )}
                  {item.is_special && (
                    <div className="absolute top-2 left-2 bg-primary text-slate-950 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm">
                      Bestseller
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-700">
                    {item.portion_size || 'Full Pack'}
                  </div>
                </div>

                {/* Card Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-snug mb-1 line-clamp-1">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      <span className="flex items-center gap-1 text-emerald-600 font-black">
                        <Clock size={11} /> 20 min
                      </span>
                      <span className="flex items-center gap-1 text-slate-700">
                        <Star size={11} className="text-yellow-400 fill-yellow-400" /> 4.8
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-auto">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</p>
                      <p className="text-lg font-black text-slate-900 leading-none mt-0.5">₹{item.price}</p>
                    </div>
                    {(() => {
                      const cartItem = cart.find((c) => c.id === item.id);
                      if (cartItem && cartItem.quantity > 0) {
                        return (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="flex items-center gap-1.5 bg-primary text-slate-950 font-black rounded-xl p-1 shadow-md shadow-primary/25 border border-primary animate-in fade-in zoom-in-95 duration-200"
                          >
                            <motion.button 
                              whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.id, cartItem.size, cartItem.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center transition-colors shadow-sm"
                              title="Decrease quantity"
                            >
                              <Minus size={13} strokeWidth={3} />
                            </motion.button>
                            <motion.span 
                              key={cartItem.quantity}
                              initial={{ scale: 1.35, color: '#16a34a' }}
                              animate={{ scale: 1, color: '#020617' }}
                              transition={{ duration: 0.2 }}
                              className="w-6 text-center text-xs font-black"
                            >
                              {cartItem.quantity}
                            </motion.span>
                            <motion.button 
                              whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.id, cartItem.size, cartItem.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center transition-colors shadow-sm"
                              title="Increase quantity"
                            >
                              <Plus size={13} strokeWidth={3} />
                            </motion.button>
                          </div>
                        );
                      }
                      return (
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.03 }}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (item.is_in_stock) {
                              addToCart({ ...item, title: item.name, image: item.image_url }); 
                            }
                          }}
                          disabled={!item.is_in_stock}
                          className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-slate-950 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          <Plus size={13} strokeWidth={3} />
                          <span>ADD</span>
                        </motion.button>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 p-8 my-6">
             <Filter className="mx-auto mb-4 text-slate-300" size={48} />
             <h3 className="text-slate-700 font-black uppercase tracking-tight text-lg mb-1">No dishes found</h3>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Try selecting another category or clear your search.</p>
          </div>
        )}
      </div>

      {/* MOOD MODAL */}
      <AnimatePresence>
        {isMoodModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoodModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm sm:max-w-md bg-white rounded-[32px] p-6 sm:p-7 shadow-2xl z-10 text-center max-h-[90vh] overflow-y-auto"
            >
              {/* Header with Title and Close Button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-slate-900 flex items-center justify-center">
                    <Sparkles size={16} className="text-slate-950" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">AI Mood Selector</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chef's Smart Recommendations</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMoodModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Mood Choice Buttons */}
              <div className="space-y-2">
                {Object.values(MOOD_CONFIG).map((mood) => {
                  const isSelected = selectedMood === mood.id;
                  return (
                    <button 
                      key={mood.id}
                      onClick={() => handleMoodSelect(mood.id)}
                      className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 active:scale-98 ${
                        isSelected 
                          ? mood.activeStyle 
                          : mood.idleStyle
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{mood.icon}</span>
                        <div className="min-w-0">
                          <p className="font-black text-xs uppercase tracking-wider leading-snug truncate">
                            {mood.label}
                          </p>
                          <p className="text-[10px] font-medium tracking-normal line-clamp-1 opacity-80">
                            {mood.desc}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Crunching State */}
              {isCrunching && (
                <div className="py-7 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-primary" size={26} />
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                    Pairing with your craving...
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Consulting secret recipes
                  </p>
                </div>
              )}

              {/* Recommendation Card */}
              {moodResult && !isCrunching && (
                <motion.div 
                  key={moodResult.id}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  transition={{ duration: 0.2 }}
                  className="pt-4 mt-3 border-t border-slate-100"
                >
                  {/* Badge & Shuffle */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${MOOD_CONFIG[selectedMood]?.badgeColor || 'bg-primary/20 text-slate-900 border-primary/30'}`}>
                      {MOOD_CONFIG[selectedMood]?.badgeText || '✨ Chef Pick'}
                    </span>
                    <button
                      onClick={() => handleMoodSelect(selectedMood, true)}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-900 active:scale-95 transition-all px-2 py-1 rounded-lg hover:bg-slate-100"
                      title="Shuffle to another dish for this mood"
                    >
                      <RefreshCw size={11} />
                      <span>Try Another</span>
                    </button>
                  </div>

                  {/* Dish Showcase Card */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-left mb-3.5">
                    <div className="flex gap-3 items-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200/60 relative">
                        <img 
                          src={moodResult.image_url || moodResult.image || '/assets/main_course/chicken_curry.png'} 
                          alt={moodResult.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/assets/main_course/chicken_curry.png';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          {moodResult.category} {moodResult.portion_size ? `• ${moodResult.portion_size}` : ''}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 uppercase leading-snug truncate">
                          {moodResult.name}
                        </h4>
                        <p className="text-sm font-black text-slate-900 mt-1">
                          ₹{moodResult.price}
                        </p>
                      </div>
                    </div>
                    {moodResult.description && (
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-2 mt-2 pt-2 border-t border-slate-200/60 leading-relaxed italic">
                        "{moodResult.description}"
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        addToCart({ ...moodResult, title: moodResult.name, image: moodResult.image_url || moodResult.image });
                        setJustAddedMoodItem(true);
                        setTimeout(() => setJustAddedMoodItem(false), 1600);
                      }}
                      className={`w-full py-2.5 px-2 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 ${
                        justAddedMoodItem 
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
                          : 'bg-primary text-slate-950 shadow-primary/20 hover:brightness-105'
                      }`}
                    >
                      {justAddedMoodItem ? (
                        <>
                          <Check size={13} strokeWidth={3} />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} strokeWidth={3} />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => { 
                        setIsMoodModalOpen(false); 
                        navigate(`/details/${moodResult.id}`); 
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-2 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-1 transition-all active:scale-95"
                    >
                      <span>View Dish</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { FALLBACK_PRODUCTS };
export default Home;
