import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, LogOut, ChevronLeft, MapPin, Phone, Mail, Clock, Edit2, 
  Check, X, ShieldCheck, AlertCircle, Lock, Plus, Trash2, 
  Download, FileText, Cookie, Shield, ExternalLink, RefreshCw, ChefHat, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import useCartStore from '../store/useCartStore';
import useAddressStore from '../store/useAddressStore';
import PasswordResetModal from '../components/PasswordResetModal';
import { isAdminUser } from '../lib/adminConfig';
import { db, collection, query, where, getDocs } from '../lib/firebase';

const AddAddressModal = lazy(() => import('../components/AddAddressModal'));

const Profile = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut, updateUserProfile } = useAuthStore();
  const showToast = useCartStore((state) => state.showToast);
  const { addresses, fetchAddresses, deleteAddress } = useAddressStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: userProfile?.fullName || user?.displayName || '',
    phone: userProfile?.phone || user?.phoneNumber || '',
    address: userProfile?.address || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const userId = user?.uid || user?.id;

  // Sync addresses when user is loaded
  useEffect(() => {
    if (userId) {
      fetchAddresses(userId);
    }
  }, [userId, fetchAddresses]);

  // Keep form in sync with userProfile
  useEffect(() => {
    if (!isEditing) {
      setFormData({
        fullName: userProfile?.fullName || user?.displayName || '',
        phone: userProfile?.phone || user?.phoneNumber || '',
        address: userProfile?.address || ''
      });
    }
  }, [userProfile, user, isEditing]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanPhone = (formData.phone || '').replace(/\D/g, '');
    if (formData.phone && cleanPhone.length !== 10) {
      showToast({ type: 'error', title: 'Invalid Phone', message: 'Phone number must be exactly 10 digits.' });
      return;
    }
    if (!formData.fullName.trim()) {
      showToast({ type: 'error', title: 'Missing Name', message: 'Full name cannot be blank.' });
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        fullName: formData.fullName.trim(),
        phone: cleanPhone,
        address: formData.address.trim()
      });
      setIsEditing(false);
      showToast({ type: 'success', title: 'Profile Updated', message: 'Your personal details have been saved.' });
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast({ type: 'error', title: 'Update Failed', message: 'Could not update profile. Check connection.' });
    } finally {
      setIsSaving(false);
    }
  };

  // DPDPA 2023 Data Portability: Export user data to JSON file
  const handleExportUserData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      // Gather user's orders from Firestore
      let userOrders = [];
      try {
        const q = query(collection(db, 'orders'), where('user_id', '==', userId));
        const snap = await getDocs(q);
        userOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('Could not export full order history, exporting profile only:', err);
      }

      const exportPayload = {
        app: 'Delicious Biryani (Palava & Taloja)',
        exportDate: new Date().toISOString(),
        dpdpaComplianceNotice: 'Exported under the Digital Personal Data Protection Act, 2023 (DPDPA Section 11 - Right of Access to Information).',
        account: {
          uid: userId,
          email: user.email,
          fullName: userProfile?.fullName || user.displayName || '',
          phoneNumber: userProfile?.phone || user.phoneNumber || '',
          primarySocietyAddress: userProfile?.address || '',
          accountCreatedAt: user.metadata?.creationTime || 'Unknown',
          lastLoginAt: user.metadata?.lastSignInTime || 'Unknown'
        },
        savedAddresses: addresses.map(a => ({
          label: a.label,
          addressLine: a.address_line,
          isServiceable: a.is_serviceable,
          coordinates: { lat: a.lat, lng: a.lng }
        })),
        orderHistoryCount: userOrders.length,
        orders: userOrders.map(o => ({
          orderId: o.id,
          totalAmount: o.total_amount || o.total,
          status: o.status,
          createdAt: o.created_at || o.createdAt,
          items: o.items || []
        }))
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `delicious-biryani-data-${userId.slice(0, 8)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast({
        type: 'success',
        title: 'Data Exported',
        message: 'Your personal data archive (.json) has been downloaded.'
      });
    } catch (err) {
      console.error('Data export error:', err);
      showToast({ type: 'error', title: 'Export Failed', message: 'Unable to package data archive.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (window.confirm('Remove this saved address from your profile?')) {
      await deleteAddress(addrId);
      showToast({ type: 'success', title: 'Address Removed', message: 'The address has been deleted.' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-[80vh] px-6 flex flex-col items-center justify-center text-center font-sans">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-[#ec6d13] mb-6 shadow-sm border border-amber-100">
          <User size={36} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Member Portal</h2>
        <p className="text-slate-500 mb-8 font-medium max-w-sm">Sign in to view your live orders, saved addresses, and loyalty rewards.</p>
        <button 
          onClick={() => navigate('/auth', { state: { from: { pathname: '/profile' } } })}
          className="bg-primary text-slate-950 px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-primary/30 uppercase tracking-wider text-xs saffron-glow hover:scale-105 active:scale-95 transition-transform"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const displayName = userProfile?.fullName || user.displayName || 'Foodie Explorer';
  const displayPhone = userProfile?.phone || user.phoneNumber || 'Not provided';
  const displayAddress = userProfile?.address || 'Palava / Taloja';
  const avatarUrl = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'biryani'}`;

  const erasureWhatsAppUrl = `https://wa.me/919769793452?text=${encodeURIComponent(
    `Hello Delicious Biryani Admin,\n\nI am requesting permanent erasure of my account and personal data in accordance with Section 12 of India's Digital Personal Data Protection Act (DPDPA 2023).\n\nUser ID: ${userId}\nRegistered Email: ${user.email}\nPhone: ${displayPhone}\n\nPlease purge all records from your database.`
  )}`;

  return (
    <div className="min-h-screen pb-28 font-sans max-w-3xl mx-auto px-4 sm:px-6 pt-4">
      {/* Header Profile Card */}
      <div className="bg-white px-6 pt-8 pb-8 rounded-3xl shadow-sm border border-slate-200/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 border border-slate-200/80 rounded-2xl flex items-center justify-center text-slate-800 hover:border-primary transition-colors bg-white shadow-sm"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-[10px] font-black uppercase tracking-wider">
            <ShieldCheck size={12} />
            <span>DPDPA Verified Member</span>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=biryani';
              }}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-900 truncate">{displayName}</h1>
            <p className="text-slate-400 font-bold text-xs flex items-center gap-1.5 truncate mt-1">
              <Mail size={12} className="text-primary shrink-0" /> {user.email || 'Patron'}
            </p>
          </div>
        </div>
      </div>

      <div className="py-6 space-y-5">
        {/* Section 1: Personal Details & Edit Data */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Personal Information</h3>
              <p className="text-slate-400 text-xs font-medium mt-0.5">Your name and contact phone for kitchen deliveries</p>
            </div>
            <button 
              onClick={() => {
                setFormData({
                  fullName: displayName,
                  phone: userProfile?.phone || '',
                  address: userProfile?.address || ''
                });
                setIsEditing(!isEditing);
              }}
              className="text-primary text-[11px] font-black uppercase tracking-wider flex items-center gap-1 hover:underline"
            >
              {isEditing ? <><X size={12} /> Cancel</> : <><Edit2 size={12} /> Edit Details</>}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.form 
                key="edit-form"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSave} 
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary transition-colors"
                    placeholder="Your Full Name"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Mobile Number (For Gate Rider Access) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    maxLength={10}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary transition-colors"
                    placeholder="10-digit mobile number"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Needed for security gate passes in Lodha Palava & Crown Taloja.</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Primary Complex / Sector
                  </label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-primary transition-colors"
                    placeholder="e.g., Casa Bella, Lakeshore, Crown Taloja"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors saffron-glow"
                  >
                    <Check size={16} />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div 
                key="view-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-[#ec6d13] shrink-0 border border-amber-100">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</p>
                    <p className="font-black text-slate-900 text-sm">{displayName}</p>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-[#ec6d13] shrink-0 border border-amber-100">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Contact Phone</p>
                    <p className="font-black text-slate-900 text-sm">{displayPhone}</p>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 shrink-0 border border-slate-200/60">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Complex</p>
                    <p className="font-bold text-slate-700 text-sm truncate max-w-[240px] sm:max-w-md">{displayAddress}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Restaurant Owner Portal Banner (If user is authorized admin) */}
        {isAdminUser(user, userProfile) && (
          <div className="bg-gradient-to-r from-amber-500 via-[#ec6d13] to-orange-600 rounded-3xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                <ChefHat size={24} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black uppercase tracking-tight text-sm text-white">
                    Kitchen Owner Terminal
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white">
                    Admin Active
                  </span>
                </div>
                <p className="text-xs text-white/90 font-medium mt-0.5">
                  Manage live kitchen orders, modify menu dishes & prices, track analytics & create offers.
                </p>
              </div>
            </div>
            <Link
              to="/admin"
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-md active:scale-95 shrink-0"
            >
              <span>Open Admin Desk</span>
              <ChevronRight size={15} />
            </Link>
          </div>
        )}

        {/* Section 2: Saved Delivery Address Book (With Add & Delete) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Saved Delivery Addresses</h3>
              <p className="text-slate-400 text-xs font-medium mt-0.5">Manage your home, office, and guest delivery coordinates</p>
            </div>
            <button
              onClick={() => setIsAddAddressModalOpen(true)}
              className="bg-primary text-slate-950 px-3.5 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 transition-transform"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Add New</span>
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-2xl px-4">
              <MapPin size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No saved addresses yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Add your flat or tower in Palava or Taloja for one-click checkout.</p>
              <button
                onClick={() => setIsAddAddressModalOpen(true)}
                className="mt-3 text-primary text-xs font-black uppercase tracking-wider hover:underline"
              >
                + Add Address Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div 
                  key={addr.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3 transition-colors hover:border-slate-200"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                        {addr.label || 'Home'}
                      </span>
                      {addr.is_serviceable ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                          <Check size={10} /> Hot Dum Delivery Zone
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
                          Outside Polygon
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 leading-snug">{addr.address_line}</p>
                    {addr.lat && addr.lng && (
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                        GPS: {addr.lat.toFixed(4)}, {addr.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-colors shrink-0"
                    title="Delete address"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Security & Password Reset */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-[#ec6d13] border border-amber-100">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Security & Password</h3>
                <p className="text-slate-400 text-xs font-medium">Protect your account and live orders</p>
              </div>
            </div>
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm active:scale-95"
            >
              Reset Password
            </button>
          </div>
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
              Two-factor safety: Old Password & Email OTP available
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">256-bit Encrypted</span>
          </div>
        </div>

        {/* Section 4: Live Order Tracking & Receipts */}
        <button 
          onClick={() => navigate('/orders')} 
          className="w-full text-left bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-primary/40 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-[#ec6d13] group-hover:scale-110 transition-transform border border-amber-100">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Live Order Tracking & History</h3>
                <p className="text-slate-400 text-xs font-medium">
                  Track authentic handi preparations and view previous order receipts
                </p>
              </div>
            </div>
            <span className="text-primary text-xs font-black uppercase tracking-wider group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>

        {/* Section 5: Data Privacy & Governance (DPDPA 2023) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">Data Privacy & Your Rights (DPDPA 2023)</h3>
              <p className="text-slate-400 text-xs font-medium">You maintain full sovereignty over your personal culinary data</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Download Data Button */}
            <button
              onClick={handleExportUserData}
              disabled={isExporting}
              className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-primary/50 text-left transition-all flex items-center justify-between gap-3 group active:scale-98"
            >
              <div>
                <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Download size={14} className="text-primary group-hover:scale-110 transition-transform" />
                  Download My Data
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Export all profile, order & address records (JSON)</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                {isExporting ? <RefreshCw size={12} className="animate-spin" /> : 'Export'}
              </span>
            </button>

            {/* Quick Policies Links */}
            <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex flex-col justify-center gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal Documentation</p>
              <div className="flex items-center gap-3 text-xs font-bold">
                <Link to="/privacy" className="text-primary hover:underline flex items-center gap-1">
                  Privacy <ExternalLink size={10} />
                </Link>
                <span className="text-slate-300">•</span>
                <Link to="/terms" className="text-primary hover:underline flex items-center gap-1">
                  Terms <ExternalLink size={10} />
                </Link>
                <span className="text-slate-300">•</span>
                <Link to="/cookies" className="text-primary hover:underline flex items-center gap-1">
                  Cookies <ExternalLink size={10} />
                </Link>
              </div>
            </div>
          </div>

          {/* Right to Erasure / Account Deletion Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mt-2">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-slate-400 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-800">Right to be Forgotten (Account Deletion)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Under Section 12 of India&apos;s DPDPA 2023, you may request permanent erasure of your account, phone number, and delivery coordinates from our servers at any time.
                </p>
                <a
                  href={erasureWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200/60 transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Request Account Erasure</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Sign Out */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleSignOut}
          className="w-full bg-rose-50 text-rose-600 p-4 sm:p-5 rounded-2xl font-black text-sm uppercase tracking-wider flex justify-between items-center border border-rose-100 transition-colors hover:bg-rose-100"
        >
          <span>Sign Out from Device</span>
          <LogOut size={18} />
        </motion.button>
      </div>

      {/* Two-Factor Safety Password Reset Modal */}
      <PasswordResetModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        initialEmail={user?.email || ''}
        isLoggedIn={true}
        onSuccess={() => {
          showToast({
            type: 'success',
            title: 'Password Updated',
            message: 'Your account credentials have been securely updated.'
          });
        }}
      />

      {/* Interactive Map & Geofenced Add Address Modal (Code-split) */}
      <Suspense fallback={null}>
        {isAddAddressModalOpen && (
          <AddAddressModal
            isOpen={isAddAddressModalOpen}
            onClose={() => setIsAddAddressModalOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Profile;
