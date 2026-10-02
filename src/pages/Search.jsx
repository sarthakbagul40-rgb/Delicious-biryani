import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Search as SearchIcon, Loader2, Star, Clock, Plus, Minus, Check, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useCartStore from '../store/useCartStore';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { getInitialProducts, cacheProducts } from '../lib/networkUtils';
import { db, collection, getDocs } from '../lib/firebase';

const CATEGORIES = ['All', 'Thali', 'Main Course', 'Starter', 'Add-ons'];


const Search = () => {
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity } = useCartStore();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  // Instant render from local cache for 0ms start on slow 3G/4G
  const [products, setProducts] = useState(getInitialProducts);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const clean = list.filter((item) => item.category !== 'ARCHIVED');
          setProducts(clean);
          cacheProducts(clean);
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }
      } catch (err) {
        if (!products || products.length === 0) {
          setProducts(FALLBACK_PRODUCTS);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const results = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return products.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const haystack = [item.name, item.category, item.description, item.portion_size]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesCategory && (!cleanQuery || haystack.includes(cleanQuery));
    });
  }, [activeCategory, products, query]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen pb-32">
      {/* Header Container */}
      <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 pt-10 sm:pt-6 pb-6 border-b border-slate-100 transition-all">
        <div className="max-w-7xl 2xl:max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="text-center">
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Find Your Feast</h1>
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em] mt-1">Menu Search</p>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white relative active:scale-95 transition-transform"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-slate-950 min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative max-w-3xl mx-auto">
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search biryani, thali, starter, roti..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 pl-12 pr-5 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 pt-5 justify-center items-center max-w-2xl mx-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`h-9 sm:h-10 px-3.5 sm:px-5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest border transition-all ${
                  activeCategory === cat
                    ? 'bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'bg-white text-slate-500 border-slate-200/80 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Results Container */}
      <main className="px-4 sm:px-8 py-8 max-w-7xl 2xl:max-w-[1920px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {query ? `${results.length} dishes matched` : `${activeCategory} menu items`}
          </h2>
          {isLoading && <Loader2 className="animate-spin text-primary" size={20} />}
        </div>

        {/* Responsive Grid: 1 col on mobile, 2 col on tablet, 3 col on laptop, 4 col on desktop/4K */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {results.map((item) => (
              <motion.article
                layout
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => navigate(`/details/${item.id}`)}
                className={`bg-white rounded-[28px] border border-slate-200/70 shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:shadow-xl hover:border-primary/30 flex flex-col justify-between ${
                  item.is_in_stock ? '' : 'opacity-60 grayscale'
                }`}
              >
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/assets/main_course/chicken_curry.png';
                    }}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-700">
                    {item.category}
                  </div>
                  {item.portion_size && (
                    <div className="absolute bottom-3 left-4 bg-slate-900/80 backdrop-blur text-white px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                      {item.portion_size}
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase leading-snug line-clamp-1">{item.name}</h3>
                        <div className="flex items-center gap-3 mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                          <span className="flex items-center gap-1 text-slate-700">
                            <Star size={11} className="text-yellow-400 fill-yellow-400" /> 4.8
                          </span>
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Clock size={11} /> 20 min
                          </span>
                        </div>
                      </div>
                      <p className="text-lg font-black text-slate-900 whitespace-nowrap">₹{item.price}</p>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                    {(() => {
                      const cartItem = cart.find((c) => c.id === item.id);
                      if (cartItem && cartItem.quantity > 0) {
                        return (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="mt-5 w-full h-11 bg-primary text-slate-950 font-black rounded-2xl p-1.5 shadow-md shadow-primary/25 border border-primary flex items-center justify-between animate-in fade-in zoom-in-95 duration-200"
                          >
                            <motion.button 
                              whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.id, cartItem.size, cartItem.quantity - 1)}
                              className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center transition-colors shadow-sm"
                              title="Decrease quantity"
                            >
                              <Minus size={14} strokeWidth={3} />
                            </motion.button>
                            <motion.span 
                              key={cartItem.quantity}
                              initial={{ scale: 1.35, color: '#16a34a' }}
                              animate={{ scale: 1, color: '#020617' }}
                              transition={{ duration: 0.2 }}
                              className="text-xs font-black"
                            >
                              {cartItem.quantity} in Cart
                            </motion.span>
                            <motion.button 
                              whileTap={{ scale: 0.85 }}
                              onClick={() => updateQuantity(item.id, cartItem.size, cartItem.quantity + 1)}
                              className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center transition-colors shadow-sm"
                              title="Increase quantity"
                            >
                              <Plus size={14} strokeWidth={3} />
                            </motion.button>
                          </div>
                        );
                      }
                      return (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.is_in_stock) {
                              addToCart({ ...item, title: item.name, image: item.image_url });
                            }
                          }}
                          disabled={!item.is_in_stock}
                          className="mt-5 w-full h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary hover:text-slate-950 transition-all shadow-sm"
                        >
                          <Plus size={14} strokeWidth={3} />
                          {item.is_in_stock ? 'Add to Cart' : 'Out of Stock'}
                        </motion.button>
                      );
                    })()}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {results.length === 0 && (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-100 p-8 my-6">
            <UtensilsCrossed className="mx-auto mb-4 text-slate-300" size={52} />
            <h3 className="text-base font-black uppercase tracking-widest text-slate-700 mb-1">No matching dishes</h3>
            <p className="text-xs font-bold text-slate-400">Try another keyword or tap a category pill above.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
