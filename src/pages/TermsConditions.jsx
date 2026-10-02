import { FileText, ShieldAlert, Clock, MapPin, CreditCard, RefreshCw, ChefHat, ChevronLeft, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const TermsConditions = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Kitchen Service Standards & Dum Cooking',
      icon: ChefHat,
      content: 'Delicious Biryani operates a direct cloud and dum kitchen catering freshly cooked biryanis, thalis, and curries. Because authentic dum cooking requires sealed clay handis and natural slow-steaming with whole spices, preparation times typically range between 20 to 35 minutes depending on batch cycles. We prioritize culinary authenticity and hygiene above rushed assembly.'
    },
    {
      title: '2. Delivery Feasibility & Geofenced Service Zones',
      icon: MapPin,
      content: 'To preserve piping-hot temperature and food safety, our delivery operations are strictly bounded by sub-meter geofenced delivery polygons covering Palava City Phase 2, Casa Bella, Lakeshore, Downtown, and Lodha Crown Taloja bypass. Orders placed outside verified serviceable coordinates will not be processed, and customers will be notified immediately.'
    },
    {
      title: '3. Pricing, UPI Payments & Order Confirmation',
      icon: CreditCard,
      content: 'All prices listed on the platform are in Indian Rupees (₹) and include applicable kitchen preparation and packaging costs. Payments are processed securely via direct peer-to-merchant UPI (Google Pay, PhonePe, Paytm, BHIM) and recorded in our kitchen orders ledger. An order is confirmed once payment verification or WhatsApp coordination is completed.'
    },
    {
      title: '4. Cancellation, Replacement & Refund Policy',
      icon: RefreshCw,
      content: 'Due to the fresh, perishable nature of culinary dum handi preparations:\n• Cancellations: Orders can only be cancelled within 5 minutes of placement before handi seal cracking.\n• Quality Concerns: If an order arrives damaged, incorrect, or does not meet our culinary standards, customers must report within 30 minutes of receipt with a photo on our direct kitchen WhatsApp (+91 9769793452) for an immediate replacement or full UPI refund.'
    },
    {
      title: '5. Culinary Imagery & Visual Representation Notice',
      icon: AlertCircle,
      content: 'Photographs and graphics displayed across our menu represent culinary artistic and serving suggestions. Because our dishes are hand-crafted daily using authentic spices, fresh cuts, and traditional handis, natural variations in garnish, oil sheen, and color may occur. All food descriptions accurately detail the ingredients and portion sizes provided.'
    },
    {
      title: '6. User Responsibilities & Account Security',
      icon: ShieldCheck,
      content: 'Users are responsible for maintaining the confidentiality of their credentials and two-factor verification codes. You agree to provide accurate delivery gate addresses and contact telephone numbers to allow delivery riders timely building access at complex security gates.'
    }
  ];

  return (
    <div className="min-h-screen pb-24 font-sans max-w-4xl mx-auto px-4 sm:px-6 pt-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 border border-slate-200/80 rounded-2xl flex items-center justify-center text-slate-800 hover:border-primary transition-colors bg-white shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Kitchen Service Standards
        </span>
      </div>

      {/* Hero Banner */}
      <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/70 shadow-sm relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[10px] font-black uppercase tracking-wider mb-4">
          <FileText size={12} />
          <span>Kitchen Service Terms</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight">
          Terms & Conditions
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2 max-w-2xl leading-relaxed">
          Welcome to Delicious Biryani. By browsing, creating an account, or placing food orders on our website, you agree to abide by these Terms and Kitchen Service Standards.
        </p>
      </div>

      {/* Main Sections */}
      <div className="space-y-5 mb-12">
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          return (
            <motion.div
              key={sec.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-white rounded-[28px] p-6 sm:p-8 border border-slate-200/70 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Icon size={18} />
                </div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                  {sec.title}
                </h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-13 whitespace-pre-line">
                {sec.content}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Jurisdiction & Governing Law */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/70 shadow-sm space-y-3 mb-8">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
          7. Governing Law & Dispute Resolution
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          These Terms and any dispute arising from the purchase or delivery of food products shall be governed by and construed in accordance with the laws of the Republic of India. The courts of Thane / Mumbai, Maharashtra shall have exclusive jurisdiction over all matters.
        </p>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-slate-400 pt-4 border-t border-slate-200/80">
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link to="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link>
          <span>•</span>
          <Link to="/" className="hover:text-primary transition-colors">Back to Menu</Link>
        </div>
        <p>© {new Date().getFullYear()} Delicious Biryani Kitchen. All rights reserved.</p>
      </div>
    </div>
  );
};

export default TermsConditions;
