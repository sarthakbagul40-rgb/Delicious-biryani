import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Filter, Loader2, Plus, Search as SearchIcon, ShoppingCart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/useCartStore';
import { FALLBACK_PRODUCTS } from './Home';

const CATEGORIES = ['All', 'Thali', 'Main Course', 'Starter', 'Add-ons'];

const Search = () => {
  const navigate = useNavigate();
  const addToCart = useCartStore((state) => state.addToCart);
  const cart = useCartStore((state) => state.cart);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          const cleanItems = data.filter((item) => {
            if (item.category === 'ARCHIVED') return false;
            return true;
          });
          setItems(cleanItems);
        } else {
          setItems(FALLBACK_PRODUCTS);
        }
      } catch (err) {
        setItems(FALLBACK_PRODUCTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);


  const results = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const haystack = [
        item.name,
        item.category,
        item.description,
        item.portion_size,
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesCategory && (!cleanQuery || haystack.includes(cleanQuery));
    });
  }, [activeCategory, items, query]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-[#F8F9FB] min-h-screen pb-32">
      <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-50 px-6 pt-12 pb-6 border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-700"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Find Your Feast</h1>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.25em] mt-1">Menu Search</p>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white relative"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search biryani, thali, starter..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 pl-12 pr-5 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pt-5">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 h-10 px-5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                activeCategory === category
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                  : 'bg-white text-slate-400 border-slate-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {query ? `${results.length} matches` : `${activeCategory} items`}
          </h2>
          {isLoading && <Loader2 className="animate-spin text-primary" size={20} />}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {!isLoading && results.map((item) => (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                onClick={() => navigate(`/details/${item.id}`)}
                className={`bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-all ${
                  !item.is_in_stock ? 'opacity-60 grayscale' : ''
                }`}
              >
                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-700">
                    {item.category}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase leading-tight">{item.name}</h3>
                      <div className="flex items-center gap-3 mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-1"><Star size={11} className="text-yellow-400 fill-yellow-400" /> 4.8</span>
                        <span className="flex items-center gap-1"><Clock size={11} className="text-emerald-500" /> 20 min</span>
                      </div>
                    </div>
                    <p className="text-lg font-black text-slate-900">Rs {item.price}</p>
                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      if (item.is_in_stock) addToCart({ ...item, title: item.name, image: item.image_url });
                    }}
                    disabled={!item.is_in_stock}
                    className="mt-5 w-full h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={14} strokeWidth={3} />
                    {item.is_in_stock ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {!isLoading && results.length === 0 && (
          <div className="py-24 text-center text-slate-300">
            <Filter className="mx-auto mb-5" size={52} />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">No matching dishes</h3>
            <p className="text-xs font-bold mt-2">Try another name or category.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
