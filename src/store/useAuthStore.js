import { create } from 'zustand';
import { 
  auth, 
  db, 
  googleProvider,
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink, 
  firebaseSignOut, 
  onAuthStateChanged,
  updateProfile,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from '../lib/firebase';

const createStore = typeof create === 'function' ? create : (create?.default || create);

const useAuthStore = createStore((set, get) => ({
  user: null,
  userProfile: null,
  isLoading: true,
  error: null,

  // Fetch or create user profile in Firestore
  fetchUserProfile: async (firebaseUser, additionalData = {}) => {
    if (!firebaseUser) {
      set({ userProfile: null });
      return null;
    }

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        set({ userProfile: data });
        return data;
      } else {
        const newProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          fullName: additionalData.fullName || firebaseUser.displayName || 'Foodie Explorer',
          phone: additionalData.phone || firebaseUser.phoneNumber || '',
          address: additionalData.address || '',
          createdAt: serverTimestamp(),
          role: 'customer'
        };
        await setDoc(userRef, newProfile);
        set({ userProfile: newProfile });
        return newProfile;
      }
    } catch (err) {
      console.warn('Could not fetch/create Firestore user profile (may be offline):', err);
      const fallback = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        fullName: additionalData.fullName || firebaseUser.displayName || 'Foodie Explorer',
        phone: additionalData.phone || '',
      };
      set({ userProfile: fallback });
      return fallback;
    }
  },

  // Initialize auth listener
  initAuth: () => {
    set({ isLoading: true });
    
    // Check if returning from a magic link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem('emailForSignIn');
            await get().fetchUserProfile(result.user);
          })
          .catch((err) => {
            console.error('Magic link sign-in error:', err);
          });
      }
    }

    // Check if returning from a Google redirect
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await get().fetchUserProfile(result.user);
          set({ user: result.user, isLoading: false });
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in error:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser, isLoading: false });
        await get().fetchUserProfile(firebaseUser);
      } else {
        set({ user: null, userProfile: null, isLoading: false });
      }
    });

    return unsubscribe;
  },

  // Email & Password Sign In
  signInWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await get().fetchUserProfile(userCredential.user);
      set({ user: userCredential.user, isLoading: false });
      return userCredential.user;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  // Email & Password Sign Up with Phone & Full Name
  signUpWithEmail: async (email, password, fullName, phone) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Update Auth display name
      if (fullName) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }

      // Save complete profile to Firestore
      await get().fetchUserProfile(userCredential.user, { fullName, phone });
      
      // Link previous guest orders if phone matches
      if (phone) {
        get().claimGuestOrders(phone, email);
      }

      set({ user: userCredential.user, isLoading: false });
      return userCredential.user;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  // 1-Click Google OAuth (Tries popup, falls back to redirect for Brave/Shields)
  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await get().fetchUserProfile(result.user);
      set({ user: result.user, isLoading: false });
      return result.user;
    } catch (popupErr) {
      console.warn('Popup Google Sign-In failed, attempting redirect fallback:', popupErr);
      if (
        popupErr.code === 'auth/internal-error' || 
        popupErr.code === 'auth/popup-blocked' ||
        popupErr.code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          set({ isLoading: false, error: redirectErr.message });
          throw redirectErr;
        }
      }
      set({ isLoading: false, error: popupErr.message });
      throw popupErr;
    }
  },

  // Passwordless Email Link (Magic Link)
  sendMagicLink: async (email) => {
    const actionCodeSettings = {
      url: window.location.origin + '/auth',
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email.trim());
  },

  // Password Reset Email
  sendPasswordReset: async (email) => {
    await sendPasswordResetEmail(auth, email.trim());
  },

  // Instant Demo Login (for fast development & testing without credentials)
  demoLogin: async (fullName = 'Royal Biryani Patron', phone = '9876543210') => {
    const mockUser = {
      uid: 'demo-patron-' + Date.now().toString(36),
      email: 'patron@deliciousbiryani.com',
      displayName: fullName,
      phoneNumber: '+91' + phone,
      isDemo: true
    };
    const mockProfile = {
      uid: mockUser.uid,
      email: mockUser.email,
      fullName: fullName,
      phone: phone,
      address: 'Casa Bella Gold, Tower 4, Palava City',
      role: 'customer'
    };
    set({ user: mockUser, userProfile: mockProfile, isLoading: false, error: null });
    return mockUser;
  },

  // Update Profile details
  updateUserProfile: async (updates) => {
    const currentUser = get().user;
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      set((state) => ({
        userProfile: { ...state.userProfile, ...updates }
      }));
    } catch (err) {
      console.warn('Failed to update Firestore profile:', err);
      set((state) => ({
        userProfile: { ...state.userProfile, ...updates }
      }));
    }
  },

  // Claim previous guest orders
  claimGuestOrders: async (phone, email) => {
    const currentUser = get().user;
    if (!currentUser || !phone) return;

    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customer_phone', '==', phone), where('user_id', '==', 'guest'));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (orderDoc) => {
        await updateDoc(doc(db, 'orders', orderDoc.id), {
          user_id: currentUser.uid
        });
      });
    } catch (err) {
      console.warn('Could not claim guest orders:', err);
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      set({ user: null, userProfile: null, isLoading: false });
    }
  }
}));

export default useAuthStore;
