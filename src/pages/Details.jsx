import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Clock, Flame, ShoppingCart, Plus, Minus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import useCartStore from '../store/useCartStore';
import { FALLBACK_PRODUCTS } from './Home';

const Details = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToCart = useCartStore((state) => state.addToCart);
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('750gm');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (data && !error) {
        setProduct(data);
        const isSizeProduct = data.portion_size === '450gm' || data.portion_size === '750gm';
        setSelectedSize(isSizeProduct ? '750gm' : (data.portion_size || '750gm'));
      } else {
        const localMatch = FALLBACK_PRODUCTS.find(p => p.id === id || p.name.toLowerCase().includes(id.toLowerCase()));
        if (localMatch) {
          setProduct(localMatch);
          const isSizeProduct = localMatch.portion_size === '450gm' || localMatch.portion_size === '750gm';
          setSelectedSize(isSizeProduct ? '750gm' : (localMatch.portion_size || '750gm'));
        }
      }
    } catch (err) {
      const localMatch = FALLBACK_PRODUCTS.find(p => p.id === id || p.name.toLowerCase().includes(id.toLowerCase()));
      if (localMatch) setProduct(localMatch);
    } finally {
      setLoading(false);
    }
  };


  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-primary mb-4" size={48} />
      <p className="font-black text-slate-800 uppercase tracking-widest text-xs">Preparing the details...</p>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-10 text-center">
      <Star className="text-slate-200 mb-6" size={64} />
      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Biryani Not Found</h2>
      <button onClick={() => navigate('/')} className="bg-primary text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs">Back to Home</button>
    </div>
  );

  const priceAdjustment = selectedSize === '450gm' ? -100 : 0;
  const currentPrice = Number(product.price) + priceAdjustment;

  const handleAddToCart = () => {
    addToCart({ ...product, title: product.name, image: product.image_url }, selectedSize);
    navigate('/checkout'); // Quick checkout flow
  };

  return (
    <div className="bg-[#F8F9FB] min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[450px]">
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#F8F9FB] to-transparent" />
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-12 left-6 w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 -mt-16 relative z-10 pb-12">
        <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-slate-200/50 mb-8 border border-white">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 pr-4">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20 mb-3 inline-block leading-none">
                {product.category} Special
              </span>
              <h1 className="text-3xl font-black text-slate-900 leading-none tracking-tight mb-2 uppercase">{product.name}</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-primary font-black">
                  <Star size={16} className="fill-primary" />
                  <span className="text-sm">4.8</span>
                </div>
                <span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">Masterfully Crafted</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-primary text-4xl font-black tracking-tighter leading-none mb-1">₹{currentPrice}</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Per Pack</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 flex flex-col items-center">
               <Clock size={20} className="text-primary mb-2" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">35 Min</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 flex flex-col items-center">
               <Flame size={20} className="text-orange-500 mb-2" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.portion_size}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 flex flex-col items-center text-center">
               <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                 <Plus size={12} strokeWidth={4} />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Quality Check</span>
            </div>
          </div>

          <p className="text-slate-500 text-sm leading-relaxed font-medium mb-10 pb-10 border-b border-slate-50 italic">
            "{product.description}"
          </p>

          {/* Size Selection */}
          {product && (product.portion_size === '450gm' || product.portion_size === '750gm') && (
            <div className="mb-10">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">
                Select Quantity
              </h3>
              <div className="flex gap-4">
                {['750gm'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`flex-1 py-4 px-4 rounded-[20px] border-2 transition-all font-black text-xs uppercase tracking-widest ${
                      selectedSize === size 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-slate-50 bg-slate-50 text-slate-300'
                    }`}
                  >
                    {size} Pack
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cart Controls */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-50 rounded-[22px] p-2">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-[18px] bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-primary transition-colors"
              >
                <Minus size={20} />
              </button>
              <span className="font-black text-xl w-6 text-center text-slate-900 tracking-tighter">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-[18px] bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-primary transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              disabled={!product.is_in_stock}
              className="flex-1 bg-slate-900 text-white p-5 rounded-[22px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              <ShoppingCart size={20} />
              {product.is_in_stock ? 'Add to Delivery Bag' : 'Out of Stock'}
            </motion.button>
          </div>
        </div>

        {/* Master Chef Guarantee */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] p-6 flex items-center gap-6">
           <div className="w-14 h-14 bg-emerald-500 rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-emerald-200">
             <Star size={28} />
           </div>
           <div>
             <h4 className="text-emerald-900 font-black uppercase tracking-tight text-sm">Master Chef Guarantee</h4>
             <p className="text-emerald-700/70 text-xs font-bold leading-relaxed uppercase tracking-widest">Handmade with premium spices and aged Basmati rice.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Details;
