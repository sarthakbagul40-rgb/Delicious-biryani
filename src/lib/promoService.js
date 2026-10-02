import { 
  db, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot 
} from './firebase';

const COUPONS_STORAGE_KEY = 'db_active_coupons_v1';
const ANNOUNCEMENT_STORAGE_KEY = 'db_site_announcement_v1';

export const DEFAULT_COUPONS = [
  {
    id: 'biryani50',
    code: 'BIRYANI50',
    discount_type: 'flat', // 'flat' | 'percentage'
    discount_value: 50,
    min_order: 399,
    max_discount: 50,
    description: 'Flat ₹50 OFF on grand Biryani feasts above ₹399',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'firstfeast',
    code: 'FIRSTFEAST',
    discount_type: 'percentage',
    discount_value: 15,
    min_order: 299,
    max_discount: 100,
    description: '15% OFF (up to ₹100) for Palava & Taloja food lovers',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'palava100',
    code: 'PALAVA100',
    discount_type: 'flat',
    discount_value: 100,
    min_order: 799,
    max_discount: 100,
    description: 'Weekend Dum celebration: Flat ₹100 OFF on feasts above ₹799',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

export const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  badge: '🔥 SPECIAL OFFER',
  text: 'Use code BIRYANI50 for flat ₹50 OFF on orders above ₹399! Authentic Dum Delivery in 30 mins.',
  linkText: 'Apply at Checkout'
};

/**
 * Fetch all coupons from Firestore or fallback to cache / defaults
 */
export async function fetchCoupons() {
  try {
    const snap = await getDocs(collection(db, 'coupons'));
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Coupons fetch fallback:', err);
  }

  try {
    const cached = localStorage.getItem(COUPONS_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}

  return DEFAULT_COUPONS;
}

/**
 * Validate and calculate coupon discount
 */
export function calculateCouponDiscount(code, subtotal, availableCoupons = DEFAULT_COUPONS) {
  if (!code || !code.trim()) {
    return { success: false, message: 'Please enter a coupon code.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = availableCoupons.find(
    c => c.code.toUpperCase() === cleanCode && c.is_active !== false
  );

  if (!coupon) {
    return { success: false, message: `Coupon "${cleanCode}" is invalid or expired.` };
  }

  const minOrder = Number(coupon.min_order || 0);
  if (subtotal < minOrder) {
    return { 
      success: false, 
      message: `Code "${cleanCode}" requires a minimum order of ₹${minOrder}. Add ₹${minOrder - subtotal} more.` 
    };
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((subtotal * Number(coupon.discount_value)) / 100);
    if (coupon.max_discount && discount > Number(coupon.max_discount)) {
      discount = Number(coupon.max_discount);
    }
  } else {
    discount = Number(coupon.discount_value);
  }

  discount = Math.min(discount, subtotal);
  const finalTotal = Math.max(0, subtotal - discount);

  return {
    success: true,
    code: cleanCode,
    discount,
    finalTotal,
    coupon,
    message: `Coupon "${cleanCode}" applied! You saved ₹${discount}.`
  };
}

/**
 * Save / Create Coupon
 */
export async function saveCoupon(couponData) {
  const id = couponData.id || couponData.code.toLowerCase().replace(/[^a-z0-9]/g, '');
  const payload = {
    ...couponData,
    id,
    code: couponData.code.trim().toUpperCase(),
    discount_value: Number(couponData.discount_value),
    min_order: Number(couponData.min_order || 0),
    max_discount: Number(couponData.max_discount || couponData.discount_value),
    is_active: couponData.is_active !== false,
    updated_at: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'coupons', id), payload, { merge: true });
  } catch (err) {
    console.warn('Firestore coupon write failed, saving locally:', err);
  }

  // Update local storage
  try {
    const cached = JSON.parse(localStorage.getItem(COUPONS_STORAGE_KEY) || '[]');
    const filtered = cached.filter(c => c.id !== id);
    filtered.unshift(payload);
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (_) {}

  return payload;
}

/**
 * Toggle Coupon Active Status
 */
export async function toggleCouponStatus(id, isActive) {
  try {
    await updateDoc(doc(db, 'coupons', id), { is_active: isActive });
  } catch (err) {
    console.warn('Firestore toggle coupon failed, updating locally:', err);
  }

  try {
    const cached = JSON.parse(localStorage.getItem(COUPONS_STORAGE_KEY) || '[]');
    const updated = cached.map(c => c.id === id ? { ...c, is_active: isActive } : c);
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}
}

/**
 * Delete a Coupon
 */
export async function removeCoupon(id) {
  try {
    await deleteDoc(doc(db, 'coupons', id));
  } catch (err) {
    console.warn('Firestore remove coupon failed:', err);
  }

  try {
    const cached = JSON.parse(localStorage.getItem(COUPONS_STORAGE_KEY) || '[]');
    const updated = cached.filter(c => c.id !== id);
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (_) {}
}

/**
 * Site Announcement Banner
 */
export async function getSiteAnnouncement() {
  try {
    const cached = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}
  return DEFAULT_ANNOUNCEMENT;
}

export async function saveSiteAnnouncement(announcement) {
  try {
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(announcement));
    await setDoc(doc(db, 'settings', 'announcement'), announcement, { merge: true });
  } catch (_) {}
  // Dispatch custom event for real-time banner update across tabs/components
  window.dispatchEvent(new CustomEvent('site_announcement_updated', { detail: announcement }));
}
