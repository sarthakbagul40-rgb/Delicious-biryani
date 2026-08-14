import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Plus, ShoppingCart, Heart, Filter, Flame, Clock, Loader2, ChevronRight, Sparkles, Smile, Zap, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/useCartStore';
import useAuthStore from '../store/useAuthStore';

export const FALLBACK_PRODUCTS = [
  // Thalis
  { id: 'thali-1', name: 'Chicken Biryani Thali', category: 'Thali', price: 390, portion_size: 'Full Thali', description: 'Authentic Hyderabadi chicken biryani served with chicken gravy, raita, and salad.', image_url: '/assets/thalis/chicken_biryani_thali.jpg', is_in_stock: true, is_special: true },
  { id: 'thali-2', name: 'Chicken Masala Thali', category: 'Thali', price: 190, portion_size: 'Full Thali', description: 'Spicy chicken masala curry served with bhakri/chapati, plain rice, and salad.', image_url: '/assets/thalis/chicken_masala_thali.jpg', is_in_stock: true },
  { id: 'thali-3', name: 'Eggs Masala Thali', category: 'Thali', price: 170, portion_size: 'Full Thali', description: 'Boiled egg masala curry served with bhakri/chapati, rice, and salad.', image_url: '/assets/thalis/eggs_masala_thali.jpg', is_in_stock: true },
  { id: 'thali-4', name: 'Fish Thali', category: 'Thali', price: 300, portion_size: 'Full Thali', description: 'Fresh pan-fried fish served with spicy Malvani fish curry, rice, and bhakri.', image_url: '/assets/thalis/fish_thali.jpg', is_in_stock: true },
  { id: 'thali-5', name: 'Veg Thali', category: 'Thali', price: 150, portion_size: 'Full Thali', description: 'Paneer gravy, veg fry, dal, rice, 2 chapatis, and salad.', image_url: '/assets/thalis/veg_thali.jpg', is_in_stock: true },

  // Main Course
  { id: 'mc-1', name: 'Chicken Biryani (750gm)', category: 'Main Course', price: 230, portion_size: '750gm', description: 'Aromatic long-grain Basmati rice layered with juicy marinated chicken pieces cooked on slow Dum.', image_url: '/assets/main_course/chicken_biryani_full.png', is_in_stock: true, is_special: true },
  { id: 'mc-2', name: 'Chicken Biryani (450gm)', category: 'Main Course', price: 140, portion_size: '450gm', description: 'Half portion of fragrant slow-cooked Dum biryani with tender chicken pieces.', image_url: '/assets/main_course/chicken_biryani_half.png', is_in_stock: true },
  { id: 'mc-3', name: 'Chicken Curry (500ml)', category: 'Main Course', price: 180, portion_size: '500ml', description: 'Traditional homestyle chicken curry cooked with roasted whole spices.', image_url: '/assets/main_course/chicken_curry.png', is_in_stock: true },
  { id: 'mc-4', name: 'Chicken Kheema (300ml)', category: 'Main Course', price: 200, portion_size: '300ml', description: 'Minced chicken cooked with green peas, onions, tomatoes, and aromatic spices.', image_url: '/assets/main_course/chicken_kheema.png', is_in_stock: true },
  { id: 'mc-5', name: 'Green Chicken Gravy (300ml)', category: 'Main Course', price: 200, portion_size: '300ml', description: 'Tender chicken cooked in a lush mint, coriander, and spinach green masala.', image_url: '/assets/main_course/green_chicken_gravy.png', is_in_stock: true },
  { id: 'mc-6', name: 'Kharda Chicken (300ml)', category: 'Main Course', price: 220, portion_size: '300ml', description: 'Fiery Kolhapuri green chili crushed Kharda chicken fry with robust flavors.', image_url: '/assets/main_course/kharda_chicken.png', is_in_stock: true },
  { id: 'mc-7', name: 'Fish Curry (500ml)', category: 'Main Course', price: 200, portion_size: '500ml', description: 'Fresh fish cooked in a tangy coconut and red chili Kokani style curry.', image_url: '/assets/thalis/fish_thali.jpg', is_in_stock: true },
  { id: 'mc-8', name: 'Egg Burji (500ml)', category: 'Main Course', price: 150, portion_size: '500ml', description: 'Street-style scrambled eggs tossed with chopped onions, tomatoes, green chilies, and herbs.', image_url: '/assets/main_course/egg_curry.png', is_in_stock: true },
  { id: 'mc-9', name: 'Egg Curry (500ml)', category: 'Main Course', price: 170, portion_size: '500ml', description: 'Hard-boiled eggs simmered in a rich tomato and onion spiced gravy.', image_url: '/assets/main_course/egg_curry.png', is_in_stock: true },

  // Starters
  { id: 'st-1', name: 'Chicken Tandoori', category: 'Starter', price: 270, portion_size: 'Half Bird', description: 'Charcoal roasted tandoori chicken marinated in yogurt and Kashmiri spices.', image_url: '/assets/starters/chicken_tandoori.png', is_in_stock: true, is_special: true },
  { id: 'st-2', name: 'Chicken Fry', category: 'Starter', price: 160, portion_size: '250gm', description: 'Crispy deep-fried spicy chicken bites tossed with curry leaves.', image_url: '/assets/starters/chicken_fry.png', is_in_stock: true },
  { id: 'st-3', name: 'Chicken Tawa Fry', category: 'Starter', price: 150, portion_size: '300gm', description: 'Pan-seared marinated chicken cooked on iron tawa with crushed garlic and spices.', image_url: '/assets/starters/chicken_tawa_fry.png', is_in_stock: true },
  { id: 'st-4', name: 'Fish Fry', category: 'Starter', price: 200, portion_size: '2 Pcs', description: 'Crispy rava-coated fried fish fillets marinated in spicy Konkani masala.', image_url: '/assets/starters/fish_fry.png', is_in_stock: true },
  { id: 'st-5', name: 'Single Omelette', category: 'Starter', price: 50, portion_size: '1 Egg', description: 'Single egg street-style omelette with onion and spice seasoning.', image_url: '/assets/starters/single_omelette.png', is_in_stock: true },
  { id: 'st-6', name: 'Double Omelette', category: 'Starter', price: 90, portion_size: '2 Eggs', description: 'Fluffy double egg omelette cooked with chopped onions, green chilies, and herbs.', image_url: '/assets/starters/double_omelette.png', is_in_stock: true },
  { id: 'st-7', name: 'Boil Eggs', category: 'Starter', price: 70, portion_size: '2 Pcs', description: 'Freshly boiled eggs sprinkled with chat masala and black pepper.', image_url: '/assets/starters/boil_eggs.png', is_in_stock: true },
  { id: 'st-8', name: 'Plain Maggie', category: 'Starter', price: 60, portion_size: '1 Bowl', description: 'Classic 2-minute masala Maggi noodles served piping hot.', image_url: '/assets/starters/plain_maggie.png', is_in_stock: true },
  { id: 'st-9', name: 'Veg Maggie', category: 'Starter', price: 90, portion_size: '1 Bowl', description: 'Maggi noodles loaded with sweet corn, capsicum, and green peas.', image_url: '/assets/starters/veg_maggie.png', is_in_stock: true },
  { id: 'st-10', name: 'Eggs Maggie', category: 'Starter', price: 120, portion_size: '1 Bowl', description: 'Hot spicy Maggi noodles cooked with scrambled egg and veggies.', image_url: '/assets/starters/eggs_maggie.png', is_in_stock: true },
  { id: 'st-11', name: 'Mirchi Pakoda (100gm)', category: 'Starter', price: 70, portion_size: '100gm', description: 'Crispy gram flour fritters made with mild green chilies.', image_url: '/assets/starters/mirchi_pakoda.png', is_in_stock: true },

  // Add-ons
  { id: 'ad-1', name: 'Plain Rice (Full)', category: 'Add-ons', price: 90, portion_size: 'Full Bowl', description: 'Steamed long-grain Basmati rice (Full).', image_url: '/assets/addons/plain_rice.jpg', is_in_stock: true },
  { id: 'ad-2', name: 'Plain Rice (Half)', category: 'Add-ons', price: 60, portion_size: 'Half Bowl', description: 'Steamed long-grain Basmati rice (Half).', image_url: '/assets/addons/plain_rice.jpg', is_in_stock: true },
  { id: 'ad-3', name: 'Chapati', category: 'Add-ons', price: 14, portion_size: '1 Pc', description: 'Soft wheat flour chapati made fresh to order.', image_url: '/assets/addons/chapati.jpg', is_in_stock: true },
  { id: 'ad-4', name: 'Bhajri Bhakri', category: 'Add-ons', price: 35, portion_size: '1 Pc', description: 'Traditional rural pearl millet flatbread baked on iron tawa.', image_url: '/assets/addons/bhajri_bhakri.jpg', is_in_stock: true },
  { id: 'ad-5', name: 'Jowri Bhakri', category: 'Add-ons', price: 35, portion_size: '1 Pc', description: 'Healthy sorghum flatbread cooked on open flame.', image_url: '/assets/addons/jowri_bhakri.jpg', is_in_stock: true },
  { id: 'ad-6', name: 'Nachni Bhakri', category: 'Add-ons', price: 35, portion_size: '1 Pc', description: 'Nutritious finger millet (ragi) bhakri rich in fiber and minerals.', image_url: '/assets/addons/nachni_bhakri.jpg', is_in_stock: true },
  { id: 'ad-7', name: 'Rice Bhakri', category: 'Add-ons', price: 30, portion_size: '1 Pc', description: 'Soft and thin rice flour flatbread, perfect with curries.', image_url: '/assets/addons/rice_bhakri.jpg', is_in_stock: true }
];

const CATEGORIES = ['All', 'Thali', 'Main Course', 'Starter', 'Add-ons'];

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addToCart = useCartStore(state => state.addToCart);
  const cart = useCartStore(state => state.cart);

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [moodResult, setMoodResult] = useState(null);
  const [isCrunching, setIsCrunching] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false }); // Latest first
      
      if (data && data.length > 0 && !error) {
        const uniqueItems = data.reduce((acc, current) => {
          const x = acc.find(item => item.name === current.name);
          if (!x) return acc.concat([current]);
          if (current.image_url.startsWith('/assets/') && !x.image_url.startsWith('/assets/')) {
            const index = acc.indexOf(x);
            acc[index] = current;
          }
          return acc;
        }, []);
        setMenuItems(uniqueItems.filter(item => item.category !== 'ARCHIVED'));
      } else {
        setMenuItems(FALLBACK_PRODUCTS);
      }
    } catch (err) {
      setMenuItems(FALLBACK_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  };


  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });


  const handleMoodSelect = (mood) => {
    setIsCrunching(true);
    setMoodResult(null);
    
    // Luxury simulation delay
    setTimeout(() => {
      let match = null;
      if (mood === 'spicy') {
        match = menuItems.find(item => item.name.toLowerCase().includes('chicken')) || menuItems[0];
      } else if (mood === 'mild') {
        match = menuItems.find(item => item.category === 'Thali' || item.name.toLowerCase().includes('egg')) || menuItems[1];
      } else if (mood === 'light') {
        match = menuItems.find(item => item.category === 'Starter' || item.category === 'Add-ons') || menuItems[2];
      } else {
        match = menuItems[Math.floor(Math.random() * menuItems.length)];
      }
      
      setMoodResult(match);
      setIsCrunching(false);
    }, 2000);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="bg-[#F8F9FB] min-h-screen pb-32">
      {/* Refined Header */}
      <div className="bg-white/80 backdrop-blur-xl px-6 pt-12 pb-6 sticky top-0 z-50 border-b border-white/20">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f4c430] rounded-full flex items-center justify-center saffron-glow overflow-hidden border-2 border-white">
               <img 
                src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.email || 'guest'}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
               />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-primary fill-primary" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Heritage Lane, Mumbai</p>
                <ChevronRight size={10} className="text-slate-300" />
              </div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase mt-0.5">
                {user?.user_metadata?.full_name?.split(' ')[0] || 'Delicious'} Biryani
              </h1>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/checkout')}
            className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg relative"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
        </header>

        {/* Industry-Leading Search Experience */}
        <div className="relative mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Search for biryani, starters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100/50 border border-slate-200/50 rounded-full py-3.5 pl-12 pr-12 text-sm font-medium text-slate-800 transition-all focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
             <Sparkles size={18} onClick={() => setIsMoodModalOpen(true)} className="cursor-pointer" />
          </div>
        </div>

        {/* Circular "Discovery" Categories */}
        <div className="flex gap-5 overflow-x-auto no-scrollbar py-2 -mx-2 px-2 items-center">
          {CATEGORIES.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex flex-col items-center gap-2 group shrink-0"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                activeCategory === cat 
                  ? 'bg-primary border-primary shadow-lg shadow-primary/30 scale-110' 
                  : 'bg-white border-slate-100 group-hover:border-primary/20 bg-slate-50'
              }`}>
                {cat === 'All' && <Flame size={20} className={activeCategory === cat ? 'text-white' : 'text-slate-400'} />}
                {cat === 'Thali' && <Coffee size={20} className={activeCategory === cat ? 'text-white' : 'text-slate-400'} />}
                {cat === 'Main Course' && <Zap size={20} className={activeCategory === cat ? 'text-white' : 'text-slate-400'} />}
                {cat === 'Starter' && <Smile size={20} className={activeCategory === cat ? 'text-white' : 'text-slate-400'} />}
                {cat === 'Add-ons' && <Plus size={20} className={activeCategory === cat ? 'text-white' : 'text-slate-400'} />}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                activeCategory === cat ? 'text-primary' : 'text-slate-400'
              }`}>
                {cat}
              </span>
            </button>
          ))}
        </div>
      </div>


      <div className="px-6 py-8">
        {/* Special Banner */}
        {activeCategory === 'All' && !searchQuery && (
          <div className="bg-slate-900 rounded-[32px] p-6 mb-10 relative overflow-hidden text-white shadow-2xl shadow-slate-300">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
             <div className="relative z-10">
               <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20">Chef's Choice</span>
               <h3 className="text-2xl font-black mt-3 mb-2 tracking-tighter uppercase italic">Legendary Dum Biryani</h3>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Original Recipes Since 1994 ✨</p>
               <button className="bg-white text-slate-900 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  Explore Menu <ChevronRight size={14} />
               </button>
             </div>
          </div>
        )}

        <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight flex items-center justify-between">
          <span>{searchQuery ? `Searching for "${searchQuery}"` : activeCategory === 'All' ? 'Sensational Picks' : `${activeCategory} Creations`}</span>
          {isLoading && <Loader2 className="animate-spin text-primary" size={20} />}
        </h2>

        <div className="grid grid-cols-1 gap-8">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              // 🏗️ SKELETON LOADING STATE
              Array.from({ length: 4 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="flex bg-white rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 animate-pulse">
                  <div className="w-28 h-28 bg-slate-100 rounded-2xl shrink-0" />
                  <div className="ml-4 flex-1 flex flex-col justify-between py-1">
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-50 rounded-lg w-1/2" />
                      <div className="h-2 bg-slate-50 rounded-lg w-1/4" />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-6 bg-slate-100 rounded-lg w-16" />
                      <div className="h-10 bg-slate-100 rounded-xl w-24" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              filteredItems.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => navigate(`/details/${item.id}`)}
                  className={`flex bg-white rounded-[24px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 transition-all active:scale-[0.98] cursor-pointer relative ${!item.is_in_stock ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden shrink-0">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    {!item.is_in_stock && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-[8px] text-white font-black uppercase tracking-widest text-center px-1">
                         Wait for Next Batch
                      </div>
                    )}
                    {item.is_special && (
                      <div className="absolute top-0 left-0 bg-primary text-slate-900 px-2 py-0.5 rounded-br-lg text-[8px] font-black uppercase tracking-widest">
                        Bestseller
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{item.name}</h3>
                      <div className="flex items-center gap-1 mb-1">
                        <Clock size={10} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">20-Min Fresh Delivery</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-60">
                        <Star className="text-yellow-400 fill-yellow-400" size={10} />
                        <span className="text-[9px] font-bold text-slate-600">4.8 (50+)</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-lg font-black text-slate-900 leading-none">₹{item.price}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(item.is_in_stock) addToCart({ ...item, title: item.name, image: item.image_url }); }}
                        disabled={!item.is_in_stock}
                        className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all saffron-glow active:scale-95"
                      >
                        ADD
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          
          {filteredItems.length === 0 && !isLoading && (
            <div className="text-center py-20 opacity-30">
               <Filter className="mx-auto mb-4" size={48} />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No Biryani found</p>
            </div>
          )}
        </div>
      </div>
      {/* MOOD MODAL */}
      <AnimatePresence>
        {isMoodModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
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
              className="relative w-full max-w-sm bg-white rounded-[40px] p-8 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
              
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
                  <Sparkles size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2 italic">Mood Magic</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">What are you craving today?</p>

                {!moodResult && !isCrunching ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'spicy', label: 'Spicy & Bold', sub: 'Chicken Fire', icon: <Flame size={18} /> },
                      { id: 'mild', label: 'Rich & Creamy', sub: 'Soul Food', icon: <Smile size={18} /> },
                      { id: 'light', label: 'Healthy & Light', sub: 'Fast Fuel', icon: <Zap size={18} /> },
                      { id: 'surprise', label: 'Chef Choice', sub: 'Mystery Feast', icon: <Sparkles size={18} /> }
                    ].map(mood => (
                      <button 
                        key={mood.id}
                        onClick={() => handleMoodSelect(mood.id)}
                        className="bg-slate-50 border border-slate-100 p-4 rounded-3xl text-left hover:border-primary/30 transition-all group"
                      >
                        <div className="text-primary mb-2 group-hover:scale-110 transition-transform">{mood.icon}</div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{mood.label}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{mood.sub}</p>
                      </button>
                    ))}
                  </div>
                ) : isCrunching ? (
                  <div className="py-12 space-y-4">
                    <Loader2 size={40} className="animate-spin text-primary mx-auto" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse italic">Scanning flavors...</p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="relative h-48 rounded-[32px] overflow-hidden shadow-xl shadow-slate-200">
                      <img src={moodResult.image_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-left">
                        <p className="text-white text-xs font-black uppercase tracking-tighter">{moodResult.name}</p>
                        <p className="text-white/80 text-[8px] font-bold uppercase tracking-widest leading-none">Perfect Match Found</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => { setIsMoodModalOpen(false); navigate(`/details/${moodResult.id}`); }}
                      className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-300"
                    >
                      Taste The Magic 🪄
                    </button>
                    
                    <button 
                      onClick={() => setMoodResult(null)}
                      className="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                    >
                      Try Another Choice
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
