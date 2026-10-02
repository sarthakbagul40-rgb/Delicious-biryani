import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Clock, Flame, ShoppingCart, Plus, Minus, Loader2, ShieldCheck, Check, UtensilsCrossed } from 'lucide-react';
import { motion } from 'framer-motion';
import useCartStore from '../store/useCartStore';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { getInitialProducts } from '../lib/networkUtils';
import { db, doc, getDoc } from '../lib/firebase';

const Details = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToCart = useCartStore((state) => state.addToCart);
  const openCart = useCartStore((state) => state.openCart);
  
  // Instant initial lookup from fallback/cache for 0ms initial render on slow 3G
  const initialItem = () => {
    const list = getInitialProducts();
    return list.find(item => item.id === id || String(item.id) === String(id) || item.name?.toLowerCase().includes(String(id).toLowerCase())) || null;
  };

  const [product, setProduct] = useState(initialItem);
  const [loading, setLoading] = useState(!initialItem());
  const [selectedSize, setSelectedSize] = useState(() => {
    const item = initialItem();
    return item?.portion_size === '450gm' || item?.portion_size === '750gm' ? '750gm' : (item?.portion_size || 'Full');
  });
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    // 1. Try local list first
    const local = FALLBACK_PRODUCTS.find(item => item.id === id || String(item.id) === String(id) || item.name?.toLowerCase().includes(String(id).toLowerCase()));
    if (local) {
      setProduct(local);
      const hasSize = local.portion_size === '450gm' || local.portion_size === '750gm';
      setSelectedSize(hasSize ? '750gm' : (local.portion_size || 'Full'));
      setLoading(false);
      return;
    }

    if (!product) setLoading(true);

    try {
      // 2. Try Firestore
      const docSnap = await getDoc(doc(db, 'products', id));
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setProduct(data);
        const hasSize = data.portion_size === '450gm' || data.portion_size === '750gm';
        setSelectedSize(hasSize ? '750gm' : (data.portion_size || 'Full'));
      }
    } catch (err) {
      console.warn('Product fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const priceAdjustment = selectedSize === '450gm' ? -100 : 0;
  const currentPrice = Number(product?.price || 0) + priceAdjustment;

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(
      { ...product, title: product.name, image: product.image_url, price: currentPrice },
      selectedSize,
      quantity
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
    openCart();
  };

  if (loading && !product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white px-6">
        <Loader2 className="animate-spin text-primary mb-4" size={44} />
        <p className="font-black text-slate-800 uppercase tracking-widest text-xs">Preparing the details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white px-10 text-center font-sans">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mb-6 shadow-sm border border-amber-100">
          <UtensilsCrossed size={36} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Dish Not Found</h2>
        <p className="text-xs text-slate-500 font-medium max-w-xs mb-8">
          The delicacy you are looking for might have been retired or moved. Explore our fresh daily menu instead!
        </p>
        <button 
          onClick={() => navigate('/')} 
          className="bg-primary text-slate-950 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 shadow-lg shadow-primary/20 saffron-glow hover:scale-105 transition-transform"
        >
          Explore Fresh Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:py-8 px-0 md:px-6">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
        {/* Breadcrumb / Back button on desktop */}
        <div className="hidden md:flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:border-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Menu / {product.category} / <span className="text-slate-900">{product.name}</span>
          </span>
        </div>

        {/* Responsive Grid: Single column on mobile, Two balanced columns on tablet/desktop/4k */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-10 items-start">
          
          {/* Left Column: Image Section */}
          <div className="lg:col-span-6 relative">
            <div className="relative h-[380px] sm:h-[460px] lg:h-[520px] rounded-b-[36px] sm:rounded-b-[48px] lg:rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/50 bg-slate-100">
              <img 
                src={product.image_url} 
                alt={product.name} 
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/assets/main_course/chicken_curry.png';
                }}
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950/70 to-transparent lg:hidden" />
              
              {/* Mobile Back Button */}
              <button 
                onClick={() => navigate(-1)}
                className="md:hidden absolute top-12 left-6 w-11 h-11 bg-white/30 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center text-white active:scale-95 shadow-lg"
              >
                <ChevronLeft size={22} />
              </button>

              <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-slate-900 shadow-md">
                {product.category}
              </div>
            </div>

            {/* Chef Guarantee Badge (Desktop position) */}
            <div className="hidden lg:flex mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[28px] p-5 items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-200">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="text-emerald-950 font-black uppercase tracking-tight text-xs">Authentic Recipe Guarantee</h4>
                <p className="text-emerald-700/80 text-xs font-medium leading-relaxed mt-0.5">
                  Freshly cooked with premium whole spices, cold-pressed oils, and farm-fresh ingredients.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Order Details */}
          <div className="lg:col-span-6 px-6 -mt-12 lg:mt-0 relative z-10">
            <div className="bg-white rounded-[36px] lg:rounded-[40px] p-6 sm:p-8 lg:p-10 shadow-xl lg:shadow-md border border-slate-100">
              
              {/* Header Info */}
              <div className="flex justify-between items-start mb-6 gap-4">
                <div className="flex-1">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20 mb-3 inline-block">
                    {product.category} Special
                  </span>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-tight tracking-tight uppercase">
                    {product.name}
                  </h1>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-slate-900 font-black text-sm">
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span>4.8</span>
                      <span className="text-slate-400 font-bold text-xs ml-1">(50+ orders)</span>
                    </div>
                    <span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">• Authentic</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-primary text-3xl sm:text-4xl font-black tracking-tighter leading-none mb-1">₹{currentPrice}</p>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Per Pack</p>
                </div>
              </div>

              {/* Quick Specs Badges */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                   <Clock size={18} className="text-emerald-500 mb-1.5" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">20-30 Min</span>
                </div>
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                   <Flame size={18} className="text-orange-500 mb-1.5" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedSize}</span>
                </div>
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                   <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-1.5">
                     <Check size={10} strokeWidth={4} />
                   </div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fresh Batch</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-500 text-sm leading-relaxed font-medium mb-8 pb-6 border-b border-slate-100 italic">
                "{product.description}"
              </p>

              {/* Size Selection (if applicable) */}
              {(product.portion_size === '450gm' || product.portion_size === '750gm') && (
                <div className="mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">
                    Select Portion Pack
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {['450gm', '750gm'].map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`py-3.5 px-4 rounded-2xl border-2 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-between ${
                          selectedSize === size 
                            ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                            : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <span>{size} Pack</span>
                        <span className="text-[10px]">{size === '450gm' ? '₹140' : '₹230'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity and Add to Cart Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center pt-2">
                <div className="flex items-center justify-between sm:justify-start gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-2 shrink-0">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-700 hover:text-primary transition-colors active:scale-95"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="font-black text-lg w-8 text-center text-slate-900 tracking-tight">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-700 hover:text-primary transition-colors active:scale-95"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddToCart}
                  disabled={!product.is_in_stock}
                  className={`flex-1 p-4 sm:p-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50 active:scale-95 ${
                    isAdded 
                      ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
                      : 'bg-slate-900 text-white shadow-slate-900/10 hover:bg-slate-800'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check size={18} strokeWidth={3} className="text-emerald-300" />
                      <span>Added to Cart!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={18} />
                      <span>{product.is_in_stock ? `Add to Cart • ₹${currentPrice * quantity}` : 'Out of Stock'}</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Mobile Chef Guarantee */}
              <div className="lg:hidden mt-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                <ShieldCheck size={24} className="text-emerald-600 shrink-0" />
                <p className="text-emerald-900 text-xs font-bold leading-relaxed">
                  Authentic Dum recipe guarantee. Prepared fresh per order.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Details;
