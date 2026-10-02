import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Safe localStorage wrapper to prevent crashes on QuotaExceededError or disabled storage
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      console.warn(`[Storage] Failed to read ${key} from localStorage:`, err);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[Storage] Failed to write ${key} to localStorage:`, err);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[Storage] Failed to remove ${key} from localStorage:`, err);
    }
  }
};

const createStore = typeof create === 'function' ? create : (create?.default || create);

const useCartStore = createStore(
  persist(
    (set, get) => ({
      cart: [],
      isCartOpen: false,
      toastMessage: null,
      lastOrderTime: safeLocalStorage.getItem('last_order_time') || null,
      lastOrderId: safeLocalStorage.getItem('last_order_id') || null,

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      /**
       * Universal toast notification:
       * Accepts either:
       * 1) showToast("Dish Name", 320) -> Cart added toast
       * 2) showToast({ type: 'success' | 'error' | 'warning' | 'info', title: 'Title', message: 'Detail message', duration: 3500 })
       */
      showToast: (titleOrOptions, priceOrType = null) => {
        let toastObj;
        if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
          toastObj = {
            id: Date.now(),
            type: titleOrOptions.type || 'info',
            title: titleOrOptions.title || '',
            message: titleOrOptions.message || '',
            price: titleOrOptions.price || null,
            duration: titleOrOptions.duration || 3200,
          };
        } else {
          toastObj = {
            id: Date.now(),
            type: typeof priceOrType === 'string' ? priceOrType : 'cart',
            title: String(titleOrOptions || 'Item updated'),
            price: typeof priceOrType === 'number' ? priceOrType : null,
            message: '',
            duration: 3000,
          };
        }
        set({ toastMessage: toastObj });
      },
      clearToast: () => set({ toastMessage: null }),

      persistOrderTime: (orderId = null) => {
        const now = new Date().toISOString();
        safeLocalStorage.setItem('last_order_time', now);
        if (orderId) safeLocalStorage.setItem('last_order_id', String(orderId));
        set({ lastOrderTime: now, lastOrderId: orderId ? String(orderId) : get().lastOrderId });
      },

      addToCart: (product, size = 'Standard', quantity = 1) => set((state) => {
        if (!product || (!product.id && !product.name)) {
          console.warn('[Cart] Cannot add invalid product to cart:', product);
          return state;
        }

        const qtyToAdd = Math.min(99, Math.max(1, Number(quantity) || 1));
        const itemSize = size || 'Standard';
        const title = product.title || product.name || 'Biryani Special';
        const price = Math.max(0, Number(product.price) || 0);
        const toastMessage = { 
          id: Date.now(), 
          type: 'cart', 
          title, 
          price, 
          message: `${itemSize} added to cart`, 
          duration: 3000 
        };

        const existingIndex = state.cart.findIndex(
          (item) => item.id === product.id && (item.size || 'Standard') === itemSize
        );

        if (existingIndex > -1) {
          const updated = [...state.cart];
          const newTotalQty = Math.min(99, updated[existingIndex].quantity + qtyToAdd);
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newTotalQty,
            price: price || updated[existingIndex].price || 0,
            image: product.image || product.image_url || updated[existingIndex].image,
            title: title || updated[existingIndex].title,
          };
          return { cart: updated, toastMessage };
        }

        const newItem = {
          id: product.id,
          title: title,
          name: title,
          price: price,
          image: product.image || product.image_url || '/assets/main_course/chicken_curry.png',
          category: product.category || 'Special',
          size: itemSize,
          quantity: qtyToAdd,
        };

        return { cart: [...state.cart, newItem], toastMessage };
      }),

      updateQuantity: (productId, size, quantity) => set((state) => {
        const itemSize = size || 'Standard';
        const newQty = Math.min(99, Number(quantity));

        if (isNaN(newQty) || newQty <= 0) {
          return {
            cart: state.cart.filter(
              (item) => !(item.id === productId && (item.size || 'Standard') === itemSize)
            ),
          };
        }

        return {
          cart: state.cart.map((item) =>
            item.id === productId && (item.size || 'Standard') === itemSize
              ? { ...item, quantity: newQty }
              : item
          ),
        };
      }),

      removeFromCart: (productId, size) => set((state) => {
        const itemSize = size || 'Standard';
        return {
          cart: state.cart.filter(
            (item) => !(item.id === productId && (item.size || 'Standard') === itemSize)
          ),
        };
      }),

      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'biryani-cart-storage',
      storage: createJSONStorage(() => safeLocalStorage),
    }
  )
);

export default useCartStore;

