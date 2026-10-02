import { 
  auth, 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
} from './firebase';
import { 
  assertRateLimit, 
  recordRateLimitAttempt, 
  checkRateLimit 
} from './rateLimiter';

/**
 * Check if a user's data is already present in the database.
 * @param {string} email - Email address to check
 * @returns {Promise<{exists: boolean, user: object|null, reason?: string}>}
 */
export const checkUserExistsInDatabase = async (email) => {
  if (!email || !email.trim()) {
    return { exists: false, user: null, reason: 'Please enter a valid email address.' };
  }
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Query Firestore 'users' collection
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docData = snap.docs[0].data();
      return { 
        exists: true, 
        user: { id: snap.docs[0].id, ...docData } 
      };
    }

    // Check with original casing if different
    if (email.trim() !== cleanEmail) {
      const qRaw = query(usersRef, where('email', '==', email.trim()));
      const snapRaw = await getDocs(qRaw);
      if (!snapRaw.empty) {
        const docData = snapRaw.docs[0].data();
        return { 
          exists: true, 
          user: { id: snapRaw.docs[0].id, ...docData } 
        };
      }
    }

    // 2. Check if currently authenticated Firebase user matches
    if (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail) {
      return { 
        exists: true, 
        user: { 
          id: auth.currentUser.uid, 
          email: auth.currentUser.email,
          fullName: auth.currentUser.displayName || 'Valued Patron'
        } 
      };
    }

    return { 
      exists: false, 
      user: null, 
      reason: 'No account registered with this email address. Please check for typos or sign up.' 
    };
  } catch (err) {
    console.warn('Firestore existence check error, checking auth context:', err);
    // Fallback: If current user matches
    if (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail) {
      return { 
        exists: true, 
        user: { 
          id: auth.currentUser.uid, 
          email: auth.currentUser.email 
        } 
      };
    }
    // Return friendly error
    return { 
      exists: false, 
      user: null, 
      reason: 'Could not connect to database to verify email. Please check your internet.' 
    };
  }
};

/**
 * Generate and dispatch a 6-digit OTP to the user's email.
 * Also verifies database existence before sending.
 * @param {string} email
 * @returns {Promise<{success: boolean, email: string, expiresAt: number, simulatedOtp: string}>}
 */
export const sendPasswordResetOTP = async (email) => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Rate Limiting: Prevent OTP spamming & inbox flooding
  assertRateLimit('PASSWORD_RESET_REQUEST', cleanEmail);

  // 2. Ensure user exists in database
  const check = await checkUserExistsInDatabase(cleanEmail);
  if (!check.exists) {
    throw new Error(check.reason || 'No account registered with this email address.');
  }

  // 3. Register request attempt
  recordRateLimitAttempt('PASSWORD_RESET_REQUEST', cleanEmail, false);

  // 4. Generate & Dispatch via Backend Middleware API (/api/auth/send-otp)
  let middlewareResponse = null;
  let otpCode = null;
  let expiresAt = Date.now() + 10 * 60 * 1000;

  try {
    const apiRes = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });
    
    if (apiRes.ok) {
      middlewareResponse = await apiRes.json();
      expiresAt = middlewareResponse.expiresAt || expiresAt;
      console.log('✅ OTP dispatched via Backend Middleware API:', middlewareResponse);
    } else {
      const errData = await apiRes.json().catch(() => ({}));
      if (errData.error) throw new Error(errData.error);
    }
  } catch (apiErr) {
    console.warn('Backend middleware dispatch notice, utilizing fallback:', apiErr.message);
    // If rate limited by server, propagate the error
    if (apiErr.message.includes('Too many')) {
      throw apiErr;
    }
  }

  // Fallback: If middleware was unavailable, generate client OTP & persist
  if (!middlewareResponse) {
    otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const resetRef = doc(collection(db, 'password_resets'));
      await setDoc(resetRef, {
        id: resetRef.id,
        email: cleanEmail,
        otp: otpCode,
        expiresAt,
        verified: false,
        consumed: false,
        createdAt: serverTimestamp()
      });
    } catch (_) {}

    try {
      localStorage.setItem(`pwd_reset_${cleanEmail}`, JSON.stringify({
        email: cleanEmail,
        otp: otpCode,
        expiresAt,
        verified: false
      }));
    } catch (_) {}
  }

  // Secondary Backup: Also dispatch native Firebase Password Reset email
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (fbErr) {
    console.warn('Firebase sendPasswordResetEmail notice:', fbErr);
  }

  return {
    success: true,
    email: cleanEmail,
    expiresAt
  };
};

/**
 * Verify the 6-digit OTP code entered by the user.
 * @param {string} email
 * @param {string} enteredOtp
 * @returns {Promise<{verified: boolean, email: string}>}
 */
export const verifyPasswordResetOTP = async (email, enteredOtp) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = (enteredOtp || '').trim();

  // Rate Limiting: Prevent 6-digit OTP brute-force attacks
  assertRateLimit('OTP_VERIFY', cleanEmail);

  if (!cleanOtp || cleanOtp.length !== 6) {
    throw new Error('Please enter the complete 6-digit OTP code.');
  }

  // 1. Primary: Verify through Backend Middleware API
  let serverVerified = false;
  try {
    const apiRes = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp })
    });
    
    if (apiRes.ok) {
      serverVerified = true;
      recordRateLimitAttempt('OTP_VERIFY', cleanEmail, true);
    } else {
      const errData = await apiRes.json().catch(() => ({}));
      if (errData.error) {
        recordRateLimitAttempt('OTP_VERIFY', cleanEmail, false);
        throw new Error(errData.error);
      }
    }
  } catch (apiErr) {
    if (apiErr.message.includes('Invalid') || apiErr.message.includes('expired') || apiErr.message.includes('Too many')) {
      throw apiErr;
    }
    console.warn('Middleware verify unavailable, falling back to local/Firestore check:', apiErr.message);
  }

  if (serverVerified) {
    // Also mark Firestore record if present
    try {
      const q = query(collection(db, 'password_resets'), where('email', '==', cleanEmail), where('consumed', '==', false));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'password_resets', snap.docs[0].id), { verified: true, verifiedAt: serverTimestamp() });
      }
    } catch (_) {}
    return { verified: true, email: cleanEmail };
  }

  // 2. Secondary Fallback: Check localStorage & Firestore
  let localData = null;
  try {
    const raw = localStorage.getItem(`pwd_reset_${cleanEmail}`);
    if (raw) localData = JSON.parse(raw);
  } catch (_) {}

  let firestoreMatch = null;
  try {
    const q = query(
      collection(db, 'password_resets'),
      where('email', '==', cleanEmail),
      where('consumed', '==', false)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const records = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.expiresAt || 0) - (a.expiresAt || 0));
      firestoreMatch = records[0];
    }
  } catch (err) {
    console.warn('Firestore lookup warning:', err);
  }

  const expectedOtp = firestoreMatch?.otp || localData?.otp;
  const expiresAt = firestoreMatch?.expiresAt || localData?.expiresAt;

  if (!expectedOtp) {
    throw new Error('No active verification code found for this email. Please request a new code.');
  }

  if (Date.now() > expiresAt) {
    throw new Error('This verification code has expired. Please request a new one.');
  }

  if (cleanOtp !== expectedOtp) {
    recordRateLimitAttempt('OTP_VERIFY', cleanEmail, false);
    const check = checkRateLimit('OTP_VERIFY', cleanEmail);
    if (!check.allowed) {
      const err = new Error(check.error);
      err.code = 'RATE_LIMIT_EXCEEDED';
      throw err;
    }
    throw new Error(`Incorrect 6-digit OTP code. (${check.remainingAttempts} attempt${check.remainingAttempts === 1 ? '' : 's'} remaining before lockout)`);
  }

  recordRateLimitAttempt('OTP_VERIFY', cleanEmail, true);

  // Mark verified in Firestore
  if (firestoreMatch?.id) {
    try {
      await updateDoc(doc(db, 'password_resets', firestoreMatch.id), {
        verified: true,
        verifiedAt: serverTimestamp()
      });
    } catch (_) {}
  }

  // Mark verified in localStorage
  if (localData) {
    localData.verified = true;
    try {
      localStorage.setItem(`pwd_reset_${cleanEmail}`, JSON.stringify(localData));
    } catch (_) {}
  }

  return {
    verified: true,
    email: cleanEmail
  };
};

/**
 * Reset password after OTP verification.
 * @param {string} email
 * @param {string} newPassword
 * @returns {Promise<{success: boolean}>}
 */
export const completePasswordResetWithOTP = async (email, newPassword) => {
  const cleanEmail = email.trim().toLowerCase();

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  // Check if OTP was verified
  let isVerified = false;
  try {
    const raw = localStorage.getItem(`pwd_reset_${cleanEmail}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.verified && Date.now() <= parsed.expiresAt + 15 * 60 * 1000) {
        isVerified = true;
      }
    }
  } catch (_) {}

  // 1. If user is currently authenticated in this browser session, update Firebase password directly
  if (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail) {
    await updatePassword(auth.currentUser, newPassword);
  } else {
    // 2. User is logged out: Dispatch to Backend Middleware API powered by Firebase Admin
    let otpCode = null;
    try {
      const raw = localStorage.getItem(`pwd_reset_${cleanEmail}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        otpCode = parsed.otp;
      }
    } catch (_) {}

    const apiRes = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: otpCode, newPassword })
    });

    const resData = await apiRes.json().catch(() => ({}));

    if (!apiRes.ok || !resData.success) {
      if (resData.code === 'NO_ADMIN_CREDENTIALS') {
        const adminErr = new Error('Firebase Admin serviceAccountKey.json is required on the server to update passwords for unauthenticated users directly. Please check your inbox for the official Firebase reset link, or contact administrator.');
        adminErr.code = 'NO_ADMIN_CREDENTIALS';
        throw adminErr;
      }
      throw new Error(resData.error || 'Failed to update password. Please check your connection.');
    }
  }

  // Clean up OTP state locally and on server middleware
  try {
    localStorage.removeItem(`pwd_reset_${cleanEmail}`);
    fetch('/api/auth/consume-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    }).catch(() => {});
  } catch (_) {}

  // Update Firestore user document
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(doc(db, 'users', snap.docs[0].id), {
        passwordLastChanged: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('Could not update Firestore passwordLastChanged:', err);
  }

  return { success: true };
};

/**
 * Change password using Old Password (Re-authentication for safety).
 * @param {string} email
 * @param {string} oldPassword
 * @param {string} newPassword
 * @returns {Promise<{success: boolean}>}
 */
export const changePasswordWithOldPassword = async (email, oldPassword, newPassword) => {
  if (!oldPassword) {
    throw new Error('Please enter your current password.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }
  if (oldPassword === newPassword) {
    throw new Error('New password must be different from your current password.');
  }

  const cleanEmail = (email || auth.currentUser?.email || '').trim().toLowerCase();

  // Rate Limiting: Prevent brute-forcing old passwords
  assertRateLimit('OLD_PASSWORD_CHANGE', cleanEmail);

  try {
    // If user is currently signed in
    if (auth.currentUser) {
      const userEmail = auth.currentUser.email || cleanEmail;
      const credential = EmailAuthProvider.credential(userEmail, oldPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
    } else {
      // If user is not currently signed in (e.g. from login forgot password screen)
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, oldPassword);
      await updatePassword(userCredential.user, newPassword);
    }

    // Success: clear failed attempts
    recordRateLimitAttempt('OLD_PASSWORD_CHANGE', cleanEmail, true);

    // Update Firestore user timestamp
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'users', snap.docs[0].id), {
          passwordLastChanged: serverTimestamp()
        });
      }
    } catch (_) {}

    return { success: true };
  } catch (err) {
    // Record failed attempt on incorrect password
    if (
      err.code === 'auth/wrong-password' || 
      err.code === 'auth/invalid-credential' || 
      err.code === 'auth/invalid-password'
    ) {
      recordRateLimitAttempt('OLD_PASSWORD_CHANGE', cleanEmail, false);
      const check = checkRateLimit('OLD_PASSWORD_CHANGE', cleanEmail);
      if (!check.allowed) {
        const rateErr = new Error(check.error);
        rateErr.code = 'RATE_LIMIT_EXCEEDED';
        throw rateErr;
      }
      throw new Error(`Incorrect current password. (${check.remainingAttempts} attempt${check.remainingAttempts === 1 ? '' : 's'} remaining before lockout)`);
    }
    if (err.code === 'auth/weak-password') {
      throw new Error('New password must be at least 6 characters long.');
    }
    if (err.code === 'auth/requires-recent-login') {
      throw new Error('For security reasons, please re-login or use the Email OTP option to reset your password.');
    }
    if (err.code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please wait a few moments or use the Email OTP option.');
    }
    throw err;
  }
};
