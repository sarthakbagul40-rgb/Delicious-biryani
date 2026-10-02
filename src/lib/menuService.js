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
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { cacheProducts, getInitialProducts } from './networkUtils';

export const CATEGORIES = ['Thali', 'Main Course', 'Starter', 'Add-ons'];

/**
 * Fetch all products from Firestore or initialize from FALLBACK_PRODUCTS
 */
export async function getLiveProducts() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (!snap.empty) {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const clean = list.filter(item => item.category !== 'ARCHIVED');
      if (clean.length > 0) {
        cacheProducts(clean);
        return clean;
      }
    }
  } catch (err) {
    console.warn('Live products fetch failed, using cache/fallback:', err);
  }

  const initial = getInitialProducts();
  return initial && initial.length > 0 ? initial : FALLBACK_PRODUCTS;
}

/**
 * Seed Firestore with FALLBACK_PRODUCTS if collection is empty
 */
export async function seedProductsIfEmpty() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (snap.empty) {
      console.log('Seeding initial products to Firestore...');
      for (const item of FALLBACK_PRODUCTS) {
        await setDoc(doc(db, 'products', item.id), item);
      }
      return true;
    }
  } catch (err) {
    console.warn('Product seeding skipped:', err);
  }
  return false;
}

/**
 * Add a new product
 */
export async function createProduct(productData) {
  const cleanId = productData.id || `dish_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const payload = {
    ...productData,
    id: cleanId,
    name: productData.name.trim(),
    category: productData.category || 'Main Course',
    price: Number(productData.price) || 0,
    portion_size: productData.portion_size || 'Full',
    description: (productData.description || '').trim(),
    image_url: productData.image_url || '/assets/thalis/chicken_biryani_thali.jpg',
    is_in_stock: productData.is_in_stock !== false,
    is_special: Boolean(productData.is_special),
    spice_level: productData.spice_level || 'Medium Spiced',
    updated_at: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'products', cleanId), payload);
  } catch (err) {
    console.warn('Firestore create product failed:', err);
  }

  // Update local cache
  const cached = getInitialProducts();
  const filtered = cached.filter(p => p.id !== cleanId);
  filtered.unshift(payload);
  cacheProducts(filtered);

  // Notify active listeners
  window.dispatchEvent(new CustomEvent('products_updated', { detail: filtered }));
  return payload;
}

/**
 * Update an existing product (title, description, price, photo, category, etc.)
 */
export async function modifyProduct(id, updates) {
  const cleanUpdates = {
    ...updates,
    updated_at: new Date().toISOString()
  };
  if (cleanUpdates.price !== undefined) cleanUpdates.price = Number(cleanUpdates.price);

  try {
    await updateDoc(doc(db, 'products', id), cleanUpdates);
  } catch (err) {
    // If doc didn't exist in Firestore, set it
    try {
      await setDoc(doc(db, 'products', id), cleanUpdates, { merge: true });
    } catch (inner) {
      console.warn('Firestore update product fallback:', inner);
    }
  }

  // Update local cache
  const cached = getInitialProducts();
  const updated = cached.map(p => p.id === id ? { ...p, ...cleanUpdates } : p);
  cacheProducts(updated);

  window.dispatchEvent(new CustomEvent('products_updated', { detail: updated }));
  return cleanUpdates;
}

/**
 * Toggle stock status (In-Stock / Sold-Out)
 */
export async function toggleStock(id, isInStock) {
  return modifyProduct(id, { is_in_stock: isInStock });
}

/**
 * Delete a product
 */
export async function removeProduct(id) {
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (err) {
    // Alternatively archive
    try {
      await updateDoc(doc(db, 'products', id), { category: 'ARCHIVED', is_in_stock: false });
    } catch (inner) {
      console.warn('Firestore delete failed:', inner);
    }
  }

  // Update local cache
  const cached = getInitialProducts();
  const filtered = cached.filter(p => p.id !== id);
  cacheProducts(filtered);

  window.dispatchEvent(new CustomEvent('products_updated', { detail: filtered }));
}
