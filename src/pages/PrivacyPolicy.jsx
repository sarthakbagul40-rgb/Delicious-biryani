import { Shield, Lock, MapPin, Phone, Mail, User, Clock, FileText, CheckCircle2, ChevronLeft, ArrowRight, Download, Trash2, Database, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const dataCollectionItems = [
    {
      category: 'Identity & Contact',
      icon: User,
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      fields: ['Full Name', 'Mobile Phone Number', 'Email Address'],
      purpose: 'Account creation, customer authentication, kitchen order ticketing, and live delivery updates.',
      whyNeeded: 'Our delivery team needs your phone number to coordinate gate passes at Lodha Palava & Crown Taloja societies. Your email is used for billing receipts and 2-factor OTP verification.'
    },
    {
      category: 'Delivery & Geolocation',
      icon: MapPin,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      fields: ['Street Address / Society Name', 'Tower & Flat Number', 'GPS Coordinates (Lat / Lng)'],
      purpose: 'Verifying serviceability within our hot-delivery polygon zone and direct kitchen delivery dispatch.',
      whyNeeded: 'Dum biryani is delivered piping hot from our local kitchen. GPS coordinates are strictly used to compute if your building falls within our sub-meter delivery boundary before dispatch.'
    },
    {
      category: 'Order & Transaction History',
      icon: Clock,
      color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      fields: ['Ordered Dishes & Quantity', 'Special Culinary Instructions', 'Order Timestamps & Status', 'UPI Transaction IDs'],
      purpose: 'Kitchen preparation coordination, customer support, repeat order re-ordering, and billing compliance.',
      whyNeeded: 'Ensures the kitchen team prepares the exact dish variations and tracks preparation times. Note: We never collect or store banking passwords, UPI PINs, or debit/credit card CVVs.'
    },
    {
      category: 'Security & Device Session',
      icon: Lock,
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      fields: ['IP Address (Masked)', 'Auth Session Tokens', '6-Digit Temporary OTPs', 'Rate Limiting Request Logs'],
      purpose: 'Account protection, preventing brute-force password cracking, and stopping automated spam requests.',
      whyNeeded: 'Protects customer accounts against unauthorized logins and secures our SMS/email gateways from bot exploitation. OTPs expire automatically within 10 minutes.'
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
          Legal Compliance • DPDPA 2023
        </span>
      </div>

      {/* Hero Banner */}
      <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/70 shadow-sm relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider mb-4">
          <Shield size={12} />
          <span>Transparent Data Governance</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight">
          Privacy Policy
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2 max-w-2xl leading-relaxed">
          Effective Date: September 2026. Delicious Biryani ("we", "our", or "us") is dedicated to safeguarding your personal data in strict compliance with the Indian Digital Personal Data Protection Act (DPDPA 2023) and global data privacy standards.
        </p>
      </div>

      {/* Section 1: Itemized Data Collection & Reasons */}
      <div className="space-y-6 mb-12">
        <div className="border-b border-slate-200/80 pb-3">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <span>1. What Data We Collect & Exactly Why</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            We adhere to strict data minimization: we only collect information indispensable to preparing, delivering, and securing your food orders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {dataCollectionItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-white rounded-[28px] p-6 border border-slate-200/70 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${item.color}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        {item.category}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Collected on Registration & Checkout
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Data Points:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.fields.map(f => (
                        <span key={f} className="text-[11px] font-bold bg-slate-100/80 text-slate-700 px-2.5 py-1 rounded-xl">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    <p><strong>Primary Purpose:</strong> {item.purpose}</p>
                    <p className="text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[11px]">
                      <strong>Why Needed:</strong> {item.whyNeeded}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Data Storage & Security */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/70 shadow-sm space-y-4 mb-8">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Database size={18} className="text-primary" />
          <span>2. Storage Infrastructure & Encryption</span>
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your personal data is encrypted in transit using Transport Layer Security (TLS 1.3) and stored in secure Google Cloud Firebase databases utilizing AES-256 bit encryption at rest. Server access is strictly restricted to authenticated kitchen software routines with zero unauthorized third-party access.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-base font-black text-slate-900 block">TLS 1.3</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encrypted In Transit</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-base font-black text-slate-900 block">AES-256</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Encrypted At Rest</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-base font-black text-slate-900 block">0 Ads</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Never Sold or Rented</span>
          </div>
        </div>
      </div>

      {/* Section 3: Third-Party Processors */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/70 shadow-sm space-y-4 mb-8">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
          3. Third-Party Service Providers
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          We do not sell, license, or monetize your personal information. We partner only with trusted infrastructure providers required to operate our food delivery service:
        </p>
        <ul className="text-xs text-slate-600 space-y-2.5 pl-4 list-disc">
          <li><strong>Google Firebase:</strong> User authentication, database management, and cloud storage infrastructure.</li>
          <li><strong>OpenStreetMap / Nominatim:</strong> Geocoding and sub-meter address delivery zone verification.</li>
          <li><strong>Resend / Gmail SMTP:</strong> Secure delivery of transactional order receipts and account verification codes.</li>
          <li><strong>UPI / Payment Gateway:</strong> Direct peer-to-merchant UPI payment verification (handled directly within your bank / UPI application).</li>
        </ul>
      </div>

      {/* Section 4: Your Rights Under DPDPA 2023 */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/70 shadow-sm space-y-4 mb-8">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <span>4. Your Rights Over Your Data</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-black text-slate-900 uppercase mb-1">Right to Access & Portability</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              You can view and export all your personal data, saved addresses, and previous order receipts anytime from your <Link to="/profile" className="text-primary font-bold hover:underline">Profile Page</Link>.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-black text-slate-900 uppercase mb-1">Right to Correction & Editing</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              You have full autonomy to edit your name, phone number, and delivery addresses directly from your profile with instant real-time sync.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-black text-slate-900 uppercase mb-1">Right to Erasure (Be Forgotten)</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              You may request complete account deletion and data wiping by using the Delete Data button in your Profile or contacting kitchen privacy support.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-black text-slate-900 uppercase mb-1">Right to Grievance Redressal</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Inquiries regarding data practices can be directed to our designated Data Protection Officer via email at <span className="font-bold text-slate-800">delicioussbiryanii@gmail.com</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-slate-400 pt-4 border-t border-slate-200/80">
        <div className="flex gap-4">
          <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
          <span>•</span>
          <Link to="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link>
          <span>•</span>
          <Link to="/profile" className="hover:text-primary transition-colors">Manage Data in Profile</Link>
        </div>
        <p>© {new Date().getFullYear()} Delicious Biryani Kitchen. All rights reserved.</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
