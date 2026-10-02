import { create } from 'zustand';
import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from '../lib/firebase';
import { isPointInServiceZone, ZONE_CENTER } from '../lib/deliveryZone';

const useAddressStore = create((set, get) => ({
  addresses: [],
  isLoading: false,
  error: null,

  fetchAddresses: async (userId) => {
    if (!userId) return;
    set({ isLoading: true });
    try {
      const q = query(
        collection(db, 'addresses'), 
        where('user_id', '==', userId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      set({ addresses: list, isLoading: false });
    } catch (err) {
      console.warn('Firestore fetchAddresses error (using cached/local):', err);
      set({ error: err.message, isLoading: false });
    }
  },

  addAddress: async (userId, addressData) => {
    const currentAddresses = get().addresses;
    if (currentAddresses.length >= 5) {
      return { success: false, error: "Address limit reached (Max 5). Please delete an old address." };
    }

    set({ isLoading: true, error: null });
    
    try {
      // 1. Geocode the address using Nominatim
      let lat = addressData.lat;
      let lng = addressData.lng;

      if (!lat) {
        try {
          const queryStr = `${addressData.address_line}, Palava Taloja, Maharashtra 421204`;
          const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`;
          
          const geoRes = await fetch(geoUrl, {
            headers: { 'User-Agent': 'BiryaniApp/1.0 (contact@biryaniapp.local)' }
          });
          const geoData = await geoRes.json();
          if (geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
          }
        } catch (geoErr) {
          console.warn('Geocoding fallback:', geoErr);
        }
      }

      // Default coordinates for Palava if geocoding fails
      if (!lat) {
        lat = ZONE_CENTER.lat;
        lng = ZONE_CENTER.lng;
      }

      // 2. Check Serviceability using Sub-Meter Polygon Geofencing
      const isServiceable = isPointInServiceZone(lat, lng);

      const newAddrPayload = {
        user_id: userId,
        label: addressData.label || 'Home',
        address_line: addressData.address_line,
        lat,
        lng,
        is_serviceable: isServiceable,
        createdAt: serverTimestamp()
      };

      try {
        const docRef = await addDoc(collection(db, 'addresses'), newAddrPayload);
        const savedAddr = { id: docRef.id, ...newAddrPayload };
        set(state => ({ 
          addresses: [savedAddr, ...state.addresses], 
          isLoading: false 
        }));
        return { success: true, isServiceable };
      } catch (dbErr) {
        console.warn('Could not save address to Firestore, saving locally:', dbErr);
        const localAddr = { id: 'local-' + Date.now(), ...newAddrPayload };
        set(state => ({
          addresses: [localAddr, ...state.addresses],
          isLoading: false
        }));
        return { success: true, isServiceable };
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },

  deleteAddress: async (addressId) => {
    try {
      if (!addressId.startsWith('local-')) {
        await deleteDoc(doc(db, 'addresses', addressId));
      }
      set(state => ({
        addresses: state.addresses.filter(a => a.id !== addressId)
      }));
    } catch (err) {
      console.warn('Could not delete address from Firestore:', err);
      set(state => ({
        addresses: state.addresses.filter(a => a.id !== addressId)
      }));
    }
  }
}));

export default useAddressStore;
