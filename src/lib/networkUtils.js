import { useState, useEffect } from 'react';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';

const CACHE_KEY = 'db_cached_products_v1';

/**
 * Race a promise against a timeout (default 2500ms for slow 3G/4G).
 */
export async function withTimeout(promise, ms = 2500) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Network timeout after ${ms}ms`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

/**
 * Get cached products from localStorage or default to FALLBACK_PRODUCTS.
 */
export function getInitialProducts() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore parse error
  }
  return FALLBACK_PRODUCTS;
}

/**
 * Save products to localStorage cache for instant offline & slow 3G startup.
 */
export function cacheProducts(products) {
  try {
    if (Array.isArray(products) && products.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(products));
    }
  } catch {
    // quota exceeded or disabled
  }
}

/**
 * Hook to detect online status and slow connection.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      // Check Network Information API if available
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        const slow = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g' || conn.saveData;
        setIsSlow(Boolean(slow));
      }
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      conn.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (conn) {
        conn.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return { isOnline, isSlow };
}
